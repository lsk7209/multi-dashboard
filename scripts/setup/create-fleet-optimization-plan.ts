import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DATA_DIR = "data";
const DOCS_DIR = join("docs", "work-orders");
const ADSENSE_QUEUE_PREFIX = "adsense-remediation-queue-";
const DATE_SUFFIX = /\d{4}-\d{2}-\d{2}\.json$/;

type ActionType =
  | "adsense_proof"
  | "adsense_console"
  | "telemetry"
  | "technical_seo"
  | "indexing"
  | "title_handoff"
  | "content_handoff";

interface StatsSnapshot {
  generatedAt?: unknown;
  dateRanges?: unknown;
  stats?: StatsRow[];
}

interface StatsRow {
  id?: unknown;
  name?: unknown;
  url?: unknown;
  monetization?: unknown;
  last30Days?: {
    activeUsers?: unknown;
    sessions?: unknown;
    screenPageViews?: unknown;
  };
  gscLast30Days?: {
    clicks?: unknown;
    impressions?: unknown;
    ctr?: unknown;
    position?: unknown;
  };
  ga4Status?: unknown;
  gscStatus?: unknown;
  adsenseStatus?: unknown;
  adsenseCollectorStatus?: unknown;
  adsTxtStatus?: unknown;
  adsTxtCollectorStatus?: unknown;
  sitemapWarnings?: unknown;
  sitemapErrors?: unknown;
  sitemapIsPending?: unknown;
  sitemapLastSubmittedAt?: unknown;
  sitemapPath?: unknown;
}

interface AdsenseQueueArtifact {
  generatedAt?: unknown;
  collectorSnapshot?: unknown;
  summary?: Record<string, unknown>;
  lanes?: Record<string, AdsenseQueueItem[]>;
}

interface AdsenseQueueItem {
  siteId?: unknown;
  host?: unknown;
  lane?: unknown;
  priority?: unknown;
  statuses?: {
    adsenseStatus?: unknown;
    adsTxtStatus?: unknown;
    gscStatus?: unknown;
    ga4Status?: unknown;
  };
  stopCondition?: unknown;
  requiredEvidence?: unknown;
}

interface OptimizationCandidate {
  rank: number;
  siteId: string;
  host: string;
  url: string;
  actionType: ActionType;
  tier: "T1" | "T2" | "T3";
  confidence: "high" | "medium" | "low";
  reason: string;
  metrics: {
    gscImpressions30d: number;
    gscClicks30d: number;
    gscCtr30d: number;
    gscPosition30d: number;
    ga4ActiveUsers30d: number;
  };
  evidence: string[];
  nextAction: string;
}

interface FleetOptimizationPlan {
  generatedAt: string;
  dashboardEvidence: {
    statsPath: string;
    snapshotTimestamp: string;
    refreshCommand: string;
    refreshFailedSources: string[];
    connectorStatus: Record<string, Record<string, number>>;
    insightFields: string[];
  };
  summary: {
    siteCount: number;
    adsenseProblemRows: number;
    seoCandidateCount: number;
    titleHandoffCount: number;
    indexingCount: number;
    technicalSeoCount: number;
    contentHandoffCount: number;
  };
  adsenseQueue: {
    artifactPath: string | null;
    collectorSnapshot: string;
    summary: Record<string, unknown>;
    nextItems: Array<{
      priority: number;
      siteId: string;
      host: string;
      lane: string;
      actionType: ActionType;
      stopCondition: string;
    }>;
  };
  seoCandidates: OptimizationCandidate[];
  stopConditions: string[];
}

function main() {
  const snapshot = readJson<StatsSnapshot>(join(DATA_DIR, "site-stats.json"));
  const snapshotTimestamp = requireString(
    snapshot.generatedAt,
    "data/site-stats.json generatedAt",
  );
  const rows = (snapshot.stats ?? []).map((row) =>
    normalizeRow(row, snapshotTimestamp),
  );
  const collectorSnapshot = `data/site-stats.json generatedAt=${snapshotTimestamp}`;
  const queuePath = currentArtifactPath(
    DATA_DIR,
    ADSENSE_QUEUE_PREFIX,
    collectorSnapshot,
  );
  const adsenseQueue = queuePath
    ? readJson<AdsenseQueueArtifact>(queuePath)
    : undefined;
  const seoCandidates = buildSeoCandidates(rows);
  const plan = makePlan({
    snapshotTimestamp,
    rows,
    queuePath,
    adsenseQueue,
    seoCandidates,
  });
  const date = parseCliOptions(process.argv.slice(2)).date;
  const jsonPath = join(DATA_DIR, `fleet-optimization-plan-${date}.json`);
  const mdPath = join(DOCS_DIR, `fleet-optimization-plan-${date}.md`);

  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(DOCS_DIR, { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(plan, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(plan));

  console.log(
    [
      `Wrote ${jsonPath} and ${mdPath}.`,
      `snapshot=${snapshotTimestamp}`,
      `seoCandidates=${plan.summary.seoCandidateCount}`,
      `adsenseProblemRows=${plan.summary.adsenseProblemRows}`,
    ].join(" "),
  );
}

function makePlan(input: {
  snapshotTimestamp: string;
  rows: ReturnType<typeof normalizeRow>[];
  queuePath: string | undefined;
  adsenseQueue: AdsenseQueueArtifact | undefined;
  seoCandidates: OptimizationCandidate[];
}): FleetOptimizationPlan {
  const nextItems = flattenAdsenseQueue(input.adsenseQueue);
  return {
    generatedAt: new Date().toISOString(),
    dashboardEvidence: {
      statsPath: "D:\\web\\multi-dashboard\\data\\site-stats.json",
      snapshotTimestamp: input.snapshotTimestamp,
      refreshCommand: "pnpm stats:update",
      refreshFailedSources: buildRefreshFailedSources(input.rows, {
        adsenseQueueMissing: !input.queuePath,
      }),
      connectorStatus: summarizeConnectorStatus(input.rows),
      insightFields: [
        "stats[].gscLast30Days",
        "stats[].last30Days",
        "stats[].adsenseStatus",
        "stats[].adsenseCollectorStatus",
        "stats[].adsTxtStatus",
        "stats[].adsTxtCollectorStatus",
        "stats[].gscStatus",
        "stats[].ga4Status",
        "stats[].sitemapWarnings",
        "data/adsense-remediation-queue-*.json",
      ],
    },
    summary: {
      siteCount: input.rows.length,
      adsenseProblemRows: numberValue(input.adsenseQueue?.summary?.problemRows),
      seoCandidateCount: input.seoCandidates.length,
      titleHandoffCount: input.seoCandidates.filter(
        (candidate) => candidate.actionType === "title_handoff",
      ).length,
      indexingCount: input.seoCandidates.filter(
        (candidate) => candidate.actionType === "indexing",
      ).length,
      technicalSeoCount: input.seoCandidates.filter(
        (candidate) => candidate.actionType === "technical_seo",
      ).length,
      contentHandoffCount: input.seoCandidates.filter(
        (candidate) => candidate.actionType === "content_handoff",
      ).length,
    },
    adsenseQueue: {
      artifactPath: input.queuePath ?? null,
      collectorSnapshot: stringValue(input.adsenseQueue?.collectorSnapshot),
      summary: input.adsenseQueue?.summary ?? {},
      nextItems,
    },
    seoCandidates: input.seoCandidates,
    stopConditions: [
      "Do not submit AdSense review while console state is unknown or raw loader proof is missing.",
      "Do not treat local collector timeout as proof of site-level AdSense breakage.",
      "Do not edit article titles or bodies from this technical plan; route those to title/content handoff.",
      "Do not use this plan as fresh prioritization if pnpm stats:update has not completed cleanly.",
      "Do not run sitemap submission, production deployment, or WordPress mutations from this plan without an explicit apply step and rollback path.",
    ],
  };
}

function buildSeoCandidates(
  rows: ReturnType<typeof normalizeRow>[],
): OptimizationCandidate[] {
  const candidates = rows
    .flatMap((row) => classifySeoCandidate(row))
    .sort((a, b) => candidateScore(b) - candidateScore(a))
    .slice(0, 20)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
  return candidates;
}

function classifySeoCandidate(
  row: ReturnType<typeof normalizeRow>,
): OptimizationCandidate[] {
  const candidates: OptimizationCandidate[] = [];
  const hasSitemapIssue =
    row.sitemapWarnings > 0 ||
    row.sitemapErrors > 0 ||
    row.sitemapIsPending ||
    row.gscStatus !== "ok";
  const highImpressions = row.gscImpressions30d >= 500;
  const lowCtr = row.gscImpressions30d >= 300 && row.gscCtr30d < 0.025;
  const rankingNearPageOne =
    row.gscPosition30d > 0 && row.gscPosition30d <= 15;
  const weakPosition =
    row.gscImpressions30d >= 300 && row.gscPosition30d > 20;

  if (hasSitemapIssue) {
    candidates.push(makeCandidate(row, "indexing", "T2", "high"));
  }
  if (lowCtr && rankingNearPageOne) {
    candidates.push(makeCandidate(row, "title_handoff", "T3", "high"));
  }
  if (weakPosition) {
    candidates.push(makeCandidate(row, "technical_seo", "T2", "medium"));
  }
  if (highImpressions && row.ga4ActiveUsers30d < 100 && !hasSitemapIssue) {
    candidates.push(makeCandidate(row, "content_handoff", "T3", "medium"));
  }

  return candidates;
}

function makeCandidate(
  row: ReturnType<typeof normalizeRow>,
  actionType: ActionType,
  tier: "T1" | "T2" | "T3",
  confidence: "high" | "medium" | "low",
): OptimizationCandidate {
  return {
    rank: 0,
    siteId: row.siteId,
    host: row.host,
    url: row.url,
    actionType,
    tier,
    confidence,
    reason: reasonFor(row, actionType),
    metrics: {
      gscImpressions30d: row.gscImpressions30d,
      gscClicks30d: row.gscClicks30d,
      gscCtr30d: row.gscCtr30d,
      gscPosition30d: row.gscPosition30d,
      ga4ActiveUsers30d: row.ga4ActiveUsers30d,
    },
    evidence: [
      "data/site-stats.json",
      `snapshot=${row.snapshotTimestamp}`,
      `gscStatus=${row.gscStatus}`,
      `adsenseStatus=${row.adsenseStatus}`,
      `adsTxtStatus=${row.adsTxtStatus}`,
      `sitemapWarnings=${row.sitemapWarnings}`,
      `sitemapErrors=${row.sitemapErrors}`,
    ],
    nextAction: nextActionFor(actionType),
  };
}

function reasonFor(
  row: ReturnType<typeof normalizeRow>,
  actionType: ActionType,
): string {
  if (actionType === "indexing") {
    return `Indexing risk: gscStatus=${row.gscStatus}, sitemapWarnings=${row.sitemapWarnings}, sitemapErrors=${row.sitemapErrors}, sitemapPending=${row.sitemapIsPending}.`;
  }
  if (actionType === "title_handoff") {
    return `High-impression low-CTR opportunity: ${row.gscImpressions30d} impressions, ${(row.gscCtr30d * 100).toFixed(2)}% CTR, average position ${row.gscPosition30d.toFixed(2)}.`;
  }
  if (actionType === "technical_seo") {
    return `Impressions exist but average position is weak: ${row.gscImpressions30d} impressions at position ${row.gscPosition30d.toFixed(2)}.`;
  }
  if (actionType === "content_handoff") {
    return `Search exposure is present but GA4 users are low: ${row.gscImpressions30d} impressions and ${row.ga4ActiveUsers30d} users.`;
  }
  return "AdSense approval proof or console classification is required.";
}

function nextActionFor(actionType: ActionType): string {
  switch (actionType) {
    case "indexing":
      return "Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed.";
    case "title_handoff":
      return "Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan.";
    case "technical_seo":
      return "Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability.";
    case "content_handoff":
      return "Send to persona/content workflow for intent alignment, source quality, and helpful-content review.";
    case "adsense_proof":
      return "Collect non-blocked ads.txt, robots, sitemap, and raw loader proof before console review.";
    case "adsense_console":
      return "Check AdSense console site status, ownership, policy state, and approved-root subdomain scope.";
    case "telemetry":
      return "Repair the analytics/Search Console binding, then rerun pnpm stats:update to confirm the connector returns ok.";
  }
}

function flattenAdsenseQueue(
  artifact: AdsenseQueueArtifact | undefined,
): FleetOptimizationPlan["adsenseQueue"]["nextItems"] {
  const lanes = artifact?.lanes ?? {};
  const items: FleetOptimizationPlan["adsenseQueue"]["nextItems"] = [];
  for (const [lane, laneItems] of Object.entries(lanes)) {
    for (const item of laneItems ?? []) {
      items.push({
        priority: numberValue(item.priority),
        siteId: stringValue(item.siteId),
        host: stringValue(item.host),
        lane,
        actionType: actionTypeForAdsenseLane(lane),
        stopCondition: stringValue(item.stopCondition),
      });
    }
  }
  return items.sort(
    (a, b) => a.priority - b.priority || a.host.localeCompare(b.host),
  );
}

function actionTypeForAdsenseLane(lane: string): ActionType {
  if (lane === "approved_root_subdomain_scope") {
    return "adsense_console";
  }
  if (lane === "gsc_auth_telemetry" || lane === "ga4_config_telemetry") {
    return "telemetry";
  }
  return "adsense_proof";
}

function normalizeRow(row: StatsRow, snapshotTimestamp: string) {
  const url = stringValue(row.url);
  return {
    snapshotTimestamp,
    siteId: stringValue(row.id),
    name: stringValue(row.name),
    url,
    host: hostFromUrl(url),
    monetization: row.monetization,
    ga4ActiveUsers30d: numberValue(row.last30Days?.activeUsers),
    gscClicks30d: numberValue(row.gscLast30Days?.clicks),
    gscImpressions30d: numberValue(row.gscLast30Days?.impressions),
    gscCtr30d: numberValue(row.gscLast30Days?.ctr),
    gscPosition30d: numberValue(row.gscLast30Days?.position),
    ga4Status: stringValue(row.ga4Status),
    gscStatus: stringValue(row.gscStatus),
    adsenseStatus: stringValue(row.adsenseStatus),
    adsenseCollectorStatus: stringValue(row.adsenseCollectorStatus),
    adsTxtStatus: stringValue(row.adsTxtStatus),
    adsTxtCollectorStatus: stringValue(row.adsTxtCollectorStatus),
    sitemapWarnings: numberValue(row.sitemapWarnings),
    sitemapErrors: numberValue(row.sitemapErrors),
    sitemapIsPending: Boolean(row.sitemapIsPending),
    sitemapLastSubmittedAt: stringValue(row.sitemapLastSubmittedAt),
    sitemapPath: stringValue(row.sitemapPath),
  };
}

function candidateScore(candidate: OptimizationCandidate): number {
  const impact =
    candidate.metrics.gscImpressions30d +
    candidate.metrics.ga4ActiveUsers30d * 0.5;
  const actionWeight: Record<ActionType, number> = {
    adsense_proof: 1.6,
    adsense_console: 1.4,
    telemetry: 0.8,
    indexing: 1.35,
    technical_seo: 1.2,
    title_handoff: 1.1,
    content_handoff: 1,
  };
  return impact * actionWeight[candidate.actionType];
}

export function summarizeConnectorStatus(
  rows: Array<Record<string, unknown>>,
): Record<string, Record<string, number>> {
  const fields = [
    "ga4Status",
    "gscStatus",
    "adsenseStatus",
    "adsenseCollectorStatus",
    "adsTxtStatus",
    "adsTxtCollectorStatus",
  ];
  const summary: Record<string, Record<string, number>> = {};
  for (const field of fields) {
    summary[field] = {};
  }

  for (const row of rows) {
    for (const field of fields) {
      const status = connectorStatusValue(row, field);
      const fieldSummary = summary[field];
      if (!fieldSummary) {
        continue;
      }
      fieldSummary[status] = (fieldSummary[status] ?? 0) + 1;
    }
  }

  return summary;
}

export function buildRefreshFailedSources(
  rows: Array<Record<string, unknown>>,
  options: { adsenseQueueMissing?: boolean } = {},
): string[] {
  const fields: Array<{ source: string; field: string }> = [
    { source: "ga4", field: "ga4Status" },
    { source: "gsc", field: "gscStatus" },
    { source: "adsense", field: "adsenseStatus" },
    { source: "adsense_collector", field: "adsenseCollectorStatus" },
    { source: "ads_txt", field: "adsTxtStatus" },
    { source: "ads_txt_collector", field: "adsTxtCollectorStatus" },
  ];
  const failed: string[] = [];

  for (const { source, field } of fields) {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const status = connectorStatusValue(row, field);
      if (isSuccessfulOrSkippedStatus(status)) {
        continue;
      }
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    for (const [status, count] of [...counts.entries()].sort()) {
      failed.push(`skipped_refresh_failed:${source}:${status}:${count}`);
    }
  }

  // Sitemap errors are fresh Search Console findings, not collector failures.
  // Keep them in the site-level indexing/technical SEO queue; making them a
  // dashboard-refresh failure prevents the dashboard from presenting the
  // evidence needed to resolve them.
  if (options.adsenseQueueMissing === true && rows.some((row) => row.monetization !== false)) {
    failed.push("skipped_refresh_failed:adsense_queue:missing_current:1");
  }

  return failed;
}

function connectorStatusValue(row: Record<string, unknown>, field: string): string {
  if (
    row.monetization === false &&
    (field.startsWith("adsense") || field.startsWith("adsTxt"))
  ) {
    return "disabled";
  }
  const value = row[field];
  return typeof value === "string" && value.length > 0 ? value : "unknown";
}

function isSuccessfulOrSkippedStatus(status: string): boolean {
  return status === "ok" || status === "disabled" || status === "not_applicable";
}

function renderMarkdown(plan: FleetOptimizationPlan): string {
  return `# Fleet Optimization Plan - ${plan.dashboardEvidence.snapshotTimestamp}

## Verdict

This is a local, non-mutating plan for AdSense approval optimization and Google search growth work. It does not submit AdSense reviews, edit production WordPress/Next.js sites, submit sitemaps, deploy, or rewrite article content.

## Dashboard Evidence

- Snapshot: \`${plan.dashboardEvidence.snapshotTimestamp}\`
- Stats path: \`${plan.dashboardEvidence.statsPath}\`
- Refresh command: \`${plan.dashboardEvidence.refreshCommand}\`
- Refresh failed sources: ${plan.dashboardEvidence.refreshFailedSources.length > 0 ? plan.dashboardEvidence.refreshFailedSources.map((source) => `\`${source}\``).join(", ") : "`none`"}

## Connector Status

${renderConnectorStatus(plan.dashboardEvidence.connectorStatus)}

## Summary

| Metric | Count |
|---|---:|
| Sites | ${plan.summary.siteCount} |
| AdSense problem rows | ${plan.summary.adsenseProblemRows} |
| SEO candidates | ${plan.summary.seoCandidateCount} |
| Title handoff | ${plan.summary.titleHandoffCount} |
| Indexing | ${plan.summary.indexingCount} |
| Technical SEO | ${plan.summary.technicalSeoCount} |
| Content handoff | ${plan.summary.contentHandoffCount} |

## AdSense Approval Queue

Source: ${plan.adsenseQueue.artifactPath ? `\`${plan.adsenseQueue.artifactPath}\`` : "`missing`"}

| Priority | Site | Lane | Action | Stop condition |
|---:|---|---|---|---|
${plan.adsenseQueue.nextItems
  .map(
    (item) =>
      `| ${item.priority} | \`${item.host}\` | \`${item.lane}\` | \`${item.actionType}\` | ${item.stopCondition} |`,
  )
  .join("\n")}

## Google Search / Content Queue

| Rank | Site | Action | Tier | Evidence | Next action |
|---:|---|---|---|---|---|
${plan.seoCandidates
  .map(
    (candidate) =>
      `| ${candidate.rank} | \`${candidate.host}\` | \`${candidate.actionType}\` | ${candidate.tier} | ${candidate.metrics.gscImpressions30d} impr / ${(candidate.metrics.gscCtr30d * 100).toFixed(2)}% CTR / pos ${candidate.metrics.gscPosition30d.toFixed(2)} / ${candidate.metrics.ga4ActiveUsers30d} users | ${candidate.nextAction} |`,
  )
  .join("\n")}

## Stop Conditions

${plan.stopConditions.map((condition) => `- ${condition}`).join("\n")}
`;
}

function renderConnectorStatus(
  connectorStatus: Record<string, Record<string, number>>,
): string {
  const rows = Object.entries(connectorStatus).flatMap(([connector, statuses]) =>
    Object.entries(statuses)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([status, count]) => `| \`${connector}\` | \`${status}\` | ${count} |`),
  );
  if (rows.length === 0) {
    return "No connector status rows.\n";
  }
  return `| Connector | Status | Count |
|---|---|---:|
${rows.join("\n")}`;
}

export function currentArtifactPath(
  dataDirectory: string,
  prefix: string,
  collectorSnapshot: string,
): string | undefined {
  return readdirSync(dataDirectory)
    .filter((entry) => entry.startsWith(prefix) && DATE_SUFFIX.test(entry))
    .sort()
    .map((entry) => join(dataDirectory, entry))
    .filter((entry) => artifactSnapshotMatches(entry, collectorSnapshot))
    .at(-1);
}

function artifactSnapshotMatches(path: string, collectorSnapshot: string): boolean {
  try {
    const artifact = readJson<{ collectorSnapshot?: unknown }>(path);
    return artifact.collectorSnapshot === collectorSnapshot;
  } catch {
    return false;
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} is missing.`);
  }
  return value;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
  }
}

function parseCliOptions(args: string[]): { date: string } {
  const options = { date: seoulDate(new Date()) };
  for (const arg of args) {
    if (arg.startsWith("--date=")) {
      options.date = arg.slice("--date=".length);
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new Error("--date must be YYYY-MM-DD.");
  }
  return options;
}

function seoulDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
