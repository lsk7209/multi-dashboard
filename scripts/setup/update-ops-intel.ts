import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { Octokit } from "@octokit/rest";
import YAML from "yaml";
import { getErrorMessage } from "./lib/errors.js";
import { loadLocalSecrets, readSecret } from "./lib/secrets.js";

const DEFAULT_OWNER = process.env.GITHUB_OWNER ?? "lsk7209";
const DEFAULT_OUTPUT_PATH = "data/ops-intel.json";
const DEFAULT_STATS_PATH = "data/site-stats.json";
const DEFAULT_SITES_PATH = "scripts/setup/sites.yaml";
const DEFAULT_LOOKBACK_DAYS = 7;
const MAX_REPOS = 120;
const DEFAULT_EXCLUDED_REPOS = new Set(["gmail-digest"]);

type FindingKind = "github-actions" | "gsc" | "adsense" | "ga4" | "vercel" | "other";
type FindingSeverity = "critical" | "high" | "medium" | "low";

interface CliOptions {
  owner: string;
  output: string;
  statsPath: string;
  sitesPath: string;
  lookbackDays: number;
  publicOnly: boolean;
  repoFilter?: string;
  repos?: string[];
  limit?: number;
}

interface OpsFinding {
  id: string;
  kind: FindingKind;
  severity: FindingSeverity;
  priority: number;
  repo?: string;
  site?: string;
  workflow?: string;
  category?: string;
  count?: number;
  commit?: string;
  sourceLine: string;
  title: string;
  recommendedAction: string;
  evidenceUrl?: string;
}

interface OpsIntelReport {
  generatedAt: string;
  source: "direct";
  owner: string;
  lookbackDays: number;
  statsPath: string;
  statsSnapshot: string | null;
  sitesPath: string;
  collection: {
    githubActions: CollectionState;
    dashboardArtifacts: CollectionState;
  };
  counts: Record<FindingKind, number>;
  summary: Record<FindingSeverity, number>;
  findings: OpsFinding[];
}

interface CollectionState {
  status: "ok" | "skipped" | "error";
  detail: string;
  checkedAt: string;
  count: number;
}

interface SitesFile {
  sites?: Array<{
    id?: string;
    enabled?: boolean;
    url?: string;
    contentSource?: {
      githubRepo?: string;
      localPath?: string;
      localPaths?: Array<{ path?: string }>;
    };
  }>;
}

interface StatsSnapshot {
  generatedAt?: string | null;
  stats?: Array<{
    id?: string;
    name?: string;
    url?: string;
    ga4Status?: string;
    gscStatus?: string;
    adsenseStatus?: string;
    adsenseCollectorStatus?: string;
    adsTxtStatus?: string;
    adsTxtCollectorStatus?: string;
    sitemapWarnings?: number;
    sitemapErrors?: number;
    ga4Error?: string;
    gscError?: string;
    adsenseError?: string;
    adsTxtError?: string;
    sitemapError?: string;
  }>;
}

interface WorkflowRunFailure {
  repo: string;
  workflow: string;
  category: string;
  count: number;
  commit: string;
  htmlUrl?: string;
}

interface GithubWorkflowRun {
  name?: string | null;
  workflow_id: number;
  created_at?: string | null;
  head_sha?: string | null;
  html_url?: string | null;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    owner: DEFAULT_OWNER,
    output: DEFAULT_OUTPUT_PATH,
    statsPath: DEFAULT_STATS_PATH,
    sitesPath: DEFAULT_SITES_PATH,
    lookbackDays: DEFAULT_LOOKBACK_DAYS,
    publicOnly: false,
  };

  for (const arg of argv) {
    if (arg === "--public-only") {
      options.publicOnly = true;
      continue;
    }
    if (arg.startsWith("--owner=")) {
      options.owner = arg.slice("--owner=".length);
      continue;
    }
    if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length);
      continue;
    }
    if (arg.startsWith("--stats=")) {
      options.statsPath = arg.slice("--stats=".length);
      continue;
    }
    if (arg.startsWith("--sites=")) {
      options.sitesPath = arg.slice("--sites=".length);
      continue;
    }
    if (arg.startsWith("--repo=")) {
      options.repoFilter = arg.slice("--repo=".length);
      continue;
    }
    if (arg.startsWith("--repos=")) {
      options.repos = arg
        .slice("--repos=".length)
        .split(",")
        .map((repo) => repo.trim())
        .filter(Boolean);
      continue;
    }
    if (arg.startsWith("--lookback-days=")) {
      const value = Number.parseInt(arg.slice("--lookback-days=".length), 10);
      if (Number.isFinite(value) && value > 0) {
        options.lookbackDays = value;
      }
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const value = Number.parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(value) && value > 0) {
        options.limit = value;
      }
    }
  }

  return options;
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
}

async function readSites(path: string): Promise<SitesFile> {
  try {
    return YAML.parse(await readFile(path, "utf8")) as SitesFile;
  } catch {
    return {};
  }
}

function repoNameFromUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const match = value.match(/github\.com\/[^/]+\/([^/#?]+?)(?:\.git)?(?:[#?].*)?$/i);
  return match?.[1] ?? null;
}

function repoNameFromPath(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/[\\/]+$/, "");
  const last = normalized.split(/[\\/]/).filter(Boolean).at(-1);
  return last && /^[a-z0-9._-]+$/i.test(last) ? last : null;
}

function repoCandidatesFromSites(sites: SitesFile): string[] {
  const repos = new Set<string>();
  for (const site of sites.sites ?? []) {
    if (site.enabled === false) {
      continue;
    }
    const githubRepo = repoNameFromUrl(site.contentSource?.githubRepo);
    if (githubRepo) {
      repos.add(githubRepo);
    }
    const localPathRepo = repoNameFromPath(site.contentSource?.localPath);
    if (localPathRepo) {
      repos.add(localPathRepo);
    }
    for (const item of site.contentSource?.localPaths ?? []) {
      const repo = repoNameFromPath(item.path);
      if (repo) {
        repos.add(repo);
      }
    }
    if (site.id) {
      repos.add(site.id);
    }
  }
  return filterExcludedRepos([...repos]).slice(0, MAX_REPOS);
}

async function collectGithubFailures(
  octokit: Octokit,
  options: CliOptions,
  repoCandidates: string[],
): Promise<{ state: CollectionState; failures: WorkflowRunFailure[] }> {
  const checkedAt = new Date().toISOString();
  try {
    const repos = filterExcludedRepos(options.repoFilter
      ? [options.repoFilter]
      : options.repos && options.repos.length > 0
        ? options.repos
        : options.publicOnly
          ? repoCandidates
          : await listOwnerRepos(octokit, options.owner, repoCandidates));
    const cutoff = Date.now() - options.lookbackDays * 24 * 60 * 60 * 1000;
    const failures: WorkflowRunFailure[] = [];
    const repoErrors: string[] = [];

    for (const repo of repos.slice(0, options.limit ?? MAX_REPOS)) {
      let runs: GithubWorkflowRun[];
      try {
        runs = (await octokit.paginate(octokit.rest.actions.listWorkflowRunsForRepo, {
          owner: options.owner,
          repo,
          status: "failure",
          per_page: 30,
        })) as GithubWorkflowRun[];
      } catch (error) {
        repoErrors.push(`${repo}: ${getErrorMessage(error)}`);
        continue;
      }
      const recentRuns = runs.filter((run) => {
        const createdAt = run.created_at ? Date.parse(run.created_at) : 0;
        return createdAt >= cutoff;
      });
      const grouped = new Map<string, typeof recentRuns>();
      for (const run of recentRuns) {
        const key = run.name ?? run.workflow_id.toString();
        grouped.set(key, [...(grouped.get(key) ?? []), run]);
      }
      for (const [workflow, group] of grouped) {
        const latest = group[0];
        failures.push({
          repo,
          workflow,
          category: inferWorkflowCategory(workflow),
          count: group.length,
          commit: latest?.head_sha?.slice(0, 7) ?? "-",
          ...(latest?.html_url ? { htmlUrl: latest.html_url } : {}),
        });
      }
    }

    return {
      state: {
        status: repoErrors.length > 0 ? "error" : "ok",
        detail:
          repoErrors.length > 0
            ? `Collected failed workflow runs from ${repos.length - repoErrors.length}/${repos.length} repositories. Errors: ${repoErrors.slice(0, 5).join("; ")}`
            : `Collected failed workflow runs from ${repos.length} repositories.`,
        checkedAt,
        count: failures.length,
      },
      failures,
    };
  } catch (error) {
    return {
      state: {
        status: "error",
        detail: getErrorMessage(error),
        checkedAt,
        count: 0,
      },
      failures: [],
    };
  }
}

async function listOwnerRepos(
  octokit: Octokit,
  owner: string,
  repoCandidates: string[],
): Promise<string[]> {
  try {
    const repos = await octokit.paginate(octokit.rest.repos.listForUser, {
      username: owner,
      type: "owner",
      per_page: 100,
    });
    const names = filterExcludedRepos(repos.map((repo) => repo.name).filter(Boolean));
    if (names.length > 0) {
      return names.slice(0, MAX_REPOS);
    }
  } catch {
    // Fall back to configured site-derived candidates.
  }
  return repoCandidates;
}

function filterExcludedRepos(repos: string[]): string[] {
  const extraExcluded = new Set(
    (process.env.OPS_INTEL_EXCLUDED_REPOS ?? "")
      .split(",")
      .map((repo) => repo.trim())
      .filter(Boolean),
  );
  return repos.filter((repo) => !DEFAULT_EXCLUDED_REPOS.has(repo) && !extraExcluded.has(repo));
}

function inferWorkflowCategory(workflow: string): string {
  const normalized = workflow.toLowerCase();
  if (normalized.includes("publish") || normalized.includes("content")) {
    return "content";
  }
  if (normalized.includes("quality") || normalized.includes("gate") || normalized.includes("test")) {
    return "quality";
  }
  if (normalized.includes("sync") || normalized.includes("collect") || normalized.includes("pipeline")) {
    return "data";
  }
  if (normalized.includes("deploy") || normalized.includes("vercel")) {
    return "deploy";
  }
  return "system";
}

function classifyGithubSeverity(failure: WorkflowRunFailure): FindingSeverity {
  if (failure.count >= 8) return "critical";
  if (failure.count >= 3) return "high";
  if (["quality", "data", "deploy"].includes(failure.category)) return "high";
  if (failure.count >= 2) return "medium";
  return "medium";
}

function severityToPriority(severity: FindingSeverity): number {
  if (severity === "critical") return 100;
  if (severity === "high") return 80;
  if (severity === "medium") return 50;
  return 20;
}

function githubFailureToFinding(failure: WorkflowRunFailure): OpsFinding {
  const severity = classifyGithubSeverity(failure);
  return {
    id: `gha-${failure.repo}-${hashText(`${failure.workflow}-${failure.commit}`)}`,
    kind: "github-actions",
    severity,
    priority: severityToPriority(severity) + Math.min(15, failure.count),
    repo: failure.repo,
    workflow: failure.workflow,
    category: failure.category,
    count: failure.count,
    commit: failure.commit,
    sourceLine: `direct:github-actions repo=${failure.repo} workflow=${failure.workflow} count=${failure.count} commit=${failure.commit}`,
    title: `${failure.repo}: ${failure.workflow} failed ${failure.count} time${failure.count === 1 ? "" : "s"}`,
    recommendedAction: recommendGithubAction(failure),
    ...(failure.htmlUrl ? { evidenceUrl: failure.htmlUrl } : {}),
  };
}

function recommendGithubAction(failure: WorkflowRunFailure): string {
  if (failure.category === "data") {
    return "Inspect the latest workflow logs, then add explicit gates, retries, or upstream API fallback handling.";
  }
  if (failure.category === "content") {
    return "Inspect the content queue and publish script assumptions; skip missing input with evidence instead of failing the whole workflow.";
  }
  if (failure.category === "quality") {
    return "Run the repo quality gate locally and patch the failing build, lint, SEO, schema, or test check.";
  }
  if (failure.category === "deploy") {
    return "Fix the source repo and keep deployment through the GitHub integration path.";
  }
  return "Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause.";
}

function collectDashboardFindings(stats: StatsSnapshot | null): { state: CollectionState; findings: OpsFinding[] } {
  const checkedAt = new Date().toISOString();
  if (!stats?.stats) {
    return {
      state: {
        status: "error",
        detail: "Missing or invalid data/site-stats.json.",
        checkedAt,
        count: 0,
      },
      findings: [],
    };
  }

  const findings: OpsFinding[] = [];
  for (const site of stats.stats) {
    const siteId = site.id ?? site.url ?? "unknown";
    const siteName = site.name ?? siteId;
    if (site.ga4Status && site.ga4Status !== "ok") {
      findings.push(dashboardFinding("ga4", "high", siteId, siteName, site.ga4Status, site.ga4Error));
    }
    if (site.gscStatus && site.gscStatus !== "ok") {
      findings.push(dashboardFinding("gsc", "high", siteId, siteName, site.gscStatus, site.gscError));
    }
    if (site.adsenseStatus && !["ok", "disabled"].includes(site.adsenseStatus)) {
      findings.push(dashboardFinding("adsense", "high", siteId, siteName, site.adsenseStatus, site.adsenseError));
    }
    if (site.adsTxtStatus && !["ok", "disabled"].includes(site.adsTxtStatus)) {
      findings.push(dashboardFinding("adsense", "medium", siteId, siteName, `ads.txt ${site.adsTxtStatus}`, site.adsTxtError));
    }
    const sitemapProblems = (site.sitemapErrors ?? 0) + (site.sitemapWarnings ?? 0);
    if (sitemapProblems > 0) {
      findings.push(
        dashboardFinding(
          "gsc",
          site.sitemapErrors && site.sitemapErrors > 0 ? "high" : "low",
          siteId,
          siteName,
          `sitemap warnings=${site.sitemapWarnings ?? 0} errors=${site.sitemapErrors ?? 0}`,
          site.sitemapError,
        ),
      );
    }
  }

  return {
    state: {
      status: "ok",
      detail: `Read dashboard artifact snapshot=${stats.generatedAt ?? "unknown"}.`,
      checkedAt,
      count: findings.length,
    },
    findings,
  };
}

function dashboardFinding(
  kind: FindingKind,
  severity: FindingSeverity,
  siteId: string,
  siteName: string,
  status: string,
  error: string | undefined,
): OpsFinding {
  const title = `${siteName}: ${kind.toUpperCase()} direct collector signal ${status}`;
  return {
    id: `${kind}-${siteId}-${hashText(`${status}-${error ?? ""}`)}`,
    kind,
    severity,
    priority: severityToPriority(severity),
    site: siteId,
    sourceLine: `direct:dashboard site=${siteId} kind=${kind} status=${status}${error ? ` error=${error}` : ""}`,
    title,
    recommendedAction: recommendDashboardAction(kind, status),
  };
}

function recommendDashboardAction(kind: FindingKind, status: string): string {
  if (kind === "ga4") {
    return "Verify GA4 property binding, tag collection, and dashboard site mapping from current first-party telemetry.";
  }
  if (kind === "gsc") {
    return "Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence.";
  }
  if (kind === "adsense") {
    return `Verify AdSense code, ads.txt, approval scope, and collector evidence for status ${status}.`;
  }
  return "Inspect the direct dashboard artifact and repair the underlying collector or site signal.";
}

function summarize(findings: OpsFinding[]): Record<FindingSeverity, number> {
  return findings.reduce<Record<FindingSeverity, number>>(
    (summary, finding) => {
      summary[finding.severity] += 1;
      return summary;
    },
    { critical: 0, high: 0, medium: 0, low: 0 },
  );
}

function countKinds(findings: OpsFinding[]): Record<FindingKind, number> {
  return findings.reduce<Record<FindingKind, number>>(
    (counts, finding) => {
      counts[finding.kind] += 1;
      return counts;
    },
    { "github-actions": 0, gsc: 0, adsense: 0, ga4: 0, vercel: 0, other: 0 },
  );
}

function hashText(value: string): string {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}

function cleanOperationalToken(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.toLowerCase();
  if (
    normalized.includes("example") ||
    normalized.includes("replace-with") ||
    normalized.includes("dummy")
  ) {
    return undefined;
  }
  return value;
}

export async function buildOpsIntelReport(options: CliOptions): Promise<OpsIntelReport> {
  loadLocalSecrets();
  const sites = await readSites(options.sitesPath);
  const stats = await readJson<StatsSnapshot>(options.statsPath);
  const repoCandidates = repoCandidatesFromSites(sites);
  const dashboard = collectDashboardFindings(stats);
  let github: { state: CollectionState; failures: WorkflowRunFailure[] };
  const token = options.publicOnly
    ? undefined
    : cleanOperationalToken(readSecret("GITHUB_TOKEN") ?? readSecret("GH_TOKEN"));

  if (!token && !options.publicOnly) {
    github = {
      state: {
        status: "skipped",
        detail: "GITHUB_TOKEN or GH_TOKEN is missing; GitHub Actions direct collection skipped.",
        checkedAt: new Date().toISOString(),
        count: 0,
      },
      failures: [],
    };
  } else {
    github = await collectGithubFailures(new Octokit(token ? { auth: token } : {}), options, repoCandidates);
  }

  const findings = [
    ...github.failures.map(githubFailureToFinding),
    ...dashboard.findings,
  ].sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));

  return {
    generatedAt: new Date().toISOString(),
    source: "direct",
    owner: options.owner,
    lookbackDays: options.lookbackDays,
    statsPath: options.statsPath,
    statsSnapshot: stats?.generatedAt ?? null,
    sitesPath: options.sitesPath,
    collection: {
      githubActions: github.state,
      dashboardArtifacts: dashboard.state,
    },
    counts: countKinds(findings),
    summary: summarize(findings),
    findings,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const report = await buildOpsIntelReport(options);
  await mkdir("data", { recursive: true });
  await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Wrote ${options.output}`);
  console.log(
    `Direct ops findings: ${report.findings.length} (github=${report.counts["github-actions"]}, gsc=${report.counts.gsc}, adsense=${report.counts.adsense}, ga4=${report.counts.ga4})`,
  );
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    console.error(getErrorMessage(error));
    process.exitCode = 1;
  });
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(entry).href;
}
