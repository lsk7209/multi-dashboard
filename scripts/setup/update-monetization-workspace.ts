import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import YAML from "yaml";

type Row = Record<string, unknown>;

type DatabaseLike = {
  close: () => void;
  prepare: (sql: string) => {
    all: () => Row[];
    get: () => Row | undefined;
  };
};

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as {
  DatabaseSync: new (
    path: string,
    options?: { readOnly?: boolean },
  ) => DatabaseLike;
};

const DATA_DIR = resolve("data");
const SOURCE_DIR = resolve("data", "monetization");
const BANNER_DB_PATH =
  process.env.MONETIZATION_BANNER_DB ?? join(SOURCE_DIR, "ad-manage.db");
const AFFILIATE_SOURCE_DIR =
  process.env.MONETIZATION_AFFILIATE_DIR ?? join(SOURCE_DIR, "affiliates");

function asRecord(value: unknown): Row {
  return value && typeof value === "object" ? (value as Row) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asOptionalString(value: unknown): string | undefined {
  const text = asString(value).trim();
  return text || undefined;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readYaml(path: string): Row {
  if (!existsSync(path)) return {};
  return asRecord(YAML.parse(readFileSync(path, "utf8")));
}

function scalar(db: DatabaseLike, sql: string): number {
  try {
    return asNumber(db.prepare(sql).get()?.value);
  } catch {
    return 0;
  }
}

function tableExists(db: DatabaseLike, table: string): boolean {
  return (
    asNumber(
      db
        .prepare(
          `SELECT COUNT(*) AS value FROM sqlite_master WHERE type = 'table' AND name = '${table.replaceAll("'", "''")}'`,
        )
        .get()?.value,
    ) > 0
  );
}

function sourceTimestamp(path: string): string | undefined {
  return existsSync(path) ? statSync(path).mtime.toISOString() : undefined;
}

function loadBannerManagement() {
  const dbPath = resolve(BANNER_DB_PATH);
  const now = new Date().toISOString();
  const source = {
    sourceKind: "multi-dashboard-local" as const,
    workspacePath: resolve("."),
    dbPath,
    dbExists: existsSync(dbPath),
    dbUpdatedAt: sourceTimestamp(dbPath),
    sourceNote:
      "Standalone banner operations source owned by this multi-dashboard repository.",
  };

  const empty = {
    generatedAt: now,
    source,
    counts: {
      placements: 0,
      activePlacements: 0,
      creatives: 0,
      activeCreatives: 0,
      trackingLinks: 0,
      activeTrackingLinks: 0,
      assignments: 0,
      activeAssignments: 0,
      placementEvents: 0,
      requests: 0,
      served: 0,
      noAd: 0,
      imageRequests: 0,
    },
    noAdRate: null as number | null,
    eventBreakdown: [] as Array<{ type: string; count: number }>,
    topPlacements: [] as Array<{
      id: string;
      name: string;
      status: string;
      assignedCreativeName?: string;
      assignedTrackingSlug?: string;
      requests: number;
      imageRequests: number;
      noAd: number;
    }>,
  };

  if (!source.dbExists) {
    return empty;
  }

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const hasPlacementEvents = tableExists(db, "placement_event_ledger");
    const counts = {
      placements: tableExists(db, "placements") ? scalar(db, "SELECT COUNT(*) AS value FROM placements") : 0,
      activePlacements: tableExists(db, "placements")
        ? scalar(db, "SELECT COUNT(*) AS value FROM placements WHERE status = 'active'")
        : 0,
      creatives: tableExists(db, "creatives") ? scalar(db, "SELECT COUNT(*) AS value FROM creatives") : 0,
      activeCreatives: tableExists(db, "creatives")
        ? scalar(db, "SELECT COUNT(*) AS value FROM creatives WHERE status = 'active'")
        : 0,
      trackingLinks: tableExists(db, "tracking_links")
        ? scalar(db, "SELECT COUNT(*) AS value FROM tracking_links")
        : 0,
      activeTrackingLinks: tableExists(db, "tracking_links")
        ? scalar(db, "SELECT COUNT(*) AS value FROM tracking_links WHERE status = 'active'")
        : 0,
      assignments: tableExists(db, "assignments") ? scalar(db, "SELECT COUNT(*) AS value FROM assignments") : 0,
      activeAssignments: tableExists(db, "assignments")
        ? scalar(db, "SELECT COUNT(*) AS value FROM assignments WHERE status = 'active'")
        : 0,
      placementEvents: hasPlacementEvents
        ? scalar(db, "SELECT COUNT(*) AS value FROM placement_event_ledger")
        : 0,
      requests: hasPlacementEvents
        ? scalar(db, "SELECT COUNT(*) AS value FROM placement_event_ledger WHERE event_type = 'request'")
        : 0,
      served: hasPlacementEvents
        ? scalar(db, "SELECT COUNT(*) AS value FROM placement_event_ledger WHERE event_type = 'served'")
        : 0,
      noAd: hasPlacementEvents
        ? scalar(db, "SELECT COUNT(*) AS value FROM placement_event_ledger WHERE event_type = 'no_ad'")
        : 0,
      imageRequests: hasPlacementEvents
        ? scalar(db, "SELECT COUNT(*) AS value FROM placement_event_ledger WHERE event_type = 'image_request'")
        : 0,
    };
    const eventBreakdown = hasPlacementEvents
      ? db
          .prepare(
            "SELECT event_type AS type, COUNT(*) AS count FROM placement_event_ledger GROUP BY event_type ORDER BY count DESC",
          )
          .all()
          .map((row) => ({ type: asString(row.type), count: asNumber(row.count) }))
      : [];
    const topPlacements =
      tableExists(db, "placements") && tableExists(db, "assignments")
        ? db
            .prepare(
              `
              SELECT
                p.id,
                p.name,
                p.status,
                c.name AS assignedCreativeName,
                tl.slug AS assignedTrackingSlug,
                SUM(CASE WHEN e.event_type = 'request' THEN 1 ELSE 0 END) AS requests,
                SUM(CASE WHEN e.event_type = 'image_request' THEN 1 ELSE 0 END) AS imageRequests,
                SUM(CASE WHEN e.event_type = 'no_ad' THEN 1 ELSE 0 END) AS noAd
              FROM placements p
              LEFT JOIN assignments a ON a.placement_id = p.id AND a.status = 'active'
              LEFT JOIN creatives c ON c.id = a.creative_id
              LEFT JOIN tracking_links tl ON tl.id = a.tracking_link_id
              LEFT JOIN placement_event_ledger e ON e.placement_id = p.id
              GROUP BY p.id, p.name, p.status, c.name, tl.slug
              ORDER BY requests DESC, p.updated_at DESC
              LIMIT 12
            `,
            )
            .all()
            .map((row) => ({
              id: asString(row.id),
              name: asString(row.name),
              status: asString(row.status),
              assignedCreativeName: asOptionalString(row.assignedCreativeName),
              assignedTrackingSlug: asOptionalString(row.assignedTrackingSlug),
              requests: asNumber(row.requests),
              imageRequests: asNumber(row.imageRequests),
              noAd: asNumber(row.noAd),
            }))
        : [];

    return {
      ...empty,
      counts,
      noAdRate: counts.requests > 0 ? counts.noAd / counts.requests : null,
      eventBreakdown,
      topPlacements,
    };
  } finally {
    db.close();
  }
}

function normalizeProgram(value: unknown) {
  const program = asRecord(value);
  const usedBy = asRecord(program.used_by);
  const tracking = asRecord(program.tracking);
  const disclosure = asRecord(program.disclosure);
  const operations = asRecord(program.operations);
  return {
    id: asString(program.id),
    name: asString(program.name),
    status: asString(program.status),
    category: asString(program.category),
    platformUrl: asString(program.platform_url),
    countries: asArray(program.countries).map(asString).filter(Boolean),
    usedBySites: asArray(usedBy.sites).map(asString).filter(Boolean),
    usedByAppsInToss: asArray(usedBy.appsintoss).map(asString).filter(Boolean),
    publicTrackingLabel: asString(tracking.public_label),
    disclosureRequired: disclosure.required === true,
    disclosureNote: asString(disclosure.note),
    merchantTotalReported: asNumber(program.merchant_total_reported),
    merchantSnapshotFile: asString(program.merchant_snapshot_file),
    lastReviewed: asString(operations.last_reviewed),
    nextAction: asString(operations.next_action),
    notes: asString(program.notes),
  };
}

function normalizeCandidate(value: unknown) {
  const candidate = asRecord(value);
  return {
    category: asString(candidate.category),
    name: asString(candidate.name),
    commissionKrw: asNumber(candidate.commission_krw),
    previousMonthApplyRatePercent:
      candidate.previous_month_apply_rate_percent == null
        ? null
        : asNumber(candidate.previous_month_apply_rate_percent),
    previousMonthApprovalRatePercent:
      candidate.previous_month_approval_rate_percent == null
        ? null
        : asNumber(candidate.previous_month_approval_rate_percent),
    promotion: candidate.promotion === true,
    priorityNote: asString(candidate.priority_note),
  };
}

function loadAffiliateInventory() {
  const sourceDir = resolve(AFFILIATE_SOURCE_DIR);
  const inventoryPath = join(sourceDir, "inventory.yml");
  const merchantsPath = join(sourceDir, "ripplealba-merchants.yml");
  const analysisPath = join(sourceDir, "ripplealba-analysis.md");
  const inventory = readYaml(inventoryPath);
  const merchants = readYaml(merchantsPath);
  const programs = asArray(inventory.programs).map(normalizeProgram);
  const highValueCandidates = asArray(merchants.high_value_candidates_seen)
    .map(normalizeCandidate)
    .sort((a, b) => b.commissionKrw - a.commissionKrw);
  const merchantEntries = asArray(merchants.merchant_entries);
  const categoriesSeen = asArray(merchants.categories_seen).map(asString).filter(Boolean);

  return {
    generatedAt: new Date().toISOString(),
    source: {
      sourceKind: "multi-dashboard-local" as const,
      workspacePath: resolve("."),
      inventoryPath,
      merchantsPath,
      analysisPath,
      inventoryExists: existsSync(inventoryPath),
      merchantsExists: existsSync(merchantsPath),
      inventoryUpdatedAt: sourceTimestamp(inventoryPath),
      merchantsUpdatedAt: sourceTimestamp(merchantsPath),
      sourceNote:
        "Standalone affiliate operations source owned by this multi-dashboard repository.",
    },
    sourcePolicy: asString(inventory.source_policy || merchants.source_policy),
    lastManualSync: asString(inventory.last_manual_sync),
    programs,
    ripplealba: {
      programId: asString(merchants.affiliate_program_id),
      programName: asString(merchants.affiliate_program_name),
      merchantTotalReported: asNumber(merchants.merchant_total_reported),
      snapshotStartedAt: asString(merchants.snapshot_started_at),
      snapshotStatus: asString(merchants.snapshot_status),
      merchantEntryCount: merchantEntries.length,
      categoriesSeen,
      highValueCandidates,
      currentCaptureSummary: asRecord(merchants.current_capture_summary),
      priorityRules: asArray(merchants.priority_rules).map((rule) => {
        const item = asRecord(rule);
        return { id: asString(item.id), rule: asString(item.rule) };
      }),
    },
  };
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main() {
  const bannerPath = join(DATA_DIR, "banner-management.json");
  const affiliatePath = join(DATA_DIR, "affiliate-inventory.json");
  const banner = loadBannerManagement();
  const affiliate = loadAffiliateInventory();
  writeJson(bannerPath, banner);
  writeJson(affiliatePath, affiliate);
  console.log(
    JSON.stringify(
      {
        bannerPath,
        affiliatePath,
        bannerSource: banner.source.dbPath,
        affiliateSource: affiliate.source.inventoryPath,
        bannerGeneratedAt: banner.generatedAt,
        affiliateGeneratedAt: affiliate.generatedAt,
        placements: banner.counts.placements,
        affiliatePrograms: affiliate.programs.length,
        highValueCandidates: affiliate.ripplealba.highValueCandidates.length,
      },
      null,
      2,
    ),
  );
}

main();
