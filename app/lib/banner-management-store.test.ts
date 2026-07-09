import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getBannerManagement, POST as postBannerManagement } from "../api/banner-management/route.js";
import { GET as getBannerClick } from "../api/banner-management/click/route.js";
import { GET as getBannerImage } from "../api/banner-management/image/route.js";
import {
  assignBannerPlacement,
  type BannerManagementState,
  type BannerPlacementRow,
  createBannerCreative,
  createBannerPlacement,
  createBannerTrackingLink,
  getBannerManagementState,
  recordBannerClick,
  recordBannerImageRequest,
  resolveBannerPlacement,
} from "./banner-management-store.js";

let tempDir: string;

const MUTABLE_ENV_KEYS = [
  "MONETIZATION_BANNER_ADMIN_TOKEN",
  "MONETIZATION_BANNER_DB",
  "MONETIZATION_BANNER_LIBSQL_AUTH_TOKEN",
  "MONETIZATION_BANNER_LIBSQL_URL",
  "MONETIZATION_BANNER_SNAPSHOT",
  "NEXT_PUBLIC_BANNER_BASE_URL",
  "BANNER_PUBLIC_BASE_URL",
  "VERCEL",
] as const;

let previousEnv: Partial<Record<(typeof MUTABLE_ENV_KEYS)[number], string>>;

describe("banner-management-store", () => {
  beforeEach(() => {
    previousEnv = {};
    for (const key of MUTABLE_ENV_KEYS) {
      previousEnv[key] = process.env[key];
      delete process.env[key];
    }

    tempDir = mkdtempSync(join(tmpdir(), "banner-store-"));
    const tempDbPath = join(tempDir, "ad-manage.db");
    copyFileSync(join(process.cwd(), "data", "monetization", "ad-manage.db"), tempDbPath);
    process.env.MONETIZATION_BANNER_DB = tempDbPath;
    process.env.MONETIZATION_BANNER_SNAPSHOT = join(tempDir, "banner-management.json");
  });

  afterEach(() => {
    for (const key of MUTABLE_ENV_KEYS) {
      const value = previousEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    rmSync(tempDir, { force: true, recursive: true });
  });

  it("creates and assigns operational banner records in a writable SQLite DB", () => {
    const stamp = Date.now().toString().slice(-8);

    let state = createBannerTrackingLink({
      offerName: "Smoke offer",
      publicUrl: "https://example.com/smoke",
      slug: `smoke-${stamp}`,
    });
    const trackingLink = state.trackingLinks.find((link) => link.slug === `smoke-${stamp}`);

    state = createBannerCreative({
      height: 250,
      imageUrl: "https://placehold.co/300x250/png",
      name: `Smoke creative ${stamp}`,
      width: 300,
    });
    const creative = state.creatives.find((item) => item.name === `Smoke creative ${stamp}`);

    state = createBannerPlacement({
      name: `Smoke placement ${stamp}`,
      noAdPolicy: "house",
      siteKey: "temon",
      siteUrl: "https://temon.example.com",
      slotKey: `quiz-bottom-${stamp}`,
      type: "image_link",
    });
    const placement = state.placements.find((item) => item.name === `Smoke placement ${stamp}`);

    expect(trackingLink).toBeDefined();
    expect(creative).toBeDefined();
    expect(placement).toBeDefined();

    state = assignBannerPlacement({
      creativeId: creative?.id ?? "",
      placementId: placement?.id ?? "",
      trackingLinkId: trackingLink?.id ?? "",
    });

    const linkedPlacement = state.placements.find((item) => item.id === placement?.id);
    expect(linkedPlacement?.assignedCreativeId).toBe(creative?.id);
    expect(linkedPlacement?.assignedTrackingLinkId).toBe(trackingLink?.id);
    expect(linkedPlacement?.siteKey).toBe("temon");
    expect(linkedPlacement?.slotKey).toBe(`quiz-bottom-${stamp}`);

    const resolved = resolveBannerPlacement({ slot: `temon.quiz-bottom-${stamp}` });
    expect(resolved?.creative.id).toBe(creative?.id);
    expect(resolved?.trackingLink.id).toBe(trackingLink?.id);

    recordBannerImageRequest({
      assignmentId: resolved?.assignmentId,
      placementId: resolved?.placement.id ?? "",
      trackingLinkId: resolved?.trackingLink.id,
    });
    recordBannerClick({
      assignmentId: resolved?.assignmentId,
      placementId: resolved?.placement.id ?? "",
      trackingLinkId: resolved?.trackingLink.id,
    });

    const finalState = getBannerManagementState();
    expect(finalState.writable).toBe(true);
    expect(finalState.assignments.some((assignment) => assignment.placementId === placement?.id)).toBe(true);
    expect(finalState.assignments.find((assignment) => assignment.placementId === placement?.id)?.placementSiteKey).toBe("temon");
    expect(finalState.placements.find((item) => item.id === placement?.id)?.requests).toBe(1);
    expect(finalState.placements.find((item) => item.id === placement?.id)?.imageRequests).toBe(1);
    const siteSummary = finalState.siteSummaries.find((site) => site.siteKey === "temon");
    expect(siteSummary?.placements).toBeGreaterThanOrEqual(1);
    expect(siteSummary?.assignedPlacements).toBeGreaterThanOrEqual(1);
    expect(siteSummary?.requests).toBeGreaterThanOrEqual(1);
    expect(siteSummary?.clicks).toBeGreaterThanOrEqual(1);

    const snapshotPath = process.env.MONETIZATION_BANNER_SNAPSHOT ?? "";
    expect(existsSync(snapshotPath)).toBe(true);
    expect(readFileSync(snapshotPath, "utf8")).toContain(`Smoke placement ${stamp}`);
  });

  it("bucket-selects among multiple active assignments for A/B/C banners", () => {
    const stamp = Date.now().toString().slice(-8);

    let state = createBannerTrackingLink({
      offerName: "ABC offer",
      publicUrl: "https://example.com/abc",
      slug: `abc-${stamp}`,
    });
    const trackingLink = findRequired(state.trackingLinks, (link) => link.slug === `abc-${stamp}`);

    state = createBannerPlacement({
      name: `ABC placement ${stamp}`,
      siteKey: "temon",
      siteUrl: "https://temon.example.com",
      slotKey: `abc-${stamp}`,
      type: "image_link",
    });
    const placement = findRequired(state.placements, (item) => item.name === `ABC placement ${stamp}`);

    const creativeIds: string[] = [];
    for (const variant of ["a", "b", "c"] as const) {
      state = createBannerCreative({
        height: 90,
        imageUrl: `https://example.com/creative-${variant}.svg`,
        name: `ABC creative ${stamp} ${variant}`,
        width: 728,
      });
      const creative = findRequired(state.creatives, (item) => item.name === `ABC creative ${stamp} ${variant}`);
      creativeIds.push(creative.id);
    }

    state = assignBannerPlacement({
      creativeId: creativeIds[0],
      placementId: placement.id,
      trackingLinkId: trackingLink.id,
      weight: 1,
    });

    const db = new DatabaseSync(process.env.MONETIZATION_BANNER_DB ?? "");
    try {
      const now = new Date().toISOString();
      for (const [index, creativeId] of creativeIds.slice(1).entries()) {
        db.prepare(
          `INSERT INTO assignments
            (id, placement_id, creative_id, tracking_link_id, weight, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, 'active', ?, ?)`,
        ).run(`assignment_abc_${stamp}_${index}`, placement.id, creativeId, trackingLink.id, now, now);
      }
    } finally {
      db.close();
    }

    const servedCreativeIds = new Set<string>();
    for (let index = 0; index < 120; index += 1) {
      const resolved = resolveBannerPlacement({
        pageUrl: `https://temon.example.com/post-${index}`,
        slot: `temon.abc-${stamp}`,
      });
      if (resolved) servedCreativeIds.add(resolved.creative.id);
    }

    expect(servedCreativeIds.size).toBeGreaterThan(1);
    expect([...servedCreativeIds].every((creativeId) => creativeIds.includes(creativeId))).toBe(true);
    expect(state.assignments.some((assignment) => assignment.placementId === placement.id)).toBe(true);
  });

  it("keeps site summaries and resolution usable above 100 managed sites", () => {
    const stamp = Date.now().toString(36);
    const sitePrefix = `scale-${stamp}`;

    let state = createBannerTrackingLink({
      offerName: "Scale offer",
      publicUrl: "https://example.com/scale",
      slug: `scale-${stamp}`,
    });
    const trackingLink = findRequired(state.trackingLinks, (link) => link.slug === `scale-${stamp}`);

    state = createBannerCreative({
      height: 250,
      imageUrl: "https://placehold.co/300x250/png",
      name: `Scale creative ${stamp}`,
      width: 300,
    });
    const creative = findRequired(state.creatives, (item) => item.name === `Scale creative ${stamp}`);

    const placements: BannerPlacementRow[] = [];
    for (let index = 1; index <= 120; index += 1) {
      const siteKey = `${sitePrefix}-${String(index).padStart(3, "0")}`;
      state = createBannerPlacement({
        name: `Scale placement ${stamp} ${index}`,
        noAdPolicy: index % 10 === 0 ? "house" : "none",
        siteKey,
        siteUrl: `https://${siteKey}.example.com`,
        slotKey: "hero",
        type: "image_link",
      });
      const placement = findRequired(state.placements, (item) => item.siteKey === siteKey && item.slotKey === "hero");
      placements.push(placement);

      if (index % 10 !== 0) {
        state = assignBannerPlacement({
          creativeId: creative.id,
          placementId: placement.id,
          trackingLinkId: trackingLink.id,
          weight: 100 - (index % 5),
        });
      }
    }

    const assignedPlacement = findRequired(placements, (placement) => placement.siteKey === `${sitePrefix}-075`);
    const unassignedPlacement = findRequired(placements, (placement) => placement.siteKey === `${sitePrefix}-120`);

    const resolved = resolveBannerPlacement({ slot: `${assignedPlacement.siteKey}.hero` });
    expect(resolved?.placement.id).toBe(assignedPlacement.id);
    expect(resolved?.creative.id).toBe(creative.id);
    expect(resolved?.trackingLink.id).toBe(trackingLink.id);
    expect(resolveBannerPlacement({ slot: `${unassignedPlacement.siteKey}.hero` })).toBeNull();

    recordBannerImageRequest({
      assignmentId: resolved?.assignmentId,
      placementId: resolved?.placement.id ?? "",
      trackingLinkId: resolved?.trackingLink.id,
    });
    recordBannerClick({
      assignmentId: resolved?.assignmentId,
      placementId: resolved?.placement.id ?? "",
      trackingLinkId: resolved?.trackingLink.id,
    });

    const finalState = getBannerManagementState();
    const generatedSites = finalState.siteSummaries.filter((site) => site.siteKey.startsWith(sitePrefix));
    const generatedPlacements = finalState.placements.filter((placement) => placement.siteKey?.startsWith(sitePrefix));

    expect(generatedSites).toHaveLength(120);
    expect(generatedPlacements).toHaveLength(120);
    expect(generatedSites.reduce((total, site) => total + site.assignedPlacements, 0)).toBe(108);
    expect(generatedSites.reduce((total, site) => total + site.unassignedPlacements, 0)).toBe(12);

    const assignedSummary = findRequired(generatedSites, (site) => site.siteKey === assignedPlacement.siteKey);
    expect(assignedSummary.requests).toBeGreaterThanOrEqual(1);
    expect(assignedSummary.imageRequests).toBe(1);
    expect(assignedSummary.clicks).toBe(1);

    const unassignedSummary = findRequired(generatedSites, (site) => site.siteKey === unassignedPlacement.siteKey);
    expect(unassignedSummary.noAd).toBe(1);
  }, 15_000);

  it("serves banner management GET and rejects unknown write actions", async () => {
    const getResponse = await getBannerManagement();
    expect(getResponse.status).toBe(200);
    const state = (await getResponse.json()) as BannerManagementState;
    expect(state.writable).toBe(true);
    expect(Array.isArray(state.siteSummaries)).toBe(true);

    const unknownResponse = await postBannerManagement(jsonPost({ action: "definitelyUnknown" }));
    expect(unknownResponse.status).toBe(400);
    await expect(unknownResponse.json()).resolves.toMatchObject({
      error: "Unknown banner management action.",
    });
  });

  it("requires the configured admin token for write API actions", async () => {
    process.env.MONETIZATION_BANNER_ADMIN_TOKEN = "test-secret";

    const body = {
      action: "createTrackingLink",
      offerName: "Token-gated offer",
      publicUrl: "https://example.com/token-gated",
      slug: `token-${Date.now().toString(36)}`,
    };

    const blockedResponse = await postBannerManagement(jsonPost(body));
    expect(blockedResponse.status).toBe(401);

    const createdResponse = await postBannerManagement(
      jsonPost(body, {
        "x-banner-admin-token": "test-secret",
      }),
    );
    expect(createdResponse.status).toBe(201);
    const state = (await createdResponse.json()) as BannerManagementState;
    expect(state.trackingLinks.some((link) => link.slug === body.slug)).toBe(true);
  });

  it("requires an admin token for Vercel write actions even when no token is configured", async () => {
    process.env.VERCEL = "1";
    delete process.env.MONETIZATION_BANNER_ADMIN_TOKEN;

    const body = {
      action: "createTrackingLink",
      offerName: "Vercel no-token offer",
      publicUrl: "https://example.com/vercel-no-token",
      slug: `vercel-no-token-${Date.now().toString(36)}`,
    };

    const response = await postBannerManagement(jsonPost(body));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Banner admin token is required for write actions.",
    });
  });

  it("returns stable image and click route responses for missing and active slots", async () => {
    const stamp = Date.now().toString(36);
    const imageUrl = "https://placehold.co/728x90/png";
    const publicUrl = "https://example.com/click-through";

    let state = createBannerTrackingLink({
      offerName: "Route offer",
      publicUrl,
      slug: `route-${stamp}`,
    });
    const trackingLink = findRequired(state.trackingLinks, (link) => link.slug === `route-${stamp}`);

    state = createBannerCreative({
      height: 90,
      imageUrl,
      name: `Route creative ${stamp}`,
      width: 728,
    });
    const creative = findRequired(state.creatives, (item) => item.name === `Route creative ${stamp}`);

    state = createBannerPlacement({
      name: `Route placement ${stamp}`,
      noAdPolicy: "house",
      siteKey: `route-${stamp}`,
      siteUrl: `https://route-${stamp}.example.com`,
      slotKey: "top",
      type: "image_link",
    });
    const placement = findRequired(state.placements, (item) => item.name === `Route placement ${stamp}`);

    state = assignBannerPlacement({
      creativeId: creative.id,
      placementId: placement.id,
      trackingLinkId: trackingLink.id,
    });

    const missingImageResponse = await getBannerImage(
      new Request("http://localhost/api/banner-management/image?slot=missing.top"),
    );
    expect(missingImageResponse.status).toBe(200);
    expect(missingImageResponse.headers.get("content-type")).toContain("image/gif");

    const missingClickResponse = await getBannerClick(
      new Request("http://localhost/api/banner-management/click?slot=missing.top"),
    );
    expect(missingClickResponse.status).toBe(404);

    const imageResponse = await getBannerImage(
      new Request(`http://localhost/api/banner-management/image?slot=${placement.siteKey}.${placement.slotKey}`),
    );
    expect(imageResponse.status).toBe(302);
    expect(imageResponse.headers.get("location")).toBe(imageUrl);

    const clickResponse = await getBannerClick(
      new Request(`http://localhost/api/banner-management/click?slot=${placement.siteKey}.${placement.slotKey}`),
    );
    expect(clickResponse.status).toBe(302);
    expect(clickResponse.headers.get("location")).toBe(publicUrl);

    const finalPlacement = findRequired(
      getBannerManagementState().placements,
      (item) => item.id === placement.id,
    );
    expect(finalPlacement.requests).toBe(1);
    expect(finalPlacement.imageRequests).toBe(1);
  });

  it("serves Coupang banners on registered channels and blocks unregistered channels", () => {
    const stamp = Date.now().toString(36);

    let state = createBannerTrackingLink({
      offerId: "coupang-partners-primary",
      offerName: "Coupang approval offer",
      publicUrl: "https://coupa.ng/example",
      slug: `coupang-${stamp}`,
    });
    const trackingLink = findRequired(state.trackingLinks, (link) => link.slug === `coupang-${stamp}`);

    state = createBannerCreative({
      height: 250,
      imageUrl: "https://static.coupangcdn.com/image/banner.png",
      name: `Coupang approval creative ${stamp}`,
      offerId: "coupang-partners-primary",
      width: 300,
    });
    const creative = findRequired(state.creatives, (item) => item.name === `Coupang approval creative ${stamp}`);

    state = createBannerPlacement({
      name: `Coupang approval placement ${stamp}`,
      noAdPolicy: "collapse",
      siteKey: "todaypharm",
      siteUrl: "https://todaypharm.kr",
      slotKey: `approval-${stamp}`,
      type: "image_link",
    });
    const placement = findRequired(state.placements, (item) => item.name === `Coupang approval placement ${stamp}`);

    assignBannerPlacement({
      creativeId: creative.id,
      placementId: placement.id,
      trackingLinkId: trackingLink.id,
    });

    expect(resolveBannerPlacement({ slot: `todaypharm.approval-${stamp}` })?.trackingLink.id).toBe(
      trackingLink.id,
    );

    state = createBannerPlacement({
      name: `Coupang unregistered placement ${stamp}`,
      noAdPolicy: "collapse",
      siteKey: `unregistered-coupang-${stamp}`,
      siteUrl: `https://unregistered-coupang-${stamp}.example.com`,
      slotKey: "top",
      type: "image_link",
    });
    const unregisteredPlacement = findRequired(
      state.placements,
      (item) => item.name === `Coupang unregistered placement ${stamp}`,
    );

    assignBannerPlacement({
      creativeId: creative.id,
      placementId: unregisteredPlacement.id,
      trackingLinkId: trackingLink.id,
    });

    expect(resolveBannerPlacement({ slot: `${unregisteredPlacement.siteKey}.top` })).toBeNull();
  });
});

function jsonPost(body: unknown, headers: HeadersInit = {}): Request {
  return new Request("http://localhost/api/banner-management", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    method: "POST",
  });
}

function findRequired<T>(items: T[], predicate: (item: T) => boolean): T {
  const item = items.find(predicate);
  expect(item).toBeDefined();
  return item as T;
}
