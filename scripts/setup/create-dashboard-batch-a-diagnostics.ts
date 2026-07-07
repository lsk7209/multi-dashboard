import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getDashboardData } from "../../app/lib/dashboard-data.js";

interface ApiDataSite {
  id: string;
  url: string;
  localPath?: string;
  evidenceLevel?: string;
  collectionScripts?: string[];
  scheduledWorkflows?: string[];
  recommendedCheck?: string;
}

interface PackageJson {
  scripts?: Record<string, string>;
}

const TARGET_IDS = [
  "todaypharm",
  "2mlab-2",
  "tasko-2",
  "dogswhere",
  "dullegilgogo",
] as const;

const OUTPUT_DATE = seoulDate();
const JSON_PATH = `data/dashboard-batch-a-diagnostics-${OUTPUT_DATE}.json`;
const MARKDOWN_PATH = `docs/work-orders/dashboard-batch-a-diagnostics-${OUTPUT_DATE}.md`;

function main() {
  const data = getDashboardData();
  const apiInventory = loadApiInventory();
  const apiById = new Map(apiInventory.map((site) => [site.id, site]));

  const diagnostics = TARGET_IDS.map((siteId) => {
    const stat = data.stats.find((candidate) => candidate.id === siteId);
    if (!stat) {
      return {
        siteId,
        status: "missing",
        cause: "target_not_found",
        nextReadOnlyStep: "Resolve siteId before running any diagnostics.",
      };
    }

    const host = hostOf(stat.url);
    const inventory = apiById.get(siteId);
    const localPath = inventory?.localPath ?? stat.developmentPath ?? null;
    const packageScripts = inspectPackageScripts(localPath);
    const taskoSiblings =
      host === "tasko.kr"
        ? data.stats
            .filter((candidate) => hostOf(candidate.url).endsWith(".tasko.kr"))
            .map((candidate) => ({
              siteId: candidate.id,
              host: hostOf(candidate.url),
              url: candidate.url,
              activeUsers7d: candidate.last7Days.activeUsers,
            }))
        : [];

    return {
      siteId,
      status: "classified",
      name: stat.name,
      host,
      url: stat.url,
      gscSiteUrl: stat.gscSiteUrl ?? null,
      localPath,
      targetResolutionNote:
        taskoSiblings.length > 0
          ? "Use this exact root host target; related tasko subdomains are listed separately."
          : "Exact host target resolved from dashboard siteId.",
      relatedSubdomainRows: taskoSiblings,
      metrics: {
        activeUsers7d: stat.last7Days.activeUsers,
        previousUsers7d: stat.previous7Days.activeUsers,
        activeUsersChange: stat.trend.activeUsersChange,
        gscClicks7d: stat.gscLast7Days.clicks,
        gscPreviousClicks7d: stat.gscPrevious7Days.clicks,
        gscImpressions7d: stat.gscLast7Days.impressions,
        gscClicks30d: stat.gscLast30Days.clicks,
        gscImpressions30d: stat.gscLast30Days.impressions,
      },
      sitemap: {
        path: stat.sitemapPath ?? null,
        warnings: stat.sitemapWarnings ?? 0,
        errors: stat.sitemapErrors ?? 0,
        isPending: stat.sitemapIsPending ?? false,
        submitted: stat.googleSubmittedCount ?? null,
        indexed: stat.googleIndexedCount ?? null,
        lastDownloadedAt: stat.sitemapLastDownloadedAt ?? null,
      },
      apiDataInventory: inventory
        ? {
            evidenceLevel: inventory.evidenceLevel ?? "unknown",
            recommendedCheck: inventory.recommendedCheck ?? null,
            collectionScripts: inventory.collectionScripts ?? [],
            scheduledWorkflows: inventory.scheduledWorkflows ?? [],
          }
        : null,
      packageScripts,
      cause: classifyCause(stat, inventory),
      nextReadOnlyStep: nextReadOnlyStep(stat, inventory, packageScripts),
      mutationGate:
        "Do not publish, backfill, submit sitemaps, request indexing, deploy, or write DB/content until this site's read-only cause is confirmed.",
    };
  });

  const artifact = {
    generatedAt: new Date().toISOString(),
    statsSnapshot: data.generatedAt,
    source: "getDashboardData plus data/vercel-api-data-sites.json and local package.json inspection",
    productionMutationPerformed: false,
    operationsForbidden: [
      "WordPress publish/update/schedule",
      "Search Console sitemap submit or indexing request",
      "production DB writes, backfills, migrations, imports",
      "Vercel deploy/env/domain changes",
      "AdSense console changes",
      "GitHub Actions dispatches",
      "broad sitemap resubmission",
    ],
    diagnostics,
  };

  writeJson(JSON_PATH, artifact);
  writeText(MARKDOWN_PATH, renderMarkdown(artifact));

  console.log(`Dashboard Batch A diagnostics written.`);
  console.log(`JSON: ${JSON_PATH}`);
  console.log(`Markdown: ${MARKDOWN_PATH}`);
}

function classifyCause(
  stat: ReturnType<typeof getDashboardData>["stats"][number],
  inventory: ApiDataSite | undefined,
): string {
  const ga4Drop = (stat.trend.activeUsersChange ?? 0) <= -0.3;
  const gscZero7d =
    stat.gscLast7Days.clicks === 0 && stat.gscLast7Days.impressions === 0;
  const gscZero30d =
    stat.gscLast30Days.clicks === 0 && stat.gscLast30Days.impressions === 0;
  const gscGrowing =
    stat.gscLast7Days.clicks > stat.gscPrevious7Days.clicks ||
    stat.gscLast7Days.impressions > stat.gscPrevious7Days.impressions;

  if (gscZero7d && gscZero30d && (stat.googleSubmittedCount ?? 0) > 0) {
    return "submitted_sitemap_but_no_gsc_visibility";
  }
  if (ga4Drop && gscGrowing) {
    return "ga4_channel_drop_likely_not_search_drop";
  }
  if (inventory?.evidenceLevel?.includes("scheduled-db")) {
    return "scheduled_api_data_freshness_check_required";
  }
  if (inventory?.evidenceLevel?.includes("api-backed")) {
    return "api_backed_content_freshness_check_required";
  }
  if (ga4Drop) {
    return "ga4_decline_needs_channel_split";
  }
  return "low_volume_or_unclassified_monitor";
}

function nextReadOnlyStep(
  stat: ReturnType<typeof getDashboardData>["stats"][number],
  inventory: ApiDataSite | undefined,
  scripts: ReturnType<typeof inspectPackageScripts>,
): string {
  if (inventory?.recommendedCheck) {
    return inventory.recommendedCheck;
  }
  if (stat.gscLast7Days.clicks === 0 && stat.gscLast7Days.impressions === 0) {
    return "Inspect property, sitemap response, robots, canonical, noindex, and whether this root host has any clean query/page evidence.";
  }
  if (scripts.readOnly.length > 0) {
    return `Run only read-only local scripts if needed: ${scripts.readOnly.join(", ")}.`;
  }
  return "Use dashboard metrics only and resolve a read-only diagnostic script before mutation.";
}

function inspectPackageScripts(localPath: string | null) {
  if (!localPath) {
    return { path: null, readOnly: [], avoid: [] };
  }

  const packagePath = join(localPath, "package.json");
  if (!existsSync(packagePath)) {
    return { path: packagePath, readOnly: [], avoid: [] };
  }

  const parsed = JSON.parse(readFileSync(packagePath, "utf8")) as PackageJson;
  const entries = Object.entries(parsed.scripts ?? {});
  const readOnly = entries
    .filter(([name, command]) => isReadOnlyScript(name, command))
    .map(([name]) => name)
    .slice(0, 12);
  const avoid = entries
    .filter(([name, command]) => isMutationScript(name, command))
    .map(([name]) => name)
    .slice(0, 12);

  return { path: packagePath, readOnly, avoid };
}

function isReadOnlyScript(name: string, command: string): boolean {
  const text = `${name} ${command}`.toLowerCase();
  return (
    /(audit|check|verify|status|inspect|lint|type|test|qa)/.test(text) &&
    !isMutationScript(name, command)
  );
}

function isMutationScript(name: string, command: string): boolean {
  const text = `${name} ${command}`.toLowerCase();
  return /(publish|sync|fetch|collect|import|seed|reset|delete|backfill|migrate|repair|generate|submit|deploy|write)/.test(
    text,
  );
}

function loadApiInventory(): ApiDataSite[] {
  const path = "data/vercel-api-data-sites.json";
  if (!existsSync(path)) {
    return [];
  }
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    sites?: ApiDataSite[];
  };
  return parsed.sites ?? [];
}

function renderMarkdown(artifact: {
  generatedAt: string;
  statsSnapshot: string | null;
  productionMutationPerformed: boolean;
  operationsForbidden: string[];
  diagnostics: Array<Record<string, unknown>>;
}): string {
  const lines = [
    `# Dashboard Batch A Diagnostics - ${OUTPUT_DATE}`,
    "",
    `- Generated: \`${artifact.generatedAt}\``,
    `- Stats snapshot: \`${artifact.statsSnapshot ?? "missing"}\``,
    `- Production mutation performed: \`${artifact.productionMutationPerformed}\``,
    "",
    "## Target Resolution",
    "",
    "| SiteId | Host | URL | Local path | Cause | Next read-only step |",
    "|---|---|---|---|---|---|",
  ];

  for (const item of artifact.diagnostics) {
    lines.push(
      `| ${cell(item.siteId)} | ${cell(item.host)} | ${cell(item.url)} | ${cell(item.localPath)} | ${cell(item.cause)} | ${cell(item.nextReadOnlyStep)} |`,
    );
  }

  lines.push(
    "",
    "## Mutation Gate",
    "",
    "Do not use mojibake query examples from older work orders as edit input. Use only fresh dashboard/GSC export query text after target resolution.",
    "",
    "Avoid these operations from this packet:",
  );

  for (const operation of artifact.operationsForbidden) {
    lines.push(`- ${operation}`);
  }

  lines.push("", "## Per-Site Details", "");

  for (const item of artifact.diagnostics) {
    lines.push(
      `### ${cell(item.siteId)} / ${cell(item.host)}`,
      "",
      `- URL: \`${String(item.url ?? "missing")}\``,
      `- GSC property: \`${String(item.gscSiteUrl ?? "missing")}\``,
      `- Local path: \`${String(item.localPath ?? "missing")}\``,
      `- Cause: \`${String(item.cause ?? "missing")}\``,
      `- Gate: ${String(item.mutationGate ?? "read-only only")}`,
      "",
    );
  }

  return `${lines.join("\n")}\n`;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, "utf8");
}

function cell(value: unknown): string {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

function seoulDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

main();
