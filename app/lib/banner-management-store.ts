import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

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
  creativeId: string | null;
  creativeName: string | null;
  trackingLinkId: string | null;
  trackingSlug: string | null;
  weight: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BannerManagementState {
  dbPath: string;
  dbExists: boolean;
  dbUpdatedAt: string | null;
  writable: boolean;
  persistenceNote: string;
  placements: BannerPlacementRow[];
  creatives: BannerCreativeRow[];
  trackingLinks: BannerTrackingLinkRow[];
  assignments: BannerAssignmentRow[];
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
  };
  noAdRate: number | null;
  eventBreakdown: Array<{ type: string; count: number }>;
  topPlacements: Array<{
    id: string;
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

export function getBannerManagementState(): BannerManagementState {
  const dbPath = getBannerDbPath();
  ensureSchema(dbPath);
  const db = openDb(dbPath, true);
  try {
    return {
      dbPath,
      dbExists: existsSync(dbPath),
      dbUpdatedAt: existsSync(dbPath) ? statSync(dbPath).mtime.toISOString() : null,
      writable: canAttemptWrite(),
      persistenceNote: getBannerPersistenceNote(),
      placements: listPlacements(db),
      creatives: listCreatives(db),
      trackingLinks: listTrackingLinks(db),
      assignments: listAssignments(db),
    };
  } finally {
    db.close();
  }
}

export function createBannerPlacement(input: {
  name: string;
  type?: string | undefined;
  noAdPolicy?: string | undefined;
  status?: string | undefined;
}): BannerManagementState {
  assertWritable();
  const name = cleanRequired(input.name, "Placement name is required.");
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
        (id, name, type, no_ad_policy, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(`placement_${randomUUID()}`, name, type, noAdPolicy, status, now, now);
  } finally {
    db.close();
  }
  refreshBannerSnapshot();
  return getBannerManagementState();
}

export function updateBannerPlacement(input: {
  id: string;
  name?: string | undefined;
  type?: string | undefined;
  noAdPolicy?: string | undefined;
  status?: string | undefined;
}): BannerManagementState {
  assertWritable();
  const id = cleanRequired(input.id, "Placement id is required.");
  const current = getRequiredRow("placements", id);
  const name = input.name == null ? asString(current.name) : cleanRequired(input.name, "Placement name is required.");
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
      "UPDATE placements SET name = ?, type = ?, no_ad_policy = ?, status = ?, updated_at = ? WHERE id = ?",
    ).run(name, type, noAdPolicy, status, new Date().toISOString(), id);
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
    };
    const eventBreakdown = db
      .prepare("SELECT event_type AS type, COUNT(*) AS count FROM placement_event_ledger GROUP BY event_type ORDER BY count DESC")
      .all()
      .map((row) => ({ type: asString(row.type), count: asNumber(row.count) }));
    const topPlacements = listPlacements(db).slice(0, 12).map((placement) => ({
      id: placement.id,
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

function listAssignments(db: DatabaseLike): BannerAssignmentRow[] {
  return db
    .prepare(
      `
      SELECT
        a.id,
        a.placement_id,
        p.name AS placement_name,
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
  ensureSchema(dbPath);
  const db = openDb(dbPath, true);
  try {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    if (!row) throw new Error(`${table} row not found: ${id}`);
    return row;
  } finally {
    db.close();
  }
}

function scalar(db: DatabaseLike, sql: string): number {
  return asNumber(db.prepare(sql).get()?.value);
}

function canAttemptWrite(): boolean {
  return !process.env.VERCEL || Boolean(process.env.MONETIZATION_BANNER_DB);
}

export function isBannerWriteDisabledError(error: unknown): boolean {
  return error instanceof Error && error.message === BANNER_WRITE_DISABLED_MESSAGE;
}

const BANNER_WRITE_DISABLED_MESSAGE =
  "Banner writes are disabled in this deployment. Configure MONETIZATION_BANNER_DB to a writable persistent SQLite path.";

function assertWritable(): void {
  if (!canAttemptWrite()) throw new Error(BANNER_WRITE_DISABLED_MESSAGE);
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
