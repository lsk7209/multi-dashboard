import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ADSENSE_APPROVED_EXACT_DOMAINS = [
  "ehon365.kr",
  "fastjob.kr",
  "haemongdream.com",
  "kang4.com",
  "klick.kr",
  "luckyday.kr",
  "nexttech7.com",
  "sellerpit.kr",
  "tasko.kr",
  "temon.kr",
  "tennisfrens.com",
] as const;

const LANE_KEYS = [
  "ordinary_adsense_proof",
  "approved_root_subdomain_scope",
  "gsc_auth_telemetry",
  "ga4_config_telemetry",
] as const;

type LaneKey = (typeof LANE_KEYS)[number];

interface StatsArtifact {
  generatedAt?: unknown;
  stats?: StatsRow[];
}

interface StatsRow {
  id?: unknown;
  name?: unknown;
  url?: unknown;
  monetization?: unknown;
  ga4Status?: unknown;
  gscStatus?: unknown;
  adsenseStatus?: unknown;
  adsenseCollectorStatus?: unknown;
  adsTxtStatus?: unknown;
  adsTxtCollectorStatus?: unknown;
  last30Days?: {
    activeUsers?: unknown;
  };
  gscLast30Days?: {
    impressions?: unknown;
  };
}

interface QueueItem {
  siteId: string;
  host: string;
  name: string;
  lane: LaneKey;
  priority: number;
  requiredEvidence: string[];
  stopCondition: string;
  notes: string[];
}

interface QueueArtifact {
  generatedAt: string;
  collectorSnapshot: string;
  scope: string;
  productionMutationPerformed: false;
  adsenseConsoleChecked: false;
  approvedExactDomainsExcluded: string[];
  nonMonetizedExactDomainsExcluded: string[];
  summary: {
    totalRows: number;
    reviewedRows: number;
    adsenseOkRows: number;
    problemRows: number;
    ordinaryAdsenseProof: number;
    approvedRootSubdomainScope: number;
    gscAuthTelemetry: number;
    ga4ConfigTelemetry: number;
  };
  lanes: Record<LaneKey, QueueItem[]>;
}

function main(): void {
  const date = seoulDate(new Date());
  const stats = readStats();
  const rows = stats.stats ?? [];
  const collectorSnapshot = `data/site-stats.json generatedAt=${stringValue(stats.generatedAt)}`;
  const approvedExactDomains = [...ADSENSE_APPROVED_EXACT_DOMAINS].sort();
  const nonMonetizedExactDomains = collectNonMonetizedDomains(rows);
  const approvedSet = new Set(approvedExactDomains);
  const nonMonetizedSet = new Set(nonMonetizedExactDomains);
  const lanes = makeEmptyLanes();
  let reviewedRows = 0;
  let adsenseOkRows = 0;

  for (const row of rows) {
    const host = hostFromUrl(stringValue(row.url));
    if (!host || approvedSet.has(host) || nonMonetizedSet.has(host)) {
      continue;
    }

    reviewedRows += 1;
    if (isAdsenseHealthy(row)) {
      adsenseOkRows += 1;
      continue;
    }

    for (const item of queueItemsForRow(row, host)) {
      lanes[item.lane].push(item);
    }
  }

  for (const lane of LANE_KEYS) {
    lanes[lane].sort((a, b) => a.priority - b.priority || a.host.localeCompare(b.host));
  }

  const artifact: QueueArtifact = {
    generatedAt: new Date().toISOString(),
    collectorSnapshot,
    scope: "AdSense remediation queue after approved exact-domain and non-monetized site exclusions",
    productionMutationPerformed: false,
    adsenseConsoleChecked: false,
    approvedExactDomainsExcluded: approvedExactDomains,
    nonMonetizedExactDomainsExcluded: nonMonetizedExactDomains,
    summary: {
      totalRows: rows.length,
      reviewedRows,
      adsenseOkRows,
      problemRows: Object.values(lanes).reduce((sum, lane) => sum + lane.length, 0),
      ordinaryAdsenseProof: lanes.ordinary_adsense_proof.length,
      approvedRootSubdomainScope: lanes.approved_root_subdomain_scope.length,
      gscAuthTelemetry: lanes.gsc_auth_telemetry.length,
      ga4ConfigTelemetry: lanes.ga4_config_telemetry.length,
    },
    lanes,
  };

  const jsonPath = join("data", `adsense-remediation-queue-${date}.json`);
  const mdPath = join("docs", "work-orders", "adsense", `remediation-queue-${date}.md`);
  mkdirSync("data", { recursive: true });
  mkdirSync(join("docs", "work-orders", "adsense"), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(artifact));

  console.log(
    [
      `Wrote ${jsonPath} and ${mdPath}.`,
      `snapshot=${stringValue(stats.generatedAt)}`,
      `reviewedRows=${artifact.summary.reviewedRows}`,
      `problemRows=${artifact.summary.problemRows}`,
      `ordinaryAdsenseProof=${artifact.summary.ordinaryAdsenseProof}`,
      `approvedRootSubdomainScope=${artifact.summary.approvedRootSubdomainScope}`,
      `gscAuthTelemetry=${artifact.summary.gscAuthTelemetry}`,
      `ga4ConfigTelemetry=${artifact.summary.ga4ConfigTelemetry}`,
    ].join(" "),
  );
}

function readStats(): StatsArtifact {
  const parsed = JSON.parse(readFileSync(join("data", "site-stats.json"), "utf8")) as StatsArtifact;
  if (typeof parsed.generatedAt !== "string") {
    throw new Error("data/site-stats.json generatedAt is missing.");
  }
  if (!Array.isArray(parsed.stats)) {
    throw new Error("data/site-stats.json stats array is missing.");
  }
  return parsed;
}

function queueItemsForRow(row: StatsRow, host: string): QueueItem[] {
  const items: QueueItem[] = [];
  if (!isStatusOk(row.gscStatus)) {
    items.push(makeQueueItem(row, host, "gsc_auth_telemetry"));
  }
  if (!isStatusOk(row.ga4Status)) {
    items.push(makeQueueItem(row, host, "ga4_config_telemetry"));
  }
  if (!isAdsenseTelemetryHealthy(row)) {
    items.push(makeQueueItem(row, host, "ordinary_adsense_proof"));
  }
  return dedupeLaneItems(items);
}

function makeQueueItem(row: StatsRow, host: string, lane: LaneKey): QueueItem {
  return {
    siteId: stringValue(row.id),
    host,
    name: stringValue(row.name) || host,
    lane,
    priority: priorityForRow(row, lane),
    requiredEvidence: requiredEvidenceForLane(lane),
    stopCondition: stopConditionForLane(lane),
    notes: notesForLane(row, lane),
  };
}

function isAdsenseHealthy(row: StatsRow): boolean {
  return isStatusOk(row.ga4Status) && isStatusOk(row.gscStatus) && isAdsenseTelemetryHealthy(row);
}

function isAdsenseTelemetryHealthy(row: StatsRow): boolean {
  return (
    isStatusOk(row.adsenseStatus) &&
    isStatusOk(row.adsenseCollectorStatus) &&
    isStatusOk(row.adsTxtStatus) &&
    isStatusOk(row.adsTxtCollectorStatus)
  );
}

function isStatusOk(value: unknown): boolean {
  return value === "ok" || value === "disabled" || value === "not_applicable";
}

function collectNonMonetizedDomains(rows: StatsRow[]): string[] {
  return [
    ...new Set(
      rows
        .filter((row) => row.monetization === false || row.adsenseStatus === "disabled" || row.adsTxtStatus === "disabled")
        .map((row) => hostFromUrl(stringValue(row.url)))
        .filter(Boolean),
    ),
  ].sort();
}

function priorityForRow(row: StatsRow, lane: LaneKey): number {
  const impressions = numberValue(row.gscLast30Days?.impressions);
  const users = numberValue(row.last30Days?.activeUsers);
  const impact = impressions + users * 2;
  const laneWeight: Record<LaneKey, number> = {
    ordinary_adsense_proof: 10,
    approved_root_subdomain_scope: 20,
    gsc_auth_telemetry: 30,
    ga4_config_telemetry: 40,
  };
  return laneWeight[lane] * 100_000 - Math.round(impact);
}

function requiredEvidenceForLane(lane: LaneKey): string[] {
  if (lane === "gsc_auth_telemetry") {
    return ["GSC property access returns ok in the next stats refresh."];
  }
  if (lane === "ga4_config_telemetry") {
    return ["GA4 property binding returns ok in the next stats refresh."];
  }
  if (lane === "approved_root_subdomain_scope") {
    return ["AdSense console confirms the approved-root/subdomain scope."];
  }
  return ["Homepage/sample page contains AdSense loader evidence.", "ads.txt validates the configured publisher id."];
}

function stopConditionForLane(lane: LaneKey): string {
  if (lane === "gsc_auth_telemetry") {
    return "Rerun pnpm stats:update and confirm gscStatus=ok for this site.";
  }
  if (lane === "ga4_config_telemetry") {
    return "Rerun pnpm stats:update and confirm ga4Status=ok for this site.";
  }
  if (lane === "approved_root_subdomain_scope") {
    return "Confirm AdSense approval scope before submitting or changing site configuration.";
  }
  return "Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok.";
}

function notesForLane(row: StatsRow, lane: LaneKey): string[] {
  if (lane === "gsc_auth_telemetry") {
    return [`gscStatus=${stringValue(row.gscStatus) || "unknown"}`];
  }
  if (lane === "ga4_config_telemetry") {
    return [`ga4Status=${stringValue(row.ga4Status) || "unknown"}`];
  }
  return [
    `adsenseStatus=${stringValue(row.adsenseStatus) || "unknown"}`,
    `adsenseCollectorStatus=${stringValue(row.adsenseCollectorStatus) || "unknown"}`,
    `adsTxtStatus=${stringValue(row.adsTxtStatus) || "unknown"}`,
    `adsTxtCollectorStatus=${stringValue(row.adsTxtCollectorStatus) || "unknown"}`,
  ];
}

function makeEmptyLanes(): Record<LaneKey, QueueItem[]> {
  return {
    ordinary_adsense_proof: [],
    approved_root_subdomain_scope: [],
    gsc_auth_telemetry: [],
    ga4_config_telemetry: [],
  };
}

function dedupeLaneItems(items: QueueItem[]): QueueItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.siteId}:${item.lane}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function seoulDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function renderMarkdown(artifact: QueueArtifact): string {
  return `# AdSense Remediation Queue - ${artifact.generatedAt}

- Collector snapshot: \`${artifact.collectorSnapshot}\`
- Production mutation: \`${artifact.productionMutationPerformed}\`
- AdSense console checked: \`${artifact.adsenseConsoleChecked}\`

## Summary

| Metric | Count |
|---|---:|
| Total rows | ${artifact.summary.totalRows} |
| Reviewed rows | ${artifact.summary.reviewedRows} |
| AdSense OK rows | ${artifact.summary.adsenseOkRows} |
| Problem rows | ${artifact.summary.problemRows} |
| Ordinary AdSense proof | ${artifact.summary.ordinaryAdsenseProof} |
| Approved-root/subdomain scope | ${artifact.summary.approvedRootSubdomainScope} |
| GSC auth telemetry | ${artifact.summary.gscAuthTelemetry} |
| GA4 config telemetry | ${artifact.summary.ga4ConfigTelemetry} |

## Queue

${LANE_KEYS.map((lane) => renderLane(lane, artifact.lanes[lane])).join("\n\n")}
`;
}

function renderLane(lane: LaneKey, items: QueueItem[]): string {
  if (items.length === 0) {
    return `### ${lane}\n\n- none`;
  }
  return [
    `### ${lane}`,
    "",
    "| Priority | Site | Host | Stop condition |",
    "|---:|---|---|---|",
    ...items.map(
      (item) =>
        `| ${item.priority} | \`${item.siteId}\` | ${item.host} | ${item.stopCondition} |`,
    ),
  ].join("\n");
}

main();
