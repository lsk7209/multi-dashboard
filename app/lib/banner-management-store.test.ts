import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  assignBannerPlacement,
  createBannerCreative,
  createBannerPlacement,
  createBannerTrackingLink,
  getBannerManagementState,
} from "./banner-management-store.js";

let tempDir: string;

describe("banner-management-store", () => {
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "banner-store-"));
    const tempDbPath = join(tempDir, "ad-manage.db");
    copyFileSync(join(process.cwd(), "data", "monetization", "ad-manage.db"), tempDbPath);
    process.env.MONETIZATION_BANNER_DB = tempDbPath;
    process.env.MONETIZATION_BANNER_SNAPSHOT = join(tempDir, "banner-management.json");
  });

  afterEach(() => {
    delete process.env.MONETIZATION_BANNER_DB;
    delete process.env.MONETIZATION_BANNER_SNAPSHOT;
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

    const finalState = getBannerManagementState();
    expect(finalState.writable).toBe(true);
    expect(finalState.assignments.some((assignment) => assignment.placementId === placement?.id)).toBe(true);

    const snapshotPath = process.env.MONETIZATION_BANNER_SNAPSHOT ?? "";
    expect(existsSync(snapshotPath)).toBe(true);
    expect(readFileSync(snapshotPath, "utf8")).toContain(`Smoke placement ${stamp}`);
  });
});
