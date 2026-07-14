import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DATA_DIR = "data";
const DOCS_DIR = "docs";

type EvidenceLevel = "scheduled-db-ingestion" | "api-backed-content" | "candidate-review";
type FreshnessDecision = "dashboard_evidence_blocked" | "site_probe_required" | "source_check_required" | "manual_review";

interface ApiDataInventory {
  generatedAt: string;
  sites: ApiDataInventorySite[];
}

interface ApiDataInventorySite {
  id: string;
  url: string;
  evidenceLevel: EvidenceLevel;
  collectionScripts?: string[];
  scheduledWorkflows?: string[];
  recommendedCheck?: string;
}

interface StatsSnapshot {
  generatedAt: string;
  stats: Array<{ id: string; ga4Status?: string; gscStatus?: string }>;
}

export interface ApiDataFreshnessRow {
  id: string;
  url: string;
  evidenceLevel: EvidenceLevel;
  decision: FreshnessDecision;
  dashboardEvidenceCurrent: boolean;
  sourceDataMeasured: false;
  collectionScriptCount: number;
  scheduledWorkflowCount: number;
  reason: string;
  nextStep: string;
}

export interface ApiDataFreshnessReport {
  generatedAt: string;
  statsSnapshot: string;
  inventoryGeneratedAt: string;
  productionMutationPerformed: false;
  cmsMutationPerformed: false;
  searchConsoleMutationPerformed: false;
  adsenseMutationPerformed: false;
  titleOrBodyMutationPerformed: false;
  sourceDataMeasurement: "not_collected";
  summary: Record<FreshnessDecision, number> & { total: number; sourceDataMeasured: number };
  sites: ApiDataFreshnessRow[];
  stopCondition: string;
}

function main(): void {
  const inventory = readJson<ApiDataInventory>(join(DATA_DIR, "vercel-api-data-sites.json"));
  const stats = readJson<StatsSnapshot>(join(DATA_DIR, "site-stats.json"));
  if (!inventory || !stats) {
    throw new Error("Current Vercel/API inventory and dashboard stats are required.");
  }

  const report = buildApiDataFreshnessReport(inventory, stats, new Date().toISOString());
  const date = seoulDate(new Date(report.generatedAt));
  const jsonPath = join(DATA_DIR, "vercel-api-data-freshness.json");
  const markdownPath = join(DOCS_DIR, "vercel-api-data-freshness.md");
  const workOrderPath = join(DOCS_DIR, "work-orders", `vercel-api-data-freshness-${date}.md`);

  mkdirSync(join(DOCS_DIR, "work-orders"), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(markdownPath, renderApiDataFreshnessMarkdown(report));
  writeFileSync(workOrderPath, renderApiDataFreshnessWorkOrder(report, date));
  console.log(`Wrote ${jsonPath}, ${markdownPath}, and ${workOrderPath}. total=${report.summary.total} measured=${report.summary.sourceDataMeasured} probeRequired=${report.summary.site_probe_required} sourceCheck=${report.summary.source_check_required} blocked=${report.summary.dashboard_evidence_blocked}`);
}

export function buildApiDataFreshnessReport(inventory: ApiDataInventory, stats: StatsSnapshot, generatedAt: string): ApiDataFreshnessReport {
  const statsById = new Map(stats.stats.map((stat) => [stat.id, stat]));
  const sites = inventory.sites.map((site) => buildFreshnessRow(site, statsById.get(site.id)));
  const summary: ApiDataFreshnessReport["summary"] = { total: sites.length, sourceDataMeasured: 0, dashboard_evidence_blocked: 0, site_probe_required: 0, source_check_required: 0, manual_review: 0 };
  for (const site of sites) summary[site.decision] += 1;
  return {
    generatedAt,
    statsSnapshot: stats.generatedAt,
    inventoryGeneratedAt: inventory.generatedAt,
    productionMutationPerformed: false,
    cmsMutationPerformed: false,
    searchConsoleMutationPerformed: false,
    adsenseMutationPerformed: false,
    titleOrBodyMutationPerformed: false,
    sourceDataMeasurement: "not_collected",
    summary,
    sites,
    stopCondition: "This report does not measure a production database or upstream API. Do not generate or publish content from these rows until a site-specific read-only source-data probe records a current source timestamp and queue state.",
  };
}

function buildFreshnessRow(site: ApiDataInventorySite, stat: StatsSnapshot["stats"][number] | undefined): ApiDataFreshnessRow {
  const dashboardEvidenceCurrent = stat?.ga4Status === "ok" && stat.gscStatus === "ok";
  const shared = {
    id: site.id,
    url: site.url,
    evidenceLevel: site.evidenceLevel,
    dashboardEvidenceCurrent,
    sourceDataMeasured: false as const,
    collectionScriptCount: site.collectionScripts?.length ?? 0,
    scheduledWorkflowCount: site.scheduledWorkflows?.length ?? 0,
  };
  if (!dashboardEvidenceCurrent) return { ...shared, decision: "dashboard_evidence_blocked", reason: "Dashboard GA4/GSC evidence is incomplete, so this site cannot be prioritized from the current snapshot.", nextStep: "Restore the dashboard collection evidence first; do not infer API-data freshness or create content." };
  if (site.evidenceLevel === "scheduled-db-ingestion") return { ...shared, decision: "site_probe_required", reason: "Inventory shows scheduled ingestion evidence, but no current database source timestamp or content-queue state was measured.", nextStep: site.recommendedCheck ?? "Add a site-specific read-only DB freshness probe before content generation." };
  if (site.evidenceLevel === "api-backed-content") return { ...shared, decision: "source_check_required", reason: "Inventory identifies an API-backed content surface, but no current upstream source-date evidence was measured.", nextStep: site.recommendedCheck ?? "Collect a read-only upstream source date before content work." };
  return { ...shared, decision: "manual_review", reason: "Inventory classification is still candidate-review and cannot support a data freshness conclusion.", nextStep: "Review local project evidence before adding this site to a source-data freshness workflow." };
}

export function renderApiDataFreshnessMarkdown(report: ApiDataFreshnessReport): string {
  return [
    "# Vercel/API Data Freshness", "", `- Generated at: \`${report.generatedAt}\``, `- Dashboard stats snapshot: \`${report.statsSnapshot}\``, `- Inventory generated at: \`${report.inventoryGeneratedAt}\``, `- Source-data measurement: \`${report.sourceDataMeasurement}\``, "- Production mutation: `false`", "", "## Summary", "", "| Decision | Count |", "|---|---:|", ...Object.entries(report.summary).map(([decision, count]) => `| ${decision} | ${count} |`), "", "## Site Freshness Gate", "", "| Site | Decision | Dashboard evidence | Source measured | Next step |", "|---|---|---|---|---|", ...report.sites.map((site) => `| \`${site.id}\` | \`${site.decision}\` | ${site.dashboardEvidenceCurrent ? "current" : "incomplete"} | no | ${site.nextStep} |`), "", "## Stop Condition", "", report.stopCondition, "",
  ].join("\n");
}

function renderApiDataFreshnessWorkOrder(report: ApiDataFreshnessReport, date: string): string {
  return [
    `# Vercel/API Data Freshness Work Order - ${date}`, "", "## Current Contract", "", "- This is a read-only triage artifact, not proof of new source data.", "- A site-specific adapter must record its source timestamp and queue state before content generation is added.", "- Do not pull production secrets, write databases, publish, deploy, submit to Search Console, or change titles/bodies from this work order.", "", "## Candidates", "", ...report.sites.map((site) => `- \`${site.id}\` — \`${site.decision}\`: ${site.nextStep}`), "", "## Stop Condition", "", report.stopCondition, "",
  ].join("\n");
}

function readJson<T>(path: string): T | null {
  try { return JSON.parse(readFileSync(path, "utf8")) as T; } catch { return null; }
}

function seoulDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
