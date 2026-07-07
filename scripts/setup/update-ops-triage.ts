import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { Octokit } from "@octokit/rest";
import { getErrorMessage } from "./lib/errors.js";

const DEFAULT_DIGEST_URL =
  process.env.GMAIL_DIGEST_README_URL ??
  "https://raw.githubusercontent.com/lsk7209/gmail-digest/main/README.md";
const DEFAULT_OUTPUT_PATH = "data/ops-triage.json";
const DEFAULT_MARKDOWN_PATH = "docs/ops-triage.md";
const DEFAULT_OWNER = process.env.GITHUB_OWNER ?? "lsk7209";

type FindingKind =
  | "github-actions"
  | "gsc"
  | "adsense"
  | "ga4"
  | "vercel"
  | "other";
type FindingSeverity = "critical" | "high" | "medium" | "low";

interface CliOptions {
  input?: string;
  url: string;
  output: string;
  markdown: string;
  owner: string;
  repoFilter?: string;
  limit?: number;
  createIssues: boolean;
}

interface GitHubActionFailure {
  repo: string;
  workflow: string;
  category: string;
  count: number;
  commit: string;
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
  issueUrl?: string;
}

interface OpsTriageReport {
  generatedAt: string;
  digestUrl: string;
  digestUpdatedAt?: string;
  owner: string;
  summary: Record<FindingSeverity, number>;
  counts: Record<FindingKind, number>;
  findings: OpsFinding[];
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    url: DEFAULT_DIGEST_URL,
    output: DEFAULT_OUTPUT_PATH,
    markdown: DEFAULT_MARKDOWN_PATH,
    owner: DEFAULT_OWNER,
    createIssues: false,
  };

  for (const arg of argv) {
    if (arg === "--create-issues") {
      options.createIssues = true;
      continue;
    }
    if (arg.startsWith("--input=")) {
      options.input = arg.slice("--input=".length);
      continue;
    }
    if (arg.startsWith("--url=")) {
      options.url = arg.slice("--url=".length);
      continue;
    }
    if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length);
      continue;
    }
    if (arg.startsWith("--markdown=")) {
      options.markdown = arg.slice("--markdown=".length);
      continue;
    }
    if (arg.startsWith("--owner=")) {
      options.owner = arg.slice("--owner=".length);
      continue;
    }
    if (arg.startsWith("--repo=")) {
      options.repoFilter = arg.slice("--repo=".length);
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

async function loadDigest(options: CliOptions): Promise<string> {
  if (options.input) {
    return readFile(options.input, "utf8");
  }

  const response = await fetch(options.url, {
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: "text/markdown,text/plain,*/*" },
  });
  if (!response.ok) {
    throw new Error(`Gmail digest fetch failed: HTTP ${response.status}`);
  }
  return response.text();
}

function extractDigestUpdatedAt(markdown: string): string | undefined {
  const match = markdown.match(/last update|last updated|마지막 업데이트/i);
  if (!match) {
    const fallback = markdown.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+KST)/);
    return fallback?.[1];
  }

  const start = Math.max(0, match.index ?? 0);
  const line = markdown.slice(start).split(/\r?\n/, 1)[0] ?? "";
  return line.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+KST)/)?.[1];
}

function parseCount(value: string): number {
  const match = value.replace(/\*/g, "").match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 1;
}

function cleanCell(value: string): string {
  return value.replace(/`/g, "").replace(/\*/g, "").trim();
}

function parseGitHubActionFailures(markdown: string): GitHubActionFailure[] {
  const lines = markdown.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => /GitHub Actions/i.test(line));
  if (headingIndex < 0) {
    return [];
  }

  const failures: GitHubActionFailure[] = [];
  for (const line of lines.slice(headingIndex + 1)) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (failures.length > 0) {
        break;
      }
      continue;
    }
    if (!trimmed.startsWith("|")) {
      if (failures.length > 0) {
        break;
      }
      continue;
    }
    if (/^\|\s*-+/.test(trimmed) || /레포|repo/i.test(trimmed)) {
      continue;
    }

    const cells = trimmed.split("|").slice(1, -1).map(cleanCell);
    if (cells.length < 5) {
      continue;
    }

    const [repo, workflow, category, count, commit] = cells;
    if (!repo || !workflow || !category || !count || !commit) {
      continue;
    }

    failures.push({
      repo,
      workflow,
      category,
      count: parseCount(count),
      commit,
    });
  }

  return failures;
}

function parseDigestBulletAlerts(markdown: string, kind: FindingKind): OpsFinding[] {
  const sourceTag = getDigestTag(kind);
  if (!sourceTag) {
    return [];
  }
  return markdown
    .split(/\r?\n/)
    .filter((line) => new RegExp(`\\[${sourceTag}\\]`, "i").test(line))
    .map((line, index) => {
      const time = line.match(/`(?<time>\d{2}:\d{2})`/)?.groups?.time;
      const site = extractSiteFromDigestLine(line);
      const issue = line.replace(/^\s*[-*]\s*/, "").replace(/`[^`]+`\s*/, "").trim();
      const severity = classifyBulletSeverity(issue);
      return {
        id: `${kind}-${site ?? "global"}-${index}-${hashText(issue)}`,
        kind,
        severity,
        priority: severityToPriority(severity),
        ...(site ? { site } : {}),
        sourceLine: line.trim(),
        title: `${sourceTag} alert${site ? ` for ${site}` : ""}${time ? ` at ${time}` : ""}`,
        recommendedAction: recommendBulletAction(kind, issue),
      };
    });
}

function getDigestTag(kind: FindingKind): string | null {
  if (kind === "gsc") return "GSC";
  if (kind === "adsense") return "AdSense";
  if (kind === "ga4") return "GA4";
  if (kind === "vercel") return "Vercel";
  return null;
}

function extractSiteFromDigestLine(line: string): string | undefined {
  const afterTag = line.split("]").slice(1).join("]");
  return (
    afterTag.match(/(?<site>[a-z0-9.-]+\.[a-z]{2,})/i)?.groups?.site ??
    line.match(/https?:\/\/(?:www\.)?(?<site>[a-z0-9.-]+\.[a-z]{2,})/i)?.groups?.site
  );
}

function classifyActionFailureSeverity(failure: GitHubActionFailure): FindingSeverity {
  const text = `${failure.workflow} ${failure.category}`.toLowerCase();
  if (failure.count >= 8) {
    return "critical";
  }
  if (failure.count >= 3) {
    return "high";
  }
  if (text.includes("quality") || text.includes("deploy") || text.includes("turso")) {
    return "high";
  }
  if (text.includes("etl") || text.includes("sync") || text.includes("pipeline")) {
    return "high";
  }
  if (failure.count >= 2) {
    return "medium";
  }
  return "medium";
}

function classifyBulletSeverity(issue: string): FindingSeverity {
  const normalized = issue.toLowerCase();
  if (
    normalized.includes("adsense") ||
    normalized.includes("policy") ||
    normalized.includes("payment") ||
    normalized.includes("site needs attention")
  ) {
    return "high";
  }
  if (
    normalized.includes("ga4") ||
    normalized.includes("analytics") ||
    normalized.includes("data collection")
  ) {
    return "medium";
  }
  if (normalized.includes("404") || normalized.includes("noindex") || normalized.includes("robots")) {
    return "high";
  }
  if (normalized.includes("deployment") || normalized.includes("vercel") || issue.includes("배포")) {
    return "high";
  }
  if (normalized.includes("canonical") || normalized.includes("duplicate") || issue.includes("중복")) {
    return "medium";
  }
  return "low";
}

function severityToPriority(severity: FindingSeverity): number {
  if (severity === "critical") {
    return 100;
  }
  if (severity === "high") {
    return 80;
  }
  if (severity === "medium") {
    return 50;
  }
  return 20;
}

function recommendActionFailure(failure: GitHubActionFailure): string {
  const text = `${failure.workflow} ${failure.category}`.toLowerCase();
  if (text.includes("turso")) {
    return "Check Turso quota and monitor gating. Prefer skip-with-evidence when quota or credentials are unavailable.";
  }
  if (text.includes("etl") || text.includes("sync") || text.includes("pipeline")) {
    return "Inspect the latest Actions logs, identify missing credentials or upstream API failures, then add explicit gates or retries.";
  }
  if (text.includes("auto publish") || text.includes("release") || text.includes("scheduled publish")) {
    return "Inspect content queue/shards and publish script assumptions. Add validation for missing source files before failing the workflow.";
  }
  if (text.includes("quality") || text.includes("gate")) {
    return "Run the repo quality gate locally and repair the failing build, lint, SEO, or schema check.";
  }
  if (text.includes("deploy")) {
    return "Inspect build logs and required deployment secrets. Do not run direct Vercel deploys from this dashboard.";
  }
  return "Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause.";
}

function recommendBulletAction(kind: FindingKind, issue: string): string {
  if (kind === "vercel") {
    return "Inspect the failed deployment through GitHub/Vercel logs and fix the source repo. Keep deployment through the GitHub integration path.";
  }
  if (kind === "adsense") {
    return "Open the AdSense alert, map it to the affected site, then verify ads.txt, policy status, approval scope, and ad code evidence before reapplying.";
  }
  if (kind === "ga4") {
    return "Open GA4 Admin/Data Streams for the affected property, verify tag collection, property binding, and dashboard site mapping.";
  }
  if (issue.includes("404")) {
    return "Check sitemap/canonical source for removed URLs, then redirect, restore, or let the URL drop intentionally.";
  }
  if (/noindex/i.test(issue) || issue.includes("NOINDEX")) {
    return "Verify whether noindex is intentional. If not, remove the tag and request revalidation after deployment.";
  }
  if (/robots/i.test(issue)) {
    return "Review robots.txt and page-level robots meta before requesting revalidation.";
  }
  if (/canonical|중복/i.test(issue)) {
    return "Review canonical tags and duplicate URL variants. Keep one indexable canonical target.";
  }
  return "Open the source alert and map it to the affected site before making changes.";
}

function toActionFinding(failure: GitHubActionFailure): OpsFinding {
  const severity = classifyActionFailureSeverity(failure);
  const title = `${failure.repo}: ${failure.workflow} failed ${failure.count} time${failure.count === 1 ? "" : "s"}`;
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
    sourceLine: `| ${failure.repo} | ${failure.workflow} | ${failure.category} | ${failure.count} | ${failure.commit} |`,
    title,
    recommendedAction: recommendActionFailure(failure),
  };
}

function hashText(value: string): string {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
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
    {
      "github-actions": 0,
      gsc: 0,
      adsense: 0,
      ga4: 0,
      vercel: 0,
      other: 0,
    },
  );
}

function buildReport(markdown: string, options: CliOptions): OpsTriageReport {
  let findings = [
    ...parseGitHubActionFailures(markdown).map(toActionFinding),
    ...parseDigestBulletAlerts(markdown, "gsc"),
    ...parseDigestBulletAlerts(markdown, "adsense"),
    ...parseDigestBulletAlerts(markdown, "ga4"),
    ...parseDigestBulletAlerts(markdown, "vercel"),
  ];

  if (options.repoFilter) {
    findings = findings.filter((finding) => finding.repo === options.repoFilter);
  }

  findings = findings
    .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title))
    .slice(0, options.limit ?? Number.POSITIVE_INFINITY);

  const digestUpdatedAt = extractDigestUpdatedAt(markdown);
  return {
    generatedAt: new Date().toISOString(),
    digestUrl: options.input ?? options.url,
    ...(digestUpdatedAt ? { digestUpdatedAt } : {}),
    owner: options.owner,
    summary: summarize(findings),
    counts: countKinds(findings),
    findings,
  };
}

export function buildOpsTriageReport(
  markdown: string,
  options: Partial<CliOptions> = {},
): OpsTriageReport {
  return buildReport(markdown, {
    url: options.url ?? "test://gmail-digest",
    output: options.output ?? DEFAULT_OUTPUT_PATH,
    markdown: options.markdown ?? DEFAULT_MARKDOWN_PATH,
    owner: options.owner ?? DEFAULT_OWNER,
    createIssues: false,
    ...(options.input ? { input: options.input } : {}),
    ...(options.repoFilter ? { repoFilter: options.repoFilter } : {}),
    ...(options.limit ? { limit: options.limit } : {}),
  });
}

function issueBody(report: OpsTriageReport, finding: OpsFinding): string {
  const lines = [
    "Automated ops triage from gmail-digest.",
    "",
    `Generated: ${report.generatedAt}`,
    `Digest: ${report.digestUrl}`,
    finding.workflow ? `Workflow: ${finding.workflow}` : undefined,
    finding.commit ? `Commit: ${finding.commit}` : undefined,
    finding.count ? `Occurrences: ${finding.count}` : undefined,
    "",
    "Recommended action:",
    finding.recommendedAction,
    "",
    "Source line:",
    "```",
    finding.sourceLine,
    "```",
  ].filter((line): line is string => line !== undefined);

  return `${lines.join("\n")}\n`;
}

async function createGitHubIssues(report: OpsTriageReport): Promise<void> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN or GH_TOKEN is required with --create-issues");
  }

  const octokit = new Octokit({ auth: token });
  for (const finding of report.findings) {
    if (!finding.repo) {
      continue;
    }

    const title = `[ops-triage] ${finding.title}`;
    const search = await octokit.rest.search.issuesAndPullRequests({
      q: `repo:${report.owner}/${finding.repo} is:issue in:title ${JSON.stringify(title)}`,
      per_page: 1,
    });
    const existing = search.data.items[0];
    if (existing?.html_url) {
      finding.issueUrl = existing.html_url;
      continue;
    }

    const created = await octokit.rest.issues.create({
      owner: report.owner,
      repo: finding.repo,
      title,
      body: issueBody(report, finding),
      labels: ["ops-triage", finding.kind, finding.severity],
    });
    finding.issueUrl = created.data.html_url;
  }
}

function renderMarkdown(report: OpsTriageReport): string {
  const lines = [
    "# Ops Triage",
    "",
    `Generated: ${report.generatedAt}`,
    `Digest: ${report.digestUrl}`,
    report.digestUpdatedAt ? `Digest updated: ${report.digestUpdatedAt}` : undefined,
    "",
    "## Summary",
    "",
    `- Critical: ${report.summary.critical}`,
    `- High: ${report.summary.high}`,
    `- Medium: ${report.summary.medium}`,
    `- Low: ${report.summary.low}`,
    `- GitHub Actions: ${report.counts["github-actions"]}`,
    `- GSC: ${report.counts.gsc}`,
    `- AdSense: ${report.counts.adsense}`,
    `- GA4: ${report.counts.ga4}`,
    `- Vercel: ${report.counts.vercel}`,
    "",
    "## Findings",
    "",
    "| Priority | Severity | Kind | Target | Title | Action |",
    "|---:|---|---|---|---|---|",
  ].filter((line): line is string => line !== undefined);

  for (const finding of report.findings) {
    const target = finding.repo ?? finding.site ?? "global";
    const title = finding.issueUrl ? `[${finding.title}](${finding.issueUrl})` : finding.title;
    lines.push(
      `| ${finding.priority} | ${finding.severity} | ${finding.kind} | ${target} | ${escapeMarkdownTable(title)} | ${escapeMarkdownTable(finding.recommendedAction)} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

function escapeMarkdownTable(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

async function writeReport(report: OpsTriageReport, options: CliOptions): Promise<void> {
  await Promise.all([mkdir("data", { recursive: true }), mkdir("docs", { recursive: true })]);
  await Promise.all([
    writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(options.markdown, renderMarkdown(report), "utf8"),
  ]);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const markdown = await loadDigest(options);
  const report = buildReport(markdown, options);

  if (options.createIssues) {
    await createGitHubIssues(report);
  }

  await writeReport(report, options);

  console.log(`Wrote ${options.output}`);
  console.log(`Wrote ${options.markdown}`);
  console.log(
    `Findings: ${report.findings.length} (critical=${report.summary.critical}, high=${report.summary.high}, medium=${report.summary.medium}, low=${report.summary.low})`,
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
