import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { Octokit } from "@octokit/rest";
import { getErrorMessage } from "./lib/errors.js";

const DEFAULT_INTEL_PATH = "data/ops-intel.json";
const DEFAULT_OUTPUT_PATH = "data/ops-triage.json";
const DEFAULT_MARKDOWN_PATH = "docs/ops-triage.md";
const DEFAULT_OWNER = process.env.GITHUB_OWNER ?? "lsk7209";

type FindingKind = "github-actions" | "gsc" | "adsense" | "ga4" | "vercel" | "other";
type FindingSeverity = "critical" | "high" | "medium" | "low";
type OpsSource = "direct" | "legacy-digest" | "test";

interface CliOptions {
  input?: string;
  intel: string;
  output: string;
  markdown: string;
  owner: string;
  repoFilter?: string;
  limit?: number;
  createIssues: boolean;
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
  evidenceUrl?: string;
}

interface OpsTriageReport {
  generatedAt: string;
  source: OpsSource;
  sourcePath: string;
  sourceUpdatedAt?: string;
  digestUrl: string | null;
  digestUpdatedAt?: string;
  owner: string;
  summary: Record<FindingSeverity, number>;
  counts: Record<FindingKind, number>;
  collection?: Record<string, unknown>;
  findings: OpsFinding[];
}

interface OpsIntelArtifact {
  generatedAt?: unknown;
  source?: unknown;
  owner?: unknown;
  collection?: unknown;
  findings?: unknown;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    intel: DEFAULT_INTEL_PATH,
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
    if (arg.startsWith("--intel=")) {
      options.intel = arg.slice("--intel=".length);
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

function normalizeFinding(value: unknown): OpsFinding | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const kind = normalizeKind(candidate.kind);
  const severity = normalizeSeverity(candidate.severity);
  const id = stringValue(candidate.id);
  const title = stringValue(candidate.title);
  const recommendedAction = stringValue(candidate.recommendedAction);
  if (!kind || !severity || !id || !title || !recommendedAction) {
    return null;
  }

  const priority = numberValue(candidate.priority) ?? severityToPriority(severity);
  return {
    id,
    kind,
    severity,
    priority,
    ...(stringValue(candidate.repo) ? { repo: stringValue(candidate.repo) } : {}),
    ...(stringValue(candidate.site) ? { site: stringValue(candidate.site) } : {}),
    ...(stringValue(candidate.workflow) ? { workflow: stringValue(candidate.workflow) } : {}),
    ...(stringValue(candidate.category) ? { category: stringValue(candidate.category) } : {}),
    ...(numberValue(candidate.count) !== null ? { count: numberValue(candidate.count) ?? undefined } : {}),
    ...(stringValue(candidate.commit) ? { commit: stringValue(candidate.commit) } : {}),
    sourceLine: stringValue(candidate.sourceLine) ?? `direct:${kind}:${id}`,
    title,
    recommendedAction,
    ...(stringValue(candidate.issueUrl) ? { issueUrl: stringValue(candidate.issueUrl) } : {}),
    ...(stringValue(candidate.evidenceUrl) ? { evidenceUrl: stringValue(candidate.evidenceUrl) } : {}),
  };
}

function normalizeKind(value: unknown): FindingKind | null {
  if (
    value === "github-actions" ||
    value === "gsc" ||
    value === "adsense" ||
    value === "ga4" ||
    value === "vercel" ||
    value === "other"
  ) {
    return value;
  }
  return null;
}

function normalizeSeverity(value: unknown): FindingSeverity | null {
  if (value === "critical" || value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function severityToPriority(severity: FindingSeverity): number {
  if (severity === "critical") return 100;
  if (severity === "high") return 80;
  if (severity === "medium") return 50;
  return 20;
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

function finalizeReport(input: {
  source: OpsSource;
  sourcePath: string;
  sourceUpdatedAt?: string;
  owner: string;
  findings: OpsFinding[];
  collection?: Record<string, unknown>;
  repoFilter?: string;
  limit?: number;
}): OpsTriageReport {
  let findings = input.findings;
  if (input.repoFilter) {
    findings = findings.filter((finding) => finding.repo === input.repoFilter);
  }
  findings = findings
    .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title))
    .slice(0, input.limit ?? Number.POSITIVE_INFINITY);

  return {
    generatedAt: new Date().toISOString(),
    source: input.source,
    sourcePath: input.sourcePath,
    ...(input.sourceUpdatedAt ? { sourceUpdatedAt: input.sourceUpdatedAt } : {}),
    digestUrl: null,
    owner: input.owner,
    summary: summarize(findings),
    counts: countKinds(findings),
    ...(input.collection ? { collection: input.collection } : {}),
    findings,
  };
}

async function buildReportFromIntel(options: CliOptions): Promise<OpsTriageReport> {
  const raw = await readFile(options.intel, "utf8");
  const parsed = JSON.parse(raw) as OpsIntelArtifact;
  const findings = Array.isArray(parsed.findings)
    ? parsed.findings.map(normalizeFinding).filter((finding): finding is OpsFinding => Boolean(finding))
    : [];
  return finalizeReport({
    source: "direct",
    sourcePath: options.intel,
    sourceUpdatedAt: stringValue(parsed.generatedAt),
    owner: stringValue(parsed.owner) ?? options.owner,
    findings,
    ...(asRecord(parsed.collection) ? { collection: asRecord(parsed.collection) } : {}),
    ...(options.repoFilter ? { repoFilter: options.repoFilter } : {}),
    ...(options.limit ? { limit: options.limit } : {}),
  });
}

function parseLegacyDigest(markdown: string): OpsFinding[] {
  return markdown
    .split(/\r?\n/)
    .filter((line) => /^\s*[-*]\s+`?\d{0,2}:?\d{0,2}`?\s*\[(GSC|AdSense|GA4|Vercel)\]/i.test(line))
    .map((line, index) => {
      const kind = legacyKind(line);
      const site = extractSite(line);
      const severity = kind === "adsense" || kind === "vercel" ? "high" : "medium";
      return {
        id: `legacy-${kind}-${site ?? "global"}-${index}`,
        kind,
        severity,
        priority: severityToPriority(severity),
        ...(site ? { site } : {}),
        sourceLine: line.trim(),
        title: `Legacy ${kind} alert${site ? ` for ${site}` : ""}`,
        recommendedAction: "Legacy digest input was provided explicitly; verify against direct dashboard evidence before acting.",
      };
    });
}

function legacyKind(line: string): FindingKind {
  if (/\[AdSense\]/i.test(line)) return "adsense";
  if (/\[GA4\]/i.test(line)) return "ga4";
  if (/\[Vercel\]/i.test(line)) return "vercel";
  return "gsc";
}

function extractSite(line: string): string | undefined {
  return line.match(/(?<site>[a-z0-9.-]+\.[a-z]{2,})/i)?.groups?.site;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function buildOpsTriageReportFromIntel(
  artifact: OpsIntelArtifact,
  options: Partial<CliOptions> = {},
): OpsTriageReport {
  const findings = Array.isArray(artifact.findings)
    ? artifact.findings.map(normalizeFinding).filter((finding): finding is OpsFinding => Boolean(finding))
    : [];
  return finalizeReport({
    source: "direct",
    sourcePath: options.intel ?? "test://ops-intel",
    sourceUpdatedAt: stringValue(artifact.generatedAt),
    owner: stringValue(artifact.owner) ?? options.owner ?? DEFAULT_OWNER,
    findings,
    ...(asRecord(artifact.collection) ? { collection: asRecord(artifact.collection) } : {}),
    ...(options.repoFilter ? { repoFilter: options.repoFilter } : {}),
    ...(options.limit ? { limit: options.limit } : {}),
  });
}

export function buildOpsTriageReport(
  markdown: string,
  options: Partial<CliOptions> = {},
): OpsTriageReport {
  return finalizeReport({
    source: "legacy-digest",
    sourcePath: options.input ?? "test://legacy-digest",
    owner: options.owner ?? DEFAULT_OWNER,
    findings: parseLegacyDigest(markdown),
    ...(options.repoFilter ? { repoFilter: options.repoFilter } : {}),
    ...(options.limit ? { limit: options.limit } : {}),
  });
}

function issueBody(report: OpsTriageReport, finding: OpsFinding): string {
  const lines = [
    "Automated ops triage from direct multi-dashboard collection.",
    "",
    `Generated: ${report.generatedAt}`,
    `Source: ${report.sourcePath}`,
    finding.workflow ? `Workflow: ${finding.workflow}` : undefined,
    finding.commit ? `Commit: ${finding.commit}` : undefined,
    finding.count ? `Occurrences: ${finding.count}` : undefined,
    finding.evidenceUrl ? `Evidence: ${finding.evidenceUrl}` : undefined,
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
    `Source: ${report.source}`,
    `Source path: ${report.sourcePath}`,
    report.sourceUpdatedAt ? `Source updated: ${report.sourceUpdatedAt}` : undefined,
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
  const report = options.input
    ? buildOpsTriageReport(await readFile(options.input, "utf8"), options)
    : await buildReportFromIntel(options);

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
