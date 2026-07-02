import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { createClient, type Client, type InArgs, type Row as LibsqlRow } from "@libsql/client";

type Row = Record<string, unknown>;

type DatabaseLike = {
  close: () => void;
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    all: (...params: unknown[]) => Row[];
    get: (...params: unknown[]) => Row | undefined;
    run: (...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
  };
};

let cachedDatabaseSync:
  | (new (path: string, options?: { readOnly?: boolean }) => DatabaseLike)
  | undefined;

function getDatabaseSync(): new (path: string, options?: { readOnly?: boolean }) => DatabaseLike {
  if (cachedDatabaseSync) return cachedDatabaseSync;
  const builtinLoader = process as typeof process & {
    getBuiltinModule?: (specifier: string) => {
      DatabaseSync: new (path: string, options?: { readOnly?: boolean }) => DatabaseLike;
    };
  };
  if (builtinLoader.getBuiltinModule) {
    const sqliteModule = builtinLoader.getBuiltinModule(`node:${"sqlite"}`) as unknown as {
      DatabaseSync: new (path: string, options?: { readOnly?: boolean }) => DatabaseLike;
    };
    cachedDatabaseSync = sqliteModule.DatabaseSync;
    return cachedDatabaseSync;
  }
  const requireBuiltin = Function("specifier", "return require(specifier)") as (specifier: string) => {
    DatabaseSync: new (path: string, options?: { readOnly?: boolean }) => DatabaseLike;
  };
  cachedDatabaseSync = requireBuiltin(`node:${"sqlite"}`).DatabaseSync;
  return cachedDatabaseSync;
}

export interface BannerPlacementRow {
  id: string;
  siteKey: string | null;
  slotKey: string | null;
  siteUrl: string | null;
  name: string;
  type: string;
  noAdPolicy: string;
  status: string;
  assignedCreativeId: string | null;
  assignedCreativeName: string | null;
  assignedTrackingLinkId: string | null;
  assignedTrackingSlug: string | null;
  requests: number;
  imageRequests: number;
  noAd: number;
  createdAt: string;
  updatedAt: string;
}

export interface BannerCreativeRow {
  id: string;
  offerId: string | null;
  name: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  status: string;
  policyStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface BannerTrackingLinkRow {
  id: string;
  slug: string;
  publicUrl: string;
  offerId: string | null;
  offerName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BannerAssignmentRow {
  id: string;
  placementId: string;
  placementName: string;
  placementSiteKey: string | null;
  placementSlotKey: string | null;
  placementSiteUrl: string | null;
  creativeId: string | null;
  creativeName: string | null;
  trackingLinkId: string | null;
  trackingSlug: string | null;
  weight: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BannerSiteSummaryRow {
  siteKey: string;
  siteUrl: string | null;
  placements: number;
  activePlacements: number;
  assignedPlacements: number;
  unassignedPlacements: number;
  requests: number;
  imageRequests: number;
  noAd: number;
  clicks: number;
  lastUpdatedAt: string;
}

export interface ResolvedBannerPlacement {
  placement: BannerPlacementRow;
  creative: BannerCreativeRow;
  trackingLink: BannerTrackingLinkRow;
  assignmentId: string;
}

export interface BannerManagementState {
  dbPath: string;
  dbExists: boolean;
  dbUpdatedAt: string | null;
  writable: boolean;
  persistenceNote: string;
  publicBaseUrl: string;
  placements: BannerPlacementRow[];
  creatives: BannerCreativeRow[];
  trackingLinks: BannerTrackingLinkRow[];
  assignments: BannerAssignmentRow[];
  siteSummaries: BannerSiteSummaryRow[];
}

interface BannerSnapshot {
  generatedAt: string;
  source: {
    sourceKind: "multi-dashboard-local";
    workspacePath: string;
    dbPath: string;
    dbExists: boolean;
    dbUpdatedAt?: string | undefined;
    sourceNote: string;
  };
  counts: {
    placements: number;
    activePlacements: number;
    creatives: number;
    activeCreatives: number;
    trackingLinks: number;
    activeTrackingLinks: number;
    assignments: number;
    activeAssignments: number;
    placementEvents: number;
    requests: number;
    served: number;
    noAd: number;
    imageRequests: number;
    clicks: number;
  };
  noAdRate: number | null;
  eventBreakdown: Array<{ type: string; count: number }>;
  topPlacements: Array<{
    id: string;
    siteKey?: string | undefined;
    slotKey?: string | undefined;
    name: string;
    status: string;
    assignedCreativeName?: string | undefined;
    assignedTrackingSlug?: string | undefined;
    requests: number;
    imageRequests: number;
    noAd: number;
  }>;
}

export function getBannerDbPath(): string {
  if (process.env.MONETIZATION_BANNER_DB) return resolve(process.env.MONETIZATION_BANNER_DB);
  return join(/*turbopackIgnore: true*/ process.cwd(), "data", "monetization", "ad-manage.db");
}

export function getBannerPersistenceNote(): string {
  if (isBannerLibsqlEnabled()) {
    return "Writes are saved to the remote banner libSQL/Turso database.";
  }
  if (process.env.VERCEL && !process.env.MONETIZATION_BANNER_DB) {
    return "Vercel deployment uses the bundled DB as read-mostly state. Use a writable MONETIZATION_BANNER_DB path in a persistent runtime for production edits.";
  }
  return "Writes are saved to the multi-dashboard banner DB.";
}

export function getBannerSnapshotPath(): string {
  if (process.env.MONETIZATION_BANNER_SNAPSHOT) {
    return resolve(process.env.MONETIZATION_BANNER_SNAPSHOT);
  }
  return join(/*turbopackIgnore: true*/ process.cwd(), "data", "banner-management.json");
}

export function getBannerPublicBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BANNER_BASE_URL || process.env.BANNER_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
}

export async function getBannerManagementStateAsync(): Promise<BannerManagementState> {
  if (isBannerLibsqlEnabled()) return getRemoteBannerManagementState();
  return getBannerManagementState();
}

export function getBannerManagementState(): BannerManagementState {
  const dbPath = getBannerDbPath();
  ensureSchemaWhenWritable(dbPath);
  const db = openDb(dbPath, true);
  try {
    return {
      dbPath,
      dbExists: existsSync(dbPath),
      dbUpdatedAt: existsSync(dbPath) ? statSync(dbPath).mtime.toISOString() : null,
      writable: canAttemptWrite(),
      persistenceNote: getBannerPersistenceNote(),
      publicBaseUrl: getBannerPublicBaseUrl(),
      placements: listPlacements(db),
      creatives: listCreatives(db),
      trackingLinks: listTrackingLinks(db),
      assignments: listAssignments(db),
      siteSummaries: listSiteSummaries(db),
    };
  } finally {
    db.close();
  }
}

export function createBannerPlacement(input: {
  name: string;
  siteKey?: string | undefined;
  slotKey?: string | undefined;
  siteUrl?: string | null | undefined;
  type?: string | undefined;
  noAdPolicy?: string | undefined;
  status?: string | undefined;
}): BannerManagementState {
  assertWritable();
  const name = cleanRequired(input.name, "Placement name is required.");
  const siteKey = cleanOptionalKey(input.siteKey, "Site key");
  const slotKey = cleanOptionalKey(input.slotKey, "Slot key");
  const siteUrl = input.siteUrl == null ? null : cleanOptionalUrl(input.siteUrl);
  const type = cleanChoice(input.type, ["image_link", "js_slot"], "image_link");
  const noAdPolicy = cleanChoice(input.noAdPolicy, ["transparent", "house", "collapse"], "transparent");
  const status = cleanChoice(input.status, ["active", "paused", "inactive"], "active");
  const now = new Date().toISOString();
  const dbPath = getBannerDbPath();
  ensureSchema(dbPath);
  const db = openDb(dbPath, false);
  try {
    db.prepare(
      `INSERT INTO placements
        (id, site_key, slot_key, site_url, name, type, no_ad_policy, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(`placement_${randomUUID()}`, siteKey, slotKey, siteUrl, name, type, noAdPolicy, status, now, now);
  } finally {
    db.close();
  }
  refreshBannerSnapshot();
  return getBannerManagementState();
}

export function updateBannerPlacement(input: {
  id: string;
  name?: string | undefined;
  siteKey?: string | undefined;
  slotKey?: string | undefined;
  siteUrl?: string | null | undefined;
  type?: string | undefined;
  noAdPolicy?: string | undefined;
  status?: string | undefined;
}): BannerManagementState {
  assertWritable();
  const id = cleanRequired(input.id, "Placement id is required.");
  const current = getRequiredRow("placements", id);
  const name = input.name == null ? asString(current.name) : cleanRequired(input.name, "Placement name is required.");
  const siteKey = input.siteKey === undefined ? nullableString(current.site_key) : cleanOptionalKey(input.siteKey, "Site key");
  const slotKey = input.slotKey === undefined ? nullableString(current.slot_key) : cleanOptionalKey(input.slotKey, "Slot key");
  const siteUrl = input.siteUrl === undefined ? nullableString(current.site_url) : cleanOptionalUrl(input.siteUrl);
  const type = cleanChoice(input.type ?? asString(current.type), ["image_link", "js_slot"], "image_link");
  const noAdPolicy = cleanChoice(
    input.noAdPolicy ?? asString(current.no_ad_policy),
    ["transparent", "house", "collapse"],
    "transparent",
  );
  const status = cleanChoice(input.status ?? asString(current.status), ["active", "paused", "inactive"], "active");
  const dbPath = getBannerDbPath();
  const db = openDb(dbPath, false);
  try {
    db.prepare(
      `UPDATE placements
       SET site_key = ?, slot_key = ?, site_url = ?, name = ?, type = ?, no_ad_policy = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    ).run(siteKey, slotKey, siteUrl, name, type, noAdPolicy, status, new Date().toISOString(), id);
  } finally {
    db.close();
  }
  refreshBannerSnapshot();
  return getBannerManagementState();
}

export function createBannerCreative(input: {
  name: string;
  imageUrl: string;
  offerId?: string | null | undefined;
  width?: number | null | undefined;
  height?: number | null | undefined;
  status?: string | undefined;
  policyStatus?: string | undefined;
}): BannerManagementState {
  assertWritable();
  const name = cleanRequired(input.name, "Creative name is required.");
  const imageUrl = cleanUrl(input.imageUrl, "Image URL is required.");
  const width = cleanOptionalInteger(input.width);
  const height = cleanOptionalInteger(input.height);
  const status = cleanChoice(input.status, ["active", "paused", "inactive"], "active");
  const policyStatus = cleanChoice(input.policyStatus, ["approved", "review", "rejected"], "approved");
  const now = new Date().toISOString();
  const dbPath = getBannerDbPath();
  ensureSchema(dbPath);
  const db = openDb(dbPath, false);
  try {
    db.prepare(
      `INSERT INTO creatives
        (id, offer_id, name, image_url, width, height, status, policy_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      `creative_${randomUUID()}`,
      cleanOptionalText(input.offerId),
      name,
      imageUrl,
      width,
      height,
      status,
      policyStatus,
      now,
      now,
    );
  } finally {
    db.close();
  }
  refreshBannerSnapshot();
  return getBannerManagementState();
}

export function updateBannerCreative(input: {
  id: string;
  name?: string | undefined;
  imageUrl?: string | undefined;
  offerId?: string | null | undefined;
  width?: number | null | undefined;
  height?: number | null | undefined;
  status?: string | undefined;
  policyStatus?: string | undefined;
}): BannerManagementState {
  assertWritable();
  const id = cleanRequired(input.id, "Creative id is required.");
  const current = getRequiredRow("creatives", id);
  const name = input.name == null ? asString(current.name) : cleanRequired(input.name, "Creative name is required.");
  const imageUrl = input.imageUrl == null ? asString(current.image_url) : cleanUrl(input.imageUrl, "Image URL is required.");
  const status = cleanChoice(input.status ?? asString(current.status), ["active", "paused", "inactive"], "active");
  const policyStatus = cleanChoice(
    input.policyStatus ?? asString(current.policy_status),
    ["approved", "review", "rejected"],
    "approved",
  );
  const dbPath = getBannerDbPath();
  const db = openDb(dbPath, false);
  try {
    db.prepare(
      `UPDATE creatives
       SET offer_id = ?, name = ?, image_url = ?, width = ?, height = ?, status = ?, policy_status = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      input.offerId === undefined ? current.offer_id ?? null : cleanOptionalText(input.offerId),
      name,
      imageUrl,
      input.width === undefined ? current.width ?? null : cleanOptionalInteger(input.width),
      input.height === undefined ? current.height ?? null : cleanOptionalInteger(input.height),
      status,
      policyStatus,
      new Date().toISOString(),
      id,
    );
  } finally {
    db.close();
  }
  refreshBannerSnapshot();
  return getBannerManagementState();
}

export function createBannerTrackingLink(input: {
  slug: string;
  publicUrl: string;
  offerId?: string | null | undefined;
  offerName?: string | null | undefined;
  status?: string | undefined;
}): BannerManagementState {
  assertWritable();
  const slug = cleanSlug(input.slug);
  const publicUrl = cleanUrl(input.publicUrl, "Public URL is required.");
  const status = cleanChoice(input.status, ["active", "paused", "inactive"], "active");
  const now = new Date().toISOString();
  const dbPath = getBannerDbPath();
  ensureSchema(dbPath);
  const db = openDb(dbPath, false);
  try {
    db.prepare(
      `INSERT INTO tracking_links
        (id, slug, public_url, offer_id, offer_name, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      `track_${randomUUID()}`,
      slug,
      publicUrl,
      cleanOptionalText(input.offerId),
      cleanOptionalText(input.offerName),
      status,
      now,
      now,
    );
  } finally {
    db.close();
  }
  refreshBannerSnapshot();
  return getBannerManagementState();
}

export function updateBannerTrackingLink(input: {
  id: string;
  slug?: string | undefined;
  publicUrl?: string | undefined;
  offerId?: string | null | undefined;
  offerName?: string | null | undefined;
  status?: string | undefined;
}): BannerManagementState {
  assertWritable();
  const id = cleanRequired(input.id, "Tracking link id is required.");
  const current = getRequiredRow("tracking_links", id);
  const slug = input.slug == null ? asString(current.slug) : cleanSlug(input.slug);
  const publicUrl = input.publicUrl == null ? asString(current.public_url) : cleanUrl(input.publicUrl, "Public URL is required.");
  const status = cleanChoice(input.status ?? asString(current.status), ["active", "paused", "inactive"], "active");
  const dbPath = getBannerDbPath();
  const db = openDb(dbPath, false);
  try {
    db.prepare(
      `UPDATE tracking_links
       SET slug = ?, public_url = ?, offer_id = ?, offer_name = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      slug,
      publicUrl,
      input.offerId === undefined ? current.offer_id ?? null : cleanOptionalText(input.offerId),
      input.offerName === undefined ? current.offer_name ?? null : cleanOptionalText(input.offerName),
      status,
      new Date().toISOString(),
      id,
    );
  } finally {
    db.close();
  }
  refreshBannerSnapshot();
  return getBannerManagementState();
}

export function assignBannerPlacement(input: {
  placementId: string;
  creativeId: string;
  trackingLinkId: string;
  weight?: number | undefined;
}): BannerManagementState {
  assertWritable();
  const placementId = cleanRequired(input.placementId, "Placement is required.");
  const creativeId = cleanRequired(input.creativeId, "Creative is required.");
  const trackingLinkId = cleanRequired(input.trackingLinkId, "Tracking link is required.");
  getRequiredRow("placements", placementId);
  getRequiredRow("creatives", creativeId);
  getRequiredRow("tracking_links", trackingLinkId);
  const weight = cleanOptionalInteger(input.weight) ?? 100;
  const now = new Date().toISOString();
  const dbPath = getBannerDbPath();
  const db = openDb(dbPath, false);
  try {
    db.exec("BEGIN IMMEDIATE");
    db.prepare("UPDATE assignments SET status = 'inactive', updated_at = ? WHERE placement_id = ? AND status = 'active'")
      .run(now, placementId);
    db.prepare(
      `INSERT INTO assignments
        (id, placement_id, creative_id, tracking_link_id, weight, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
    ).run(`assignment_${randomUUID()}`, placementId, creativeId, trackingLinkId, weight, now, now);
    db.prepare("UPDATE placements SET updated_at = ? WHERE id = ?").run(now, placementId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
  refreshBannerSnapshot();
  return getBannerManagementState();
}

export function resolveBannerPlacement(input: {
  placementId?: string | undefined;
  siteKey?: string | undefined;
  slotKey?: string | undefined;
  slot?: string | undefined;
  pageUrl?: string | undefined;
  referrer?: string | undefined;
}): ResolvedBannerPlacement | null {
  const lookup = normalizePlacementLookup(input);
  const dbPath = getBannerDbPath();
  ensureSchemaWhenWritable(dbPath);
  const db = openDb(dbPath, true);
  try {
    const row = db.prepare(
      `
      SELECT
        p.id AS placement_id,
        p.site_key,
        p.slot_key,
        p.site_url,
        p.name AS placement_name,
        p.type,
        p.no_ad_policy,
        p.status AS placement_status,
        p.created_at AS placement_created_at,
        p.updated_at AS placement_updated_at,
        a.id AS assignment_id,
        a.weight,
        c.id AS creative_id,
        c.offer_id AS creative_offer_id,
        c.name AS creative_name,
        c.image_url,
        c.width,
        c.height,
        c.status AS creative_status,
        c.policy_status,
        c.created_at AS creative_created_at,
        c.updated_at AS creative_updated_at,
        tl.id AS tracking_link_id,
        tl.slug,
        tl.public_url,
        tl.offer_id AS tracking_offer_id,
        tl.offer_name,
        tl.status AS tracking_status,
        tl.created_at AS tracking_created_at,
        tl.updated_at AS tracking_updated_at
      FROM placements p
      LEFT JOIN assignments a ON a.placement_id = p.id AND a.status = 'active'
      LEFT JOIN creatives c ON c.id = a.creative_id AND c.status = 'active' AND c.policy_status = 'approved'
      LEFT JOIN tracking_links tl ON tl.id = a.tracking_link_id AND tl.status = 'active'
      WHERE p.status = 'active'
        AND (
          (? IS NOT NULL AND p.id = ?)
          OR (? IS NOT NULL AND ? IS NOT NULL AND p.site_key = ? AND p.slot_key = ?)
        )
      ORDER BY a.weight DESC, a.updated_at DESC
      LIMIT 1
    `,
    ).get(
      lookup.placementId,
      lookup.placementId,
      lookup.siteKey,
      lookup.slotKey,
      lookup.siteKey,
      lookup.slotKey,
    );
    if (!row || !row.assignment_id || !row.creative_id || !row.tracking_link_id) {
      recordPlacementEvent({
        eventType: "no_ad",
        placementId: nullableString(row?.placement_id) ?? lookup.placementId,
        pageUrl: input.pageUrl,
        referrer: input.referrer,
      });
      return null;
    }
    const resolved = mapResolvedPlacement(row);
    recordPlacementEvent({
      assignmentId: resolved.assignmentId,
      eventType: "request",
      pageUrl: input.pageUrl,
      placementId: resolved.placement.id,
      referrer: input.referrer,
      trackingLinkId: resolved.trackingLink.id,
    });
    recordPlacementEvent({
      assignmentId: resolved.assignmentId,
      eventType: "served",
      pageUrl: input.pageUrl,
      placementId: resolved.placement.id,
      referrer: input.referrer,
      trackingLinkId: resolved.trackingLink.id,
    });
    return resolved;
  } finally {
    db.close();
  }
}

export function recordBannerImageRequest(input: {
  assignmentId?: string | undefined;
  placementId: string;
  trackingLinkId?: string | undefined;
  pageUrl?: string | undefined;
  referrer?: string | undefined;
}): void {
  recordPlacementEvent({ ...input, eventType: "image_request" });
}

export function recordBannerClick(input: {
  assignmentId?: string | undefined;
  placementId: string;
  trackingLinkId?: string | undefined;
  pageUrl?: string | undefined;
  referrer?: string | undefined;
}): void {
  recordPlacementEvent({ ...input, eventType: "click" });
}

export async function createBannerPlacementAsync(
  input: Parameters<typeof createBannerPlacement>[0],
): Promise<BannerManagementState> {
  if (isBannerLibsqlEnabled()) return createRemoteBannerPlacement(input);
  return createBannerPlacement(input);
}

export async function updateBannerPlacementAsync(
  input: Parameters<typeof updateBannerPlacement>[0],
): Promise<BannerManagementState> {
  if (isBannerLibsqlEnabled()) return updateRemoteBannerPlacement(input);
  return updateBannerPlacement(input);
}

export async function createBannerCreativeAsync(
  input: Parameters<typeof createBannerCreative>[0],
): Promise<BannerManagementState> {
  if (isBannerLibsqlEnabled()) return createRemoteBannerCreative(input);
  return createBannerCreative(input);
}

export async function updateBannerCreativeAsync(
  input: Parameters<typeof updateBannerCreative>[0],
): Promise<BannerManagementState> {
  if (isBannerLibsqlEnabled()) return updateRemoteBannerCreative(input);
  return updateBannerCreative(input);
}

export async function createBannerTrackingLinkAsync(
  input: Parameters<typeof createBannerTrackingLink>[0],
): Promise<BannerManagementState> {
  if (isBannerLibsqlEnabled()) return createRemoteBannerTrackingLink(input);
  return createBannerTrackingLink(input);
}

export async function updateBannerTrackingLinkAsync(
  input: Parameters<typeof updateBannerTrackingLink>[0],
): Promise<BannerManagementState> {
  if (isBannerLibsqlEnabled()) return updateRemoteBannerTrackingLink(input);
  return updateBannerTrackingLink(input);
}

export async function assignBannerPlacementAsync(
  input: Parameters<typeof assignBannerPlacement>[0],
): Promise<BannerManagementState> {
  if (isBannerLibsqlEnabled()) return assignRemoteBannerPlacement(input);
  return assignBannerPlacement(input);
}

export async function resolveBannerPlacementAsync(
  input: Parameters<typeof resolveBannerPlacement>[0],
): Promise<ResolvedBannerPlacement | null> {
  if (isBannerLibsqlEnabled()) return resolveRemoteBannerPlacement(input);
  return resolveBannerPlacement(input);
}

export async function recordBannerImageRequestAsync(
  input: Parameters<typeof recordBannerImageRequest>[0],
): Promise<void> {
  if (isBannerLibsqlEnabled()) {
    await recordRemotePlacementEvent({ ...input, eventType: "image_request" });
    return;
  }
  recordBannerImageRequest(input);
}

export async function recordBannerClickAsync(input: Parameters<typeof recordBannerClick>[0]): Promise<void> {
  if (isBannerLibsqlEnabled()) {
    await recordRemotePlacementEvent({ ...input, eventType: "click" });
    return;
  }
  recordBannerClick(input);
}

export function refreshBannerSnapshot(): BannerSnapshot {
  const snapshot = buildBannerSnapshot();
  const path = getBannerSnapshotPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return snapshot;
}

function buildBannerSnapshot(): BannerSnapshot {
  const dbPath = getBannerDbPath();
  ensureSchema(dbPath);
  const db = openDb(dbPath, true);
  try {
    const counts = {
      placements: scalar(db, "SELECT COUNT(*) AS value FROM placements"),
      activePlacements: scalar(db, "SELECT COUNT(*) AS value FROM placements WHERE status = 'active'"),
      creatives: scalar(db, "SELECT COUNT(*) AS value FROM creatives"),
      activeCreatives: scalar(db, "SELECT COUNT(*) AS value FROM creatives WHERE status = 'active'"),
      trackingLinks: scalar(db, "SELECT COUNT(*) AS value FROM tracking_links"),
      activeTrackingLinks: scalar(db, "SELECT COUNT(*) AS value FROM tracking_links WHERE status = 'active'"),
      assignments: scalar(db, "SELECT COUNT(*) AS value FROM assignments"),
      activeAssignments: scalar(db, "SELECT COUNT(*) AS value FROM assignments WHERE status = 'active'"),
      placementEvents: scalar(db, "SELECT COUNT(*) AS value FROM placement_event_ledger"),
      requests: scalar(db, "SELECT COUNT(*) AS value FROM placement_event_ledger WHERE event_type = 'request'"),
      served: scalar(db, "SELECT COUNT(*) AS value FROM placement_event_ledger WHERE event_type = 'served'"),
      noAd: scalar(db, "SELECT COUNT(*) AS value FROM placement_event_ledger WHERE event_type = 'no_ad'"),
      imageRequests: scalar(db, "SELECT COUNT(*) AS value FROM placement_event_ledger WHERE event_type = 'image_request'"),
      clicks: scalar(db, "SELECT COUNT(*) AS value FROM placement_event_ledger WHERE event_type = 'click'"),
    };
    const eventBreakdown = db
      .prepare("SELECT event_type AS type, COUNT(*) AS count FROM placement_event_ledger GROUP BY event_type ORDER BY count DESC")
      .all()
      .map((row) => ({ type: asString(row.type), count: asNumber(row.count) }));
    const topPlacements = listPlacements(db).slice(0, 12).map((placement) => ({
      id: placement.id,
      siteKey: placement.siteKey ?? undefined,
      slotKey: placement.slotKey ?? undefined,
      name: placement.name,
      status: placement.status,
      assignedCreativeName: placement.assignedCreativeName ?? undefined,
      assignedTrackingSlug: placement.assignedTrackingSlug ?? undefined,
      requests: placement.requests,
      imageRequests: placement.imageRequests,
      noAd: placement.noAd,
    }));
    return {
      generatedAt: new Date().toISOString(),
      source: {
        sourceKind: "multi-dashboard-local",
        workspacePath: process.cwd(),
        dbPath,
        dbExists: existsSync(dbPath),
        dbUpdatedAt: existsSync(dbPath) ? statSync(dbPath).mtime.toISOString() : undefined,
        sourceNote: "Standalone banner operations source owned by this multi-dashboard repository.",
      },
      counts,
      noAdRate: counts.requests > 0 ? counts.noAd / counts.requests : null,
      eventBreakdown,
      topPlacements,
    };
  } finally {
    db.close();
  }
}

async function getRemoteBannerManagementState(): Promise<BannerManagementState> {
  const client = createBannerLibsqlClient();
  try {
    await ensureRemoteSchema(client);
    return {
      dbPath: getBannerLibsqlLabel(),
      dbExists: true,
      dbUpdatedAt: null,
      writable: true,
      persistenceNote: getBannerPersistenceNote(),
      publicBaseUrl: getBannerPublicBaseUrl(),
      placements: await listRemotePlacements(client),
      creatives: await listRemoteCreatives(client),
      trackingLinks: await listRemoteTrackingLinks(client),
      assignments: await listRemoteAssignments(client),
      siteSummaries: await listRemoteSiteSummaries(client),
    };
  } finally {
    client.close();
  }
}

async function createRemoteBannerPlacement(
  input: Parameters<typeof createBannerPlacement>[0],
): Promise<BannerManagementState> {
  const name = cleanRequired(input.name, "Placement name is required.");
  const siteKey = cleanOptionalKey(input.siteKey, "Site key");
  const slotKey = cleanOptionalKey(input.slotKey, "Slot key");
  const siteUrl = input.siteUrl == null ? null : cleanOptionalUrl(input.siteUrl);
  const type = cleanChoice(input.type, ["image_link", "js_slot"], "image_link");
  const noAdPolicy = cleanChoice(input.noAdPolicy, ["transparent", "house", "collapse"], "transparent");
  const status = cleanChoice(input.status, ["active", "paused", "inactive"], "active");
  const now = new Date().toISOString();
  const client = createBannerLibsqlClient();
  try {
    await ensureRemoteSchema(client);
    await client.execute({
      sql: `INSERT INTO placements
        (id, site_key, slot_key, site_url, name, type, no_ad_policy, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [`placement_${randomUUID()}`, siteKey, slotKey, siteUrl, name, type, noAdPolicy, status, now, now],
    });
  } finally {
    client.close();
  }
  return getRemoteBannerManagementState();
}

async function updateRemoteBannerPlacement(
  input: Parameters<typeof updateBannerPlacement>[0],
): Promise<BannerManagementState> {
  const id = cleanRequired(input.id, "Placement id is required.");
  const client = createBannerLibsqlClient();
  try {
    await ensureRemoteSchema(client);
    const current = await getRemoteRequiredRow(client, "placements", id);
    const name = input.name == null ? asString(current.name) : cleanRequired(input.name, "Placement name is required.");
    const siteKey = input.siteKey === undefined ? nullableString(current.site_key) : cleanOptionalKey(input.siteKey, "Site key");
    const slotKey = input.slotKey === undefined ? nullableString(current.slot_key) : cleanOptionalKey(input.slotKey, "Slot key");
    const siteUrl = input.siteUrl === undefined ? nullableString(current.site_url) : cleanOptionalUrl(input.siteUrl);
    const type = cleanChoice(input.type ?? asString(current.type), ["image_link", "js_slot"], "image_link");
    const noAdPolicy = cleanChoice(
      input.noAdPolicy ?? asString(current.no_ad_policy),
      ["transparent", "house", "collapse"],
      "transparent",
    );
    const status = cleanChoice(input.status ?? asString(current.status), ["active", "paused", "inactive"], "active");
    await client.execute({
      sql: `UPDATE placements
       SET site_key = ?, slot_key = ?, site_url = ?, name = ?, type = ?, no_ad_policy = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      args: [siteKey, slotKey, siteUrl, name, type, noAdPolicy, status, new Date().toISOString(), id],
    });
  } finally {
    client.close();
  }
  return getRemoteBannerManagementState();
}

async function createRemoteBannerCreative(
  input: Parameters<typeof createBannerCreative>[0],
): Promise<BannerManagementState> {
  const name = cleanRequired(input.name, "Creative name is required.");
  const imageUrl = cleanUrl(input.imageUrl, "Image URL is required.");
  const width = cleanOptionalInteger(input.width);
  const height = cleanOptionalInteger(input.height);
  const status = cleanChoice(input.status, ["active", "paused", "inactive"], "active");
  const policyStatus = cleanChoice(input.policyStatus, ["approved", "review", "rejected"], "approved");
  const now = new Date().toISOString();
  const client = createBannerLibsqlClient();
  try {
    await ensureRemoteSchema(client);
    await client.execute({
      sql: `INSERT INTO creatives
        (id, offer_id, name, image_url, width, height, status, policy_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `creative_${randomUUID()}`,
        cleanOptionalText(input.offerId),
        name,
        imageUrl,
        width,
        height,
        status,
        policyStatus,
        now,
        now,
      ],
    });
  } finally {
    client.close();
  }
  return getRemoteBannerManagementState();
}

async function updateRemoteBannerCreative(
  input: Parameters<typeof updateBannerCreative>[0],
): Promise<BannerManagementState> {
  const id = cleanRequired(input.id, "Creative id is required.");
  const client = createBannerLibsqlClient();
  try {
    await ensureRemoteSchema(client);
    const current = await getRemoteRequiredRow(client, "creatives", id);
    const name = input.name == null ? asString(current.name) : cleanRequired(input.name, "Creative name is required.");
    const imageUrl = input.imageUrl == null ? asString(current.image_url) : cleanUrl(input.imageUrl, "Image URL is required.");
    const status = cleanChoice(input.status ?? asString(current.status), ["active", "paused", "inactive"], "active");
    const policyStatus = cleanChoice(
      input.policyStatus ?? asString(current.policy_status),
      ["approved", "review", "rejected"],
      "approved",
    );
    await client.execute({
      sql: `UPDATE creatives
       SET offer_id = ?, name = ?, image_url = ?, width = ?, height = ?, status = ?, policy_status = ?, updated_at = ?
       WHERE id = ?`,
      args: [
        input.offerId === undefined ? nullableString(current.offer_id) : cleanOptionalText(input.offerId),
        name,
        imageUrl,
        input.width === undefined ? nullableNumber(current.width) : cleanOptionalInteger(input.width),
        input.height === undefined ? nullableNumber(current.height) : cleanOptionalInteger(input.height),
        status,
        policyStatus,
        new Date().toISOString(),
        id,
      ],
    });
  } finally {
    client.close();
  }
  return getRemoteBannerManagementState();
}

async function createRemoteBannerTrackingLink(
  input: Parameters<typeof createBannerTrackingLink>[0],
): Promise<BannerManagementState> {
  const slug = cleanSlug(input.slug);
  const publicUrl = cleanUrl(input.publicUrl, "Public URL is required.");
  const status = cleanChoice(input.status, ["active", "paused", "inactive"], "active");
  const now = new Date().toISOString();
  const client = createBannerLibsqlClient();
  try {
    await ensureRemoteSchema(client);
    await client.execute({
      sql: `INSERT INTO tracking_links
        (id, slug, public_url, offer_id, offer_name, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `track_${randomUUID()}`,
        slug,
        publicUrl,
        cleanOptionalText(input.offerId),
        cleanOptionalText(input.offerName),
        status,
        now,
        now,
      ],
    });
  } finally {
    client.close();
  }
  return getRemoteBannerManagementState();
}

async function updateRemoteBannerTrackingLink(
  input: Parameters<typeof updateBannerTrackingLink>[0],
): Promise<BannerManagementState> {
  const id = cleanRequired(input.id, "Tracking link id is required.");
  const client = createBannerLibsqlClient();
  try {
    await ensureRemoteSchema(client);
    const current = await getRemoteRequiredRow(client, "tracking_links", id);
    const slug = input.slug == null ? asString(current.slug) : cleanSlug(input.slug);
    const publicUrl = input.publicUrl == null ? asString(current.public_url) : cleanUrl(input.publicUrl, "Public URL is required.");
    const status = cleanChoice(input.status ?? asString(current.status), ["active", "paused", "inactive"], "active");
    await client.execute({
      sql: `UPDATE tracking_links
       SET slug = ?, public_url = ?, offer_id = ?, offer_name = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      args: [
        slug,
        publicUrl,
        input.offerId === undefined ? nullableString(current.offer_id) : cleanOptionalText(input.offerId),
        input.offerName === undefined ? nullableString(current.offer_name) : cleanOptionalText(input.offerName),
        status,
        new Date().toISOString(),
        id,
      ],
    });
  } finally {
    client.close();
  }
  return getRemoteBannerManagementState();
}

async function assignRemoteBannerPlacement(
  input: Parameters<typeof assignBannerPlacement>[0],
): Promise<BannerManagementState> {
  const placementId = cleanRequired(input.placementId, "Placement is required.");
  const creativeId = cleanRequired(input.creativeId, "Creative is required.");
  const trackingLinkId = cleanRequired(input.trackingLinkId, "Tracking link is required.");
  const weight = cleanOptionalInteger(input.weight) ?? 100;
  const now = new Date().toISOString();
  const client = createBannerLibsqlClient();
  try {
    await ensureRemoteSchema(client);
    await getRemoteRequiredRow(client, "placements", placementId);
    await getRemoteRequiredRow(client, "creatives", creativeId);
    await getRemoteRequiredRow(client, "tracking_links", trackingLinkId);
    await client.batch(
      [
        {
          sql: "UPDATE assignments SET status = 'inactive', updated_at = ? WHERE placement_id = ? AND status = 'active'",
          args: [now, placementId],
        },
        {
          sql: `INSERT INTO assignments
            (id, placement_id, creative_id, tracking_link_id, weight, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
          args: [`assignment_${randomUUID()}`, placementId, creativeId, trackingLinkId, weight, now, now],
        },
        { sql: "UPDATE placements SET updated_at = ? WHERE id = ?", args: [now, placementId] },
      ],
      "write",
    );
  } finally {
    client.close();
  }
  return getRemoteBannerManagementState();
}

async function resolveRemoteBannerPlacement(
  input: Parameters<typeof resolveBannerPlacement>[0],
): Promise<ResolvedBannerPlacement | null> {
  const lookup = normalizePlacementLookup(input);
  const client = createBannerLibsqlClient();
  try {
    await ensureRemoteSchema(client);
    const row = await remoteGet(
      client,
      `
      SELECT
        p.id AS placement_id,
        p.site_key,
        p.slot_key,
        p.site_url,
        p.name AS placement_name,
        p.type,
        p.no_ad_policy,
        p.status AS placement_status,
        p.created_at AS placement_created_at,
        p.updated_at AS placement_updated_at,
        a.id AS assignment_id,
        a.weight,
        c.id AS creative_id,
        c.offer_id AS creative_offer_id,
        c.name AS creative_name,
        c.image_url,
        c.width,
        c.height,
        c.status AS creative_status,
        c.policy_status,
        c.created_at AS creative_created_at,
        c.updated_at AS creative_updated_at,
        tl.id AS tracking_link_id,
        tl.slug,
        tl.public_url,
        tl.offer_id AS tracking_offer_id,
        tl.offer_name,
        tl.status AS tracking_status,
        tl.created_at AS tracking_created_at,
        tl.updated_at AS tracking_updated_at
      FROM placements p
      LEFT JOIN assignments a ON a.placement_id = p.id AND a.status = 'active'
      LEFT JOIN creatives c ON c.id = a.creative_id AND c.status = 'active' AND c.policy_status = 'approved'
      LEFT JOIN tracking_links tl ON tl.id = a.tracking_link_id AND tl.status = 'active'
      WHERE p.status = 'active'
        AND (
          (? IS NOT NULL AND p.id = ?)
          OR (? IS NOT NULL AND ? IS NOT NULL AND p.site_key = ? AND p.slot_key = ?)
        )
      ORDER BY a.weight DESC, a.updated_at DESC
      LIMIT 1
    `,
      [lookup.placementId, lookup.placementId, lookup.siteKey, lookup.slotKey, lookup.siteKey, lookup.slotKey],
    );
    if (!row || !row.assignment_id || !row.creative_id || !row.tracking_link_id) {
      await recordRemotePlacementEvent({
        eventType: "no_ad",
        placementId: nullableString(row?.placement_id) ?? lookup.placementId,
        pageUrl: input.pageUrl,
        referrer: input.referrer,
      });
      return null;
    }
    const resolved = mapResolvedPlacement(row);
    await recordRemotePlacementEvent({
      assignmentId: resolved.assignmentId,
      eventType: "request",
      pageUrl: input.pageUrl,
      placementId: resolved.placement.id,
      referrer: input.referrer,
      trackingLinkId: resolved.trackingLink.id,
    });
    await recordRemotePlacementEvent({
      assignmentId: resolved.assignmentId,
      eventType: "served",
      pageUrl: input.pageUrl,
      placementId: resolved.placement.id,
      referrer: input.referrer,
      trackingLinkId: resolved.trackingLink.id,
    });
    return resolved;
  } finally {
    client.close();
  }
}

async function recordRemotePlacementEvent(input: {
  assignmentId?: string | undefined;
  eventType: "request" | "served" | "no_ad" | "image_request" | "click";
  metadata?: unknown;
  pageUrl?: string | undefined;
  placementId?: string | null | undefined;
  referrer?: string | undefined;
  trackingLinkId?: string | undefined;
}): Promise<void> {
  if (!isBannerLibsqlEnabled()) return;
  const client = createBannerLibsqlClient();
  try {
    await ensureRemoteSchema(client);
    await client.execute({
      sql: `INSERT INTO placement_event_ledger
        (id, event_type, tracking_link_id, placement_id, assignment_id, page_url, referrer, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `event_${randomUUID()}`,
        input.eventType,
        input.trackingLinkId ?? null,
        input.placementId ?? null,
        input.assignmentId ?? null,
        cleanOptionalText(input.pageUrl),
        cleanOptionalText(input.referrer),
        input.metadata == null ? null : JSON.stringify(input.metadata),
        new Date().toISOString(),
      ],
    });
  } finally {
    client.close();
  }
}

async function ensureRemoteSchema(client: Client): Promise<void> {
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS tracking_links (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        public_url TEXT NOT NULL,
        offer_id TEXT,
        offer_name TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS creatives (
        id TEXT PRIMARY KEY,
        offer_id TEXT,
        name TEXT NOT NULL,
        image_url TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        policy_status TEXT NOT NULL DEFAULT 'approved',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS placements (
        id TEXT PRIMARY KEY,
        site_key TEXT,
        slot_key TEXT,
        site_url TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'image_link',
        no_ad_policy TEXT NOT NULL DEFAULT 'transparent',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY,
        placement_id TEXT NOT NULL,
        creative_id TEXT,
        tracking_link_id TEXT,
        weight INTEGER NOT NULL DEFAULT 100,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (placement_id) REFERENCES placements(id),
        FOREIGN KEY (creative_id) REFERENCES creatives(id),
        FOREIGN KEY (tracking_link_id) REFERENCES tracking_links(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_assignments_placement_status ON assignments (placement_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_assignments_status_updated ON assignments (status, updated_at)`,
      `CREATE TABLE IF NOT EXISTS placement_event_ledger (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        tracking_link_id TEXT,
        placement_id TEXT,
        assignment_id TEXT,
        page_url TEXT,
        referrer TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_placement_event_ledger_placement_type
        ON placement_event_ledger (placement_id, event_type)`,
      `CREATE INDEX IF NOT EXISTS idx_placement_event_ledger_created_at
        ON placement_event_ledger (created_at)`,
    ],
    "write",
  );
  await ensureRemoteColumn(client, "placements", "site_key", "TEXT");
  await ensureRemoteColumn(client, "placements", "slot_key", "TEXT");
  await ensureRemoteColumn(client, "placements", "site_url", "TEXT");
  await client.batch(
    [
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_placements_site_slot
        ON placements (site_key, slot_key)
        WHERE site_key IS NOT NULL AND slot_key IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_placements_site_key ON placements (site_key)`,
      `CREATE INDEX IF NOT EXISTS idx_placements_status_updated ON placements (status, updated_at)`,
    ],
    "write",
  );
}

async function ensureRemoteColumn(client: Client, table: string, column: string, definition: string): Promise<void> {
  const columns = await remoteAll(client, `PRAGMA table_info(${table})`);
  if (columns.some((row) => asString(row.name) === column)) return;
  await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

async function listRemotePlacements(client: Client): Promise<BannerPlacementRow[]> {
  const rows = await remoteAll(
    client,
    `
      SELECT
        p.id,
        p.site_key,
        p.slot_key,
        p.site_url,
        p.name,
        p.type,
        p.no_ad_policy,
        p.status,
        p.created_at,
        p.updated_at,
        a.creative_id AS assigned_creative_id,
        c.name AS assigned_creative_name,
        a.tracking_link_id AS assigned_tracking_link_id,
        tl.slug AS assigned_tracking_slug,
        COALESCE(request_counts.requests, 0) AS requests,
        COALESCE(image_counts.image_requests, 0) AS image_requests,
        COALESCE(no_ad_counts.no_ad, 0) AS no_ad
      FROM placements p
      LEFT JOIN assignments a ON a.placement_id = p.id AND a.status = 'active'
      LEFT JOIN creatives c ON c.id = a.creative_id
      LEFT JOIN tracking_links tl ON tl.id = a.tracking_link_id
      LEFT JOIN (
        SELECT placement_id, COUNT(*) AS requests
        FROM placement_event_ledger
        WHERE event_type = 'request' AND placement_id IS NOT NULL
        GROUP BY placement_id
      ) request_counts ON request_counts.placement_id = p.id
      LEFT JOIN (
        SELECT placement_id, COUNT(*) AS image_requests
        FROM placement_event_ledger
        WHERE event_type = 'image_request' AND placement_id IS NOT NULL
        GROUP BY placement_id
      ) image_counts ON image_counts.placement_id = p.id
      LEFT JOIN (
        SELECT placement_id, COUNT(*) AS no_ad
        FROM placement_event_ledger
        WHERE event_type = 'no_ad' AND placement_id IS NOT NULL
        GROUP BY placement_id
      ) no_ad_counts ON no_ad_counts.placement_id = p.id
      ORDER BY p.updated_at DESC
    `,
  );
  return rows.map((row) => ({
    id: asString(row.id),
    siteKey: nullableString(row.site_key),
    slotKey: nullableString(row.slot_key),
    siteUrl: nullableString(row.site_url),
    name: asString(row.name),
    type: asString(row.type),
    noAdPolicy: asString(row.no_ad_policy),
    status: asString(row.status),
    assignedCreativeId: nullableString(row.assigned_creative_id),
    assignedCreativeName: nullableString(row.assigned_creative_name),
    assignedTrackingLinkId: nullableString(row.assigned_tracking_link_id),
    assignedTrackingSlug: nullableString(row.assigned_tracking_slug),
    requests: asNumber(row.requests),
    imageRequests: asNumber(row.image_requests),
    noAd: asNumber(row.no_ad),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  }));
}

async function listRemoteCreatives(client: Client): Promise<BannerCreativeRow[]> {
  const rows = await remoteAll(client, "SELECT * FROM creatives ORDER BY updated_at DESC");
  return rows.map((row) => ({
    id: asString(row.id),
    offerId: nullableString(row.offer_id),
    name: asString(row.name),
    imageUrl: asString(row.image_url),
    width: nullableNumber(row.width),
    height: nullableNumber(row.height),
    status: asString(row.status),
    policyStatus: asString(row.policy_status),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  }));
}

async function listRemoteTrackingLinks(client: Client): Promise<BannerTrackingLinkRow[]> {
  const rows = await remoteAll(client, "SELECT * FROM tracking_links ORDER BY updated_at DESC");
  return rows.map((row) => ({
    id: asString(row.id),
    slug: asString(row.slug),
    publicUrl: asString(row.public_url),
    offerId: nullableString(row.offer_id),
    offerName: nullableString(row.offer_name),
    status: asString(row.status),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  }));
}

async function listRemoteSiteSummaries(client: Client): Promise<BannerSiteSummaryRow[]> {
  const rows = await remoteAll(
    client,
    `
      SELECT
        COALESCE(NULLIF(p.site_key, ''), 'legacy') AS site_key,
        MAX(p.site_url) AS site_url,
        COUNT(*) AS placements,
        SUM(CASE WHEN p.status = 'active' THEN 1 ELSE 0 END) AS active_placements,
        SUM(CASE WHEN active_assignments.active_assignments > 0 THEN 1 ELSE 0 END) AS assigned_placements,
        SUM(CASE WHEN COALESCE(active_assignments.active_assignments, 0) = 0 THEN 1 ELSE 0 END) AS unassigned_placements,
        COALESCE(SUM(event_counts.requests), 0) AS requests,
        COALESCE(SUM(event_counts.image_requests), 0) AS image_requests,
        COALESCE(SUM(event_counts.no_ad), 0) AS no_ad,
        COALESCE(SUM(event_counts.clicks), 0) AS clicks,
        MAX(p.updated_at) AS last_updated_at
      FROM placements p
      LEFT JOIN (
        SELECT placement_id, COUNT(*) AS active_assignments
        FROM assignments
        WHERE status = 'active'
        GROUP BY placement_id
      ) active_assignments ON active_assignments.placement_id = p.id
      LEFT JOIN (
        SELECT
          placement_id,
          SUM(CASE WHEN event_type = 'request' THEN 1 ELSE 0 END) AS requests,
          SUM(CASE WHEN event_type = 'image_request' THEN 1 ELSE 0 END) AS image_requests,
          SUM(CASE WHEN event_type = 'no_ad' THEN 1 ELSE 0 END) AS no_ad,
          SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) AS clicks
        FROM placement_event_ledger
        WHERE placement_id IS NOT NULL
        GROUP BY placement_id
      ) event_counts ON event_counts.placement_id = p.id
      GROUP BY COALESCE(NULLIF(p.site_key, ''), 'legacy')
      ORDER BY unassigned_placements DESC, last_updated_at DESC
    `,
  );
  return rows.map((row) => ({
    siteKey: asString(row.site_key),
    siteUrl: nullableString(row.site_url),
    placements: asNumber(row.placements),
    activePlacements: asNumber(row.active_placements),
    assignedPlacements: asNumber(row.assigned_placements),
    unassignedPlacements: asNumber(row.unassigned_placements),
    requests: asNumber(row.requests),
    imageRequests: asNumber(row.image_requests),
    noAd: asNumber(row.no_ad),
    clicks: asNumber(row.clicks),
    lastUpdatedAt: asString(row.last_updated_at),
  }));
}

async function listRemoteAssignments(client: Client): Promise<BannerAssignmentRow[]> {
  const rows = await remoteAll(
    client,
    `
      SELECT
        a.id,
        a.placement_id,
        p.name AS placement_name,
        p.site_key AS placement_site_key,
        p.slot_key AS placement_slot_key,
        p.site_url AS placement_site_url,
        a.creative_id,
        c.name AS creative_name,
        a.tracking_link_id,
        tl.slug AS tracking_slug,
        a.weight,
        a.status,
        a.created_at,
        a.updated_at
      FROM assignments a
      LEFT JOIN placements p ON p.id = a.placement_id
      LEFT JOIN creatives c ON c.id = a.creative_id
      LEFT JOIN tracking_links tl ON tl.id = a.tracking_link_id
      ORDER BY a.updated_at DESC
      LIMIT 50
    `,
  );
  return rows.map((row) => ({
    id: asString(row.id),
    placementId: asString(row.placement_id),
    placementName: asString(row.placement_name),
    placementSiteKey: nullableString(row.placement_site_key),
    placementSlotKey: nullableString(row.placement_slot_key),
    placementSiteUrl: nullableString(row.placement_site_url),
    creativeId: nullableString(row.creative_id),
    creativeName: nullableString(row.creative_name),
    trackingLinkId: nullableString(row.tracking_link_id),
    trackingSlug: nullableString(row.tracking_slug),
    weight: asNumber(row.weight),
    status: asString(row.status),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  }));
}

async function getRemoteRequiredRow(
  client: Client,
  table: "placements" | "creatives" | "tracking_links",
  id: string,
): Promise<Row> {
  const row = await remoteGet(client, `SELECT * FROM ${table} WHERE id = ?`, [id]);
  if (!row) throw new Error(`${table} row not found: ${id}`);
  return row;
}

async function remoteGet(client: Client, sql: string, args?: InArgs): Promise<Row | undefined> {
  const result = args === undefined ? await client.execute(sql) : await client.execute({ sql, args });
  return result.rows[0] ? remoteRowToRecord(result.rows[0]) : undefined;
}

async function remoteAll(client: Client, sql: string, args?: InArgs): Promise<Row[]> {
  const result = args === undefined ? await client.execute(sql) : await client.execute({ sql, args });
  return result.rows.map(remoteRowToRecord);
}

function remoteRowToRecord(row: LibsqlRow): Row {
  return row as unknown as Row;
}

function openDb(path: string, readOnly: boolean): DatabaseLike {
  const DatabaseSync = getDatabaseSync();
  return new DatabaseSync(path, { readOnly });
}

function ensureSchema(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const db = openDb(path, false);
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tracking_links (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        public_url TEXT NOT NULL,
        offer_id TEXT,
        offer_name TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS creatives (
        id TEXT PRIMARY KEY,
        offer_id TEXT,
        name TEXT NOT NULL,
        image_url TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        policy_status TEXT NOT NULL DEFAULT 'approved',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS placements (
        id TEXT PRIMARY KEY,
        site_key TEXT,
        slot_key TEXT,
        site_url TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'image_link',
        no_ad_policy TEXT NOT NULL DEFAULT 'transparent',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY,
        placement_id TEXT NOT NULL,
        creative_id TEXT,
        tracking_link_id TEXT,
        weight INTEGER NOT NULL DEFAULT 100,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (placement_id) REFERENCES placements(id),
        FOREIGN KEY (creative_id) REFERENCES creatives(id),
        FOREIGN KEY (tracking_link_id) REFERENCES tracking_links(id)
      );
      CREATE INDEX IF NOT EXISTS idx_assignments_placement_status
        ON assignments (placement_id, status);
      CREATE INDEX IF NOT EXISTS idx_assignments_status_updated
        ON assignments (status, updated_at);
      CREATE TABLE IF NOT EXISTS placement_event_ledger (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        tracking_link_id TEXT,
        placement_id TEXT,
        assignment_id TEXT,
        page_url TEXT,
        referrer TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_placement_event_ledger_placement_type
        ON placement_event_ledger (placement_id, event_type);
      CREATE INDEX IF NOT EXISTS idx_placement_event_ledger_created_at
        ON placement_event_ledger (created_at);
    `);
    ensureColumn(db, "placements", "site_key", "TEXT");
    ensureColumn(db, "placements", "slot_key", "TEXT");
    ensureColumn(db, "placements", "site_url", "TEXT");
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_placements_site_slot
        ON placements (site_key, slot_key)
        WHERE site_key IS NOT NULL AND slot_key IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_placements_site_key
        ON placements (site_key);
      CREATE INDEX IF NOT EXISTS idx_placements_status_updated
        ON placements (status, updated_at);
    `);
  } finally {
    db.close();
  }
}

function listPlacements(db: DatabaseLike): BannerPlacementRow[] {
  return db
    .prepare(
      `
      SELECT
        p.id,
        p.site_key,
        p.slot_key,
        p.site_url,
        p.name,
        p.type,
        p.no_ad_policy,
        p.status,
        p.created_at,
        p.updated_at,
        a.creative_id AS assigned_creative_id,
        c.name AS assigned_creative_name,
        a.tracking_link_id AS assigned_tracking_link_id,
        tl.slug AS assigned_tracking_slug,
        COALESCE(request_counts.requests, 0) AS requests,
        COALESCE(image_counts.image_requests, 0) AS image_requests,
        COALESCE(no_ad_counts.no_ad, 0) AS no_ad
      FROM placements p
      LEFT JOIN assignments a ON a.placement_id = p.id AND a.status = 'active'
      LEFT JOIN creatives c ON c.id = a.creative_id
      LEFT JOIN tracking_links tl ON tl.id = a.tracking_link_id
      LEFT JOIN (
        SELECT placement_id, COUNT(*) AS requests
        FROM placement_event_ledger
        WHERE event_type = 'request' AND placement_id IS NOT NULL
        GROUP BY placement_id
      ) request_counts ON request_counts.placement_id = p.id
      LEFT JOIN (
        SELECT placement_id, COUNT(*) AS image_requests
        FROM placement_event_ledger
        WHERE event_type = 'image_request' AND placement_id IS NOT NULL
        GROUP BY placement_id
      ) image_counts ON image_counts.placement_id = p.id
      LEFT JOIN (
        SELECT placement_id, COUNT(*) AS no_ad
        FROM placement_event_ledger
        WHERE event_type = 'no_ad' AND placement_id IS NOT NULL
        GROUP BY placement_id
      ) no_ad_counts ON no_ad_counts.placement_id = p.id
      ORDER BY p.updated_at DESC
    `,
    )
    .all()
    .map((row) => ({
      id: asString(row.id),
      siteKey: nullableString(row.site_key),
      slotKey: nullableString(row.slot_key),
      siteUrl: nullableString(row.site_url),
      name: asString(row.name),
      type: asString(row.type),
      noAdPolicy: asString(row.no_ad_policy),
      status: asString(row.status),
      assignedCreativeId: nullableString(row.assigned_creative_id),
      assignedCreativeName: nullableString(row.assigned_creative_name),
      assignedTrackingLinkId: nullableString(row.assigned_tracking_link_id),
      assignedTrackingSlug: nullableString(row.assigned_tracking_slug),
      requests: asNumber(row.requests),
      imageRequests: asNumber(row.image_requests),
      noAd: asNumber(row.no_ad),
      createdAt: asString(row.created_at),
      updatedAt: asString(row.updated_at),
    }));
}

function listCreatives(db: DatabaseLike): BannerCreativeRow[] {
  return db
    .prepare("SELECT * FROM creatives ORDER BY updated_at DESC")
    .all()
    .map((row) => ({
      id: asString(row.id),
      offerId: nullableString(row.offer_id),
      name: asString(row.name),
      imageUrl: asString(row.image_url),
      width: nullableNumber(row.width),
      height: nullableNumber(row.height),
      status: asString(row.status),
      policyStatus: asString(row.policy_status),
      createdAt: asString(row.created_at),
      updatedAt: asString(row.updated_at),
    }));
}

function listTrackingLinks(db: DatabaseLike): BannerTrackingLinkRow[] {
  return db
    .prepare("SELECT * FROM tracking_links ORDER BY updated_at DESC")
    .all()
    .map((row) => ({
      id: asString(row.id),
      slug: asString(row.slug),
      publicUrl: asString(row.public_url),
      offerId: nullableString(row.offer_id),
      offerName: nullableString(row.offer_name),
      status: asString(row.status),
      createdAt: asString(row.created_at),
      updatedAt: asString(row.updated_at),
    }));
}

function listSiteSummaries(db: DatabaseLike): BannerSiteSummaryRow[] {
  return db
    .prepare(
      `
      SELECT
        COALESCE(NULLIF(p.site_key, ''), 'legacy') AS site_key,
        MAX(p.site_url) AS site_url,
        COUNT(*) AS placements,
        SUM(CASE WHEN p.status = 'active' THEN 1 ELSE 0 END) AS active_placements,
        SUM(CASE WHEN active_assignments.active_assignments > 0 THEN 1 ELSE 0 END) AS assigned_placements,
        SUM(CASE WHEN COALESCE(active_assignments.active_assignments, 0) = 0 THEN 1 ELSE 0 END) AS unassigned_placements,
        COALESCE(SUM(event_counts.requests), 0) AS requests,
        COALESCE(SUM(event_counts.image_requests), 0) AS image_requests,
        COALESCE(SUM(event_counts.no_ad), 0) AS no_ad,
        COALESCE(SUM(event_counts.clicks), 0) AS clicks,
        MAX(p.updated_at) AS last_updated_at
      FROM placements p
      LEFT JOIN (
        SELECT placement_id, COUNT(*) AS active_assignments
        FROM assignments
        WHERE status = 'active'
        GROUP BY placement_id
      ) active_assignments ON active_assignments.placement_id = p.id
      LEFT JOIN (
        SELECT
          placement_id,
          SUM(CASE WHEN event_type = 'request' THEN 1 ELSE 0 END) AS requests,
          SUM(CASE WHEN event_type = 'image_request' THEN 1 ELSE 0 END) AS image_requests,
          SUM(CASE WHEN event_type = 'no_ad' THEN 1 ELSE 0 END) AS no_ad,
          SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) AS clicks
        FROM placement_event_ledger
        WHERE placement_id IS NOT NULL
        GROUP BY placement_id
      ) event_counts ON event_counts.placement_id = p.id
      GROUP BY COALESCE(NULLIF(p.site_key, ''), 'legacy')
      ORDER BY unassigned_placements DESC, last_updated_at DESC
    `,
    )
    .all()
    .map((row) => ({
      siteKey: asString(row.site_key),
      siteUrl: nullableString(row.site_url),
      placements: asNumber(row.placements),
      activePlacements: asNumber(row.active_placements),
      assignedPlacements: asNumber(row.assigned_placements),
      unassignedPlacements: asNumber(row.unassigned_placements),
      requests: asNumber(row.requests),
      imageRequests: asNumber(row.image_requests),
      noAd: asNumber(row.no_ad),
      clicks: asNumber(row.clicks),
      lastUpdatedAt: asString(row.last_updated_at),
    }));
}

function listAssignments(db: DatabaseLike): BannerAssignmentRow[] {
  return db
    .prepare(
      `
      SELECT
        a.id,
        a.placement_id,
        p.name AS placement_name,
        p.site_key AS placement_site_key,
        p.slot_key AS placement_slot_key,
        p.site_url AS placement_site_url,
        a.creative_id,
        c.name AS creative_name,
        a.tracking_link_id,
        tl.slug AS tracking_slug,
        a.weight,
        a.status,
        a.created_at,
        a.updated_at
      FROM assignments a
      LEFT JOIN placements p ON p.id = a.placement_id
      LEFT JOIN creatives c ON c.id = a.creative_id
      LEFT JOIN tracking_links tl ON tl.id = a.tracking_link_id
      ORDER BY a.updated_at DESC
      LIMIT 50
    `,
    )
    .all()
    .map((row) => ({
      id: asString(row.id),
      placementId: asString(row.placement_id),
      placementName: asString(row.placement_name),
      placementSiteKey: nullableString(row.placement_site_key),
      placementSlotKey: nullableString(row.placement_slot_key),
      placementSiteUrl: nullableString(row.placement_site_url),
      creativeId: nullableString(row.creative_id),
      creativeName: nullableString(row.creative_name),
      trackingLinkId: nullableString(row.tracking_link_id),
      trackingSlug: nullableString(row.tracking_slug),
      weight: asNumber(row.weight),
      status: asString(row.status),
      createdAt: asString(row.created_at),
      updatedAt: asString(row.updated_at),
    }));
}

function getRequiredRow(table: "placements" | "creatives" | "tracking_links", id: string): Row {
  const dbPath = getBannerDbPath();
  ensureSchemaWhenWritable(dbPath);
  const db = openDb(dbPath, true);
  try {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    if (!row) throw new Error(`${table} row not found: ${id}`);
    return row;
  } finally {
    db.close();
  }
}

function ensureColumn(db: DatabaseLike, table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (columns.some((row) => asString(row.name) === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function ensureSchemaWhenWritable(path: string): void {
  if (canAttemptWrite()) ensureSchema(path);
}

function normalizePlacementLookup(input: {
  placementId?: string | undefined;
  siteKey?: string | undefined;
  slotKey?: string | undefined;
  slot?: string | undefined;
}): { placementId: string | null; siteKey: string | null; slotKey: string | null } {
  const placementId = cleanOptionalText(input.placementId);
  if (placementId) return { placementId, siteKey: null, slotKey: null };
  const directSiteKey = cleanOptionalKey(input.siteKey, "Site key");
  const directSlotKey = cleanOptionalKey(input.slotKey, "Slot key");
  if (directSiteKey && directSlotKey) {
    return { placementId: null, siteKey: directSiteKey, slotKey: directSlotKey };
  }
  const slot = cleanOptionalText(input.slot);
  if (slot) {
    const [siteKey, ...slotParts] = slot.split(".");
    const slotKey = slotParts.join(".");
    return {
      placementId: null,
      siteKey: cleanOptionalKey(siteKey, "Site key"),
      slotKey: cleanOptionalKey(slotKey, "Slot key"),
    };
  }
  return { placementId: null, siteKey: null, slotKey: null };
}

function mapResolvedPlacement(row: Row): ResolvedBannerPlacement {
  return {
    assignmentId: asString(row.assignment_id),
    creative: {
      createdAt: asString(row.creative_created_at),
      height: nullableNumber(row.height),
      id: asString(row.creative_id),
      imageUrl: asString(row.image_url),
      name: asString(row.creative_name),
      offerId: nullableString(row.creative_offer_id),
      policyStatus: asString(row.policy_status),
      status: asString(row.creative_status),
      updatedAt: asString(row.creative_updated_at),
      width: nullableNumber(row.width),
    },
    placement: {
      assignedCreativeId: asString(row.creative_id),
      assignedCreativeName: asString(row.creative_name),
      assignedTrackingLinkId: asString(row.tracking_link_id),
      assignedTrackingSlug: asString(row.slug),
      createdAt: asString(row.placement_created_at),
      id: asString(row.placement_id),
      imageRequests: 0,
      name: asString(row.placement_name),
      noAd: 0,
      noAdPolicy: asString(row.no_ad_policy),
      requests: 0,
      siteKey: nullableString(row.site_key),
      siteUrl: nullableString(row.site_url),
      slotKey: nullableString(row.slot_key),
      status: asString(row.placement_status),
      type: asString(row.type),
      updatedAt: asString(row.placement_updated_at),
    },
    trackingLink: {
      createdAt: asString(row.tracking_created_at),
      id: asString(row.tracking_link_id),
      offerId: nullableString(row.tracking_offer_id),
      offerName: nullableString(row.offer_name),
      publicUrl: asString(row.public_url),
      slug: asString(row.slug),
      status: asString(row.tracking_status),
      updatedAt: asString(row.tracking_updated_at),
    },
  };
}

function recordPlacementEvent(input: {
  assignmentId?: string | undefined;
  eventType: "request" | "served" | "no_ad" | "image_request" | "click";
  metadata?: unknown;
  pageUrl?: string | undefined;
  placementId?: string | null | undefined;
  referrer?: string | undefined;
  trackingLinkId?: string | undefined;
}): void {
  if (!canAttemptWrite()) return;
  const dbPath = getBannerDbPath();
  ensureSchema(dbPath);
  const db = openDb(dbPath, false);
  try {
    db.prepare(
      `INSERT INTO placement_event_ledger
        (id, event_type, tracking_link_id, placement_id, assignment_id, page_url, referrer, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      `event_${randomUUID()}`,
      input.eventType,
      input.trackingLinkId ?? null,
      input.placementId ?? null,
      input.assignmentId ?? null,
      cleanOptionalText(input.pageUrl),
      cleanOptionalText(input.referrer),
      input.metadata == null ? null : JSON.stringify(input.metadata),
      new Date().toISOString(),
    );
  } finally {
    db.close();
  }
}

function scalar(db: DatabaseLike, sql: string): number {
  return asNumber(db.prepare(sql).get()?.value);
}

function canAttemptWrite(): boolean {
  return isBannerLibsqlEnabled() || !process.env.VERCEL || Boolean(process.env.MONETIZATION_BANNER_DB);
}

export function isBannerWriteDisabledError(error: unknown): boolean {
  return error instanceof Error && error.message === BANNER_WRITE_DISABLED_MESSAGE;
}

const BANNER_WRITE_DISABLED_MESSAGE =
  "Banner writes are disabled in this deployment. Configure MONETIZATION_BANNER_LIBSQL_URL/TOKEN or MONETIZATION_BANNER_DB.";

function assertWritable(): void {
  if (!canAttemptWrite()) throw new Error(BANNER_WRITE_DISABLED_MESSAGE);
}

function getBannerLibsqlConfig(): { url: string; authToken?: string } | null {
  const url = cleanOptionalText(process.env.MONETIZATION_BANNER_LIBSQL_URL);
  if (!url) return null;
  const authToken = cleanOptionalText(process.env.MONETIZATION_BANNER_LIBSQL_AUTH_TOKEN);
  return authToken ? { url, authToken } : { url };
}

function isBannerLibsqlEnabled(): boolean {
  return getBannerLibsqlConfig() !== null;
}

function createBannerLibsqlClient(): Client {
  const config = getBannerLibsqlConfig();
  if (!config) throw new Error(BANNER_WRITE_DISABLED_MESSAGE);
  return createClient(config);
}

function getBannerLibsqlLabel(): string {
  const config = getBannerLibsqlConfig();
  if (!config) return "";
  try {
    const url = new URL(config.url);
    return `${url.protocol}//${url.host || "local"}`;
  } catch {
    return "libsql:local";
  }
}

function cleanRequired(value: unknown, message: string): string {
  const text = asString(value).trim();
  if (!text) throw new Error(message);
  return text;
}

function cleanOptionalText(value: unknown): string | null {
  const text = asString(value).trim();
  return text || null;
}

function cleanUrl(value: unknown, message: string): string {
  const text = cleanRequired(value, message);
  try {
    const parsed = new URL(text);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("URL must use http or https.");
    }
    return parsed.toString();
  } catch {
    throw new Error("Valid http(s) URL is required.");
  }
}

function cleanSlug(value: unknown): string {
  const text = cleanRequired(value, "Slug is required.").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,80}$/.test(text)) {
    throw new Error("Slug must be 2-81 characters using lowercase letters, numbers, and hyphens.");
  }
  return text;
}

function cleanOptionalKey(value: unknown, label: string): string | null {
  const text = cleanOptionalText(value)?.toLowerCase() ?? null;
  if (!text) return null;
  if (!/^[a-z0-9][a-z0-9._-]{0,80}$/.test(text)) {
    throw new Error(`${label} must use lowercase letters, numbers, dots, underscores, or hyphens.`);
  }
  return text;
}

function cleanOptionalUrl(value: unknown): string | null {
  const text = cleanOptionalText(value);
  if (!text) return null;
  return cleanUrl(text, "Valid http(s) URL is required.");
}

function cleanChoice<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const text = asString(value || fallback);
  return allowed.includes(text as T) ? (text as T) : fallback;
}

function cleanOptionalInteger(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error("Expected a non-negative integer.");
  return parsed;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function nullableString(value: unknown): string | null {
  const text = asString(value);
  return text || null;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  return asNumber(value);
}
