import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
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
const SITE_AUDIENCE_CLASSIFICATION_PATH =
  process.env.MONETIZATION_SITE_AUDIENCE_PATH ??
  join(AFFILIATE_SOURCE_DIR, "site-audience-classification.yml");
const SITES_CONFIG_PATH =
  process.env.MONETIZATION_SITES_CONFIG ?? resolve("scripts", "setup", "sites.yaml");
const COUPANG_CHANNEL_REGISTRY_PATH =
  process.env.COUPANG_CHANNEL_REGISTRY_PATH ??
  resolve("data", "coupang-channel-registry.json");

function asRecord(value: unknown): Row {
  return value && typeof value === "object" ? (value as Row) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asBoolean(value: unknown): boolean {
  return value === true;
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

function readJson(path: string): Row {
  if (!existsSync(path)) return {};
  return asRecord(JSON.parse(readFileSync(path, "utf8")));
}

function normalizeIntegrationSupport(value: unknown) {
  const support = asRecord(value);
  return {
    api: asString(support.api || "none documented"),
    feed: asString(support.feed || "none documented"),
    mcp: asString(support.mcp || "none documented"),
    cli: asString(support.cli || "none documented"),
    notes: asArray(support.notes).map(asString).filter(Boolean),
  };
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

export function normalizeProgram(value: unknown) {
  const program = asRecord(value);
  const usedBy = asRecord(program.used_by);
  const tracking = asRecord(program.tracking);
  const disclosure = asRecord(program.disclosure);
  const operations = asRecord(program.operations);
  return {
    id: asString(program.id),
    name: asString(program.name),
    status: asString(program.status),
    priority: asString(program.priority || "manual"),
    region: asString(program.region || "GLOBAL"),
    network: asString(program.network || program.name),
    category: asString(program.category),
    platformUrl: asString(program.platform_url),
    homepageUrl: asString(program.homepage_url || program.platform_url),
    applyUrl: asString(program.apply_url || program.platform_url),
    sourceUrl: asString(program.source_url || program.platform_url),
    countries: asArray(program.countries).map(asString).filter(Boolean),
    usedBySites: asArray(usedBy.sites).map(asString).filter(Boolean),
    usedByAppsInToss: asArray(usedBy.appsintoss).map(asString).filter(Boolean),
    publicTrackingLabel: asString(tracking.public_label),
    disclosureRequired: disclosure.required === true,
    disclosureNote: asString(disclosure.note),
    monetizationModel: asString(program.monetization_model),
    payoutModel: asString(program.payout_model || asRecord(program.payout).model),
    approvalDifficulty: asString(program.approval_difficulty || "manual"),
    bannerSuitability: asString(program.banner_suitability || "manual"),
    deepLinkTemplate: asString(program.deep_link_template),
    contentFit: asArray(program.content_fit).map(asString).filter(Boolean),
    recommendedSlots: asArray(program.recommended_slots).map(asString).filter(Boolean),
    allowedSites: asArray(program.allowed_sites).map(asString).filter(Boolean),
    risk: asString(program.risk || "medium"),
    complianceNotes: asArray(program.compliance_notes).map(asString).filter(Boolean),
    integrationSupport: normalizeIntegrationSupport(program.integration_support),
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

export function buildAffiliateItems(programs: Array<ReturnType<typeof normalizeProgram>>) {
  return programs
    .map((program) => ({
      id: `${program.id}-primary`,
      programId: program.id,
      title: `${program.name || program.id} monetization item`,
      status: program.status,
      priority: program.priority || "manual",
      region: program.region || "GLOBAL",
      network: program.network || program.name || program.id,
      category: program.category || "uncategorized",
      payoutModel: program.payoutModel || "Verify manually.",
      approvalDifficulty: program.approvalDifficulty || "manual",
      bannerSuitability: program.bannerSuitability || "manual",
      contentFit: program.contentFit,
      recommendedSlots: program.recommendedSlots,
      allowedSites: program.allowedSites,
      applyUrl: program.applyUrl || program.platformUrl,
      sourceUrl: program.sourceUrl || program.platformUrl,
      nextAction: program.nextAction || "Verify terms, apply, then create tracking link and banner creative.",
      risk: program.risk || "medium",
      integrationSupport: program.integrationSupport,
      complianceNotes:
        program.complianceNotes.length > 0
          ? program.complianceNotes
          : [program.disclosureNote].filter(Boolean),
    }))
    .sort(compareAffiliateItems);
}

export function buildAffiliateSiteRouting(input: {
  audienceConfig?: unknown;
  coupangRegistry?: unknown;
  sitesConfig?: unknown;
}) {
  const audienceConfig = asRecord(input.audienceConfig);
  const sitesConfig = asRecord(input.sitesConfig);
  const coupangRegistry = asRecord(input.coupangRegistry);
  const classifications = asArray(audienceConfig.classifications).map(asRecord);
  const sites = asArray(sitesConfig.sites).map(asRecord);
  const channels = asArray(coupangRegistry.channels).map(asRecord);
  const routeMap = new Map<string, ReturnType<typeof createSiteRoute>>();

  for (const site of sites) {
    if (!shouldIncludeSiteInRouting(site)) continue;
    upsertSiteRoute(
      routeMap,
      createSiteRoute({ classification: findSiteClassification(classifications, site), site }),
    );
  }

  for (const site of sites) {
    const affiliate = asRecord(site.affiliate);
    if (Object.keys(affiliate).length === 0) continue;
    upsertSiteRoute(
      routeMap,
      createSiteRoute({ classification: findSiteClassification(classifications, site), site }),
    );
  }

  for (const channel of channels) {
    const channelSiteId = asString(channel.siteId);
    const channelDomain = normalizeDomain(asString(channel.domain));
    const matchingSite =
      sites.find((site) => asString(site.id) === channelSiteId) ??
      sites.find((site) => normalizeDomain(asString(site.url)) === channelDomain);

    upsertSiteRoute(
      routeMap,
      createSiteRoute({
        channel,
        classification: findSiteClassification(classifications, matchingSite, channel),
        site: matchingSite,
      }),
    );
  }

  return [...routeMap.values()].sort(compareSiteRoutes);
}

function shouldIncludeSiteInRouting(site: Row): boolean {
  return asBoolean(site.enabled) && asBoolean(site.monetization);
}

function findSiteClassification(
  classifications: Row[],
  site?: Row,
  channel?: Row,
): Row | undefined {
  const siteId = asString(site?.id || channel?.siteId);
  const domain = normalizeDomain(asString(site?.url || channel?.domain));
  return classifications.find((classification) => {
    return (
      asString(classification.site_id) === siteId ||
      normalizeDomain(asString(classification.domain)) === domain
    );
  });
}

function createSiteRoute({
  channel,
  classification,
  site,
}: {
  channel?: Row;
  classification?: Row;
  site?: Row;
}) {
  const affiliate = asRecord(site?.affiliate);
  const channelStatus = asString(channel?.status);
  const domain =
    normalizeDomain(asString(site?.url)) ||
    normalizeDomain(asString(channel?.domain)) ||
    normalizeDomain(asString(site?.gscSiteUrl));
  const blockedPrograms = uniqueStrings([
    ...asArray(classification?.blocked_programs).map(asString),
    ...asArray(affiliate.blockedPrograms).map(asString),
  ]);
  const activePrograms = uniqueStrings([
    ...asArray(classification?.active_programs).map(asString),
    ...asArray(affiliate.activePrograms).map(asString),
  ]);
  const coupangRegistered =
    channelStatus === "approved" ||
    channelStatus === "registered" ||
    channelStatus === "screenshot_submitted";

  if (coupangRegistered && !blockedPrograms.includes("coupang-partners")) {
    activePrograms.push("coupang-partners");
  }

  if (
    !coupangRegistered &&
    !activePrograms.includes("coupang-partners") &&
    !blockedPrograms.includes("coupang-partners")
  ) {
    blockedPrograms.push("coupang-partners");
  }

  return {
    siteId: asString(site?.id || channel?.siteId),
    name: asString(site?.name || channel?.domain),
    domain,
    enabled: site ? asBoolean(site.enabled) : true,
    platform: asString(site?.platform || "unknown"),
    monetization: site ? asBoolean(site.monetization) : true,
    targetMarket: asString(
      affiliate.targetMarket ||
        classification?.target_market ||
        (channel ? "kr" : inferTargetMarketFromDomain(domain)),
    ),
    primaryAudience: asString(
      affiliate.primaryAudience ||
        classification?.primary_audience ||
        (channel ? "Korean readers on registered Coupang channel" : ""),
    ),
    activePrograms: uniqueStrings(activePrograms),
    blockedPrograms,
    coupangExposure: asString(
      affiliate.coupangExposure ||
        classification?.coupang_exposure ||
        (coupangRegistered ? "registered_channel_allowed" : "channel_not_registered_blocked"),
    ),
    coupangChannelStatus: channelStatus || "not_listed",
    coupangRegistered,
    notes: uniqueStrings([
      asString(classification?.notes),
      asString(affiliate.notes),
      asString(channel?.notes),
    ])
      .filter(Boolean)
      .join(" "),
    source: uniqueStrings([
      inferTargetMarketFromDomain(domain) === "kr" ? ".kr-domain-heuristic" : "",
      classification ? "site-audience-classification.yml" : "",
      site ? "sites.yaml" : "",
      channel ? "coupang-channel-registry.json" : "",
    ]),
  };
}

function inferTargetMarketFromDomain(domain: string): string {
  return domain.endsWith(".kr") ? "kr" : "unclassified";
}

function upsertSiteRoute(
  routeMap: Map<string, ReturnType<typeof createSiteRoute>>,
  route: ReturnType<typeof createSiteRoute>,
) {
  const key = route.domain || route.siteId;
  const existing = routeMap.get(key);
  if (!existing) {
    routeMap.set(key, route);
    return;
  }

  const activePrograms = uniqueStrings([
    ...existing.activePrograms,
    ...route.activePrograms,
  ]);
  const blockedPrograms = uniqueStrings([
    ...existing.blockedPrograms,
    ...route.blockedPrograms,
  ]).filter((programId) => !activePrograms.includes(programId));

  routeMap.set(key, {
    ...existing,
    ...route,
    activePrograms,
    blockedPrograms,
    notes: uniqueStrings([existing.notes, route.notes]).filter(Boolean).join(" "),
    source: uniqueStrings([...existing.source, ...route.source]),
  });
}

function compareSiteRoutes(
  a: ReturnType<typeof createSiteRoute>,
  b: ReturnType<typeof createSiteRoute>,
): number {
  return (
    priorityRank(targetMarketRankKey(a.targetMarket)) -
      priorityRank(targetMarketRankKey(b.targetMarket)) ||
    a.domain.localeCompare(b.domain)
  );
}

function targetMarketRankKey(targetMarket: string): string {
  if (targetMarket === "kr") return "p0";
  if (targetMarket === "global_en") return "p1";
  return "manual";
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function compareAffiliateItems(
  a: { priority: string; risk: string; title: string },
  b: { priority: string; risk: string; title: string },
): number {
  return (
    priorityRank(a.priority) - priorityRank(b.priority) ||
    riskRank(a.risk) - riskRank(b.risk) ||
    a.title.localeCompare(b.title)
  );
}

function priorityRank(priority: string): number {
  if (priority === "p0") return 0;
  if (priority === "p1") return 1;
  if (priority === "p2") return 2;
  return 9;
}

function riskRank(risk: string): number {
  if (risk === "low") return 0;
  if (risk === "medium") return 1;
  if (risk === "high") return 2;
  return 3;
}

function normalizePlaybook(value: unknown) {
  const playbook = asRecord(value);
  return {
    disclosureTemplateKo: asString(playbook.disclosure_template_ko),
    disclosureTemplateEn: asString(playbook.disclosure_template_en),
    defaultRel: asString(playbook.default_rel || "sponsored nofollow"),
    bannerSlotStrategy: asArray(playbook.banner_slot_strategy).map((strategy) => {
      const item = asRecord(strategy);
      return {
        slot: asString(item.slot),
        purpose: asString(item.purpose),
        fit: asString(item.fit),
      };
    }),
    priorityRules: asArray(playbook.priority_rules).map((rule) => {
      const item = asRecord(rule);
      return { id: asString(item.id), rule: asString(item.rule) };
    }),
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
  const affiliateItems = buildAffiliateItems(programs);
  const siteRouting = buildAffiliateSiteRouting({
    audienceConfig: readYaml(SITE_AUDIENCE_CLASSIFICATION_PATH),
    coupangRegistry: readJson(COUPANG_CHANNEL_REGISTRY_PATH),
    sitesConfig: readYaml(SITES_CONFIG_PATH),
  });
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
    affiliateItems,
    siteRouting,
    playbook: normalizePlaybook(inventory.playbook),
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
        affiliateItems: affiliate.affiliateItems.length,
        highValueCandidates: affiliate.ripplealba.highValueCandidates.length,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
