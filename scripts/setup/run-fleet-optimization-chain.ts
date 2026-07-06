import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DATA_DIR = "data";
const DOCS_DIR = join("docs", "work-orders");

interface ChainCommand {
  id: string;
  args: string[];
}

interface ChainOptions {
  dryRun: boolean;
  skipStatsUpdate: boolean;
  skipApiDataAudit: boolean;
  date: string;
}

interface ChainPlan {
  generatedAt: string;
  date: string;
  dryRun: boolean;
  skipStatsUpdate: boolean;
  skipApiDataAudit: boolean;
  productionMutationPerformed: false;
  cmsMutationPerformed: false;
  searchConsoleMutationPerformed: false;
  adsenseMutationPerformed: false;
  titleOrBodyMutationPerformed: false;
  commands: ChainCommand[];
}

interface ChainResult {
  id: string;
  status: "pass" | "fail" | "skipped";
  exitCode: number | null;
  stdoutTail: string;
  stderrTail: string;
}

interface ChainVerification {
  statsSnapshot: string;
  planSnapshot: string;
  handoffSnapshot: string;
  refreshFailedSources: string[];
  refreshFailureCount: number;
  refreshFailuresBlockReadiness: boolean;
  planMatchesStats: boolean;
  handoffMatchesStats: boolean;
  handoffMutationFlagsFalse: boolean;
  handoffSiteCount: number;
  titleHandoffCount: number;
  contentHandoffCount: number;
}

interface ChainArtifact extends ChainPlan {
  results: ChainResult[];
  verification: ChainVerification;
  summary: {
    commands: number;
    pass: number;
    fail: number;
    skipped: number;
  };
  stopCondition: string;
}

interface StatsSnapshot {
  generatedAt?: unknown;
}

interface FleetPlan {
  dashboardEvidence?: {
    snapshotTimestamp?: unknown;
  };
}

interface T3Handoff {
  dashboardEvidence?: {
    snapshotTimestamp?: unknown;
    refreshFailedSources?: unknown;
  };
  mutationStatus?: Record<string, unknown>;
  summary?: {
    siteCount?: unknown;
    titleHandoffCount?: unknown;
    contentHandoffCount?: unknown;
  };
}

function main(): void {
  const options = parseCliOptions(process.argv.slice(2));
  const plan = buildFleetOptimizationChainPlan({
    ...options,
    generatedAt: new Date().toISOString(),
  });
  const results = options.dryRun ? skippedResults(plan.commands) : runCommands(plan.commands);
  const verification = buildVerification(options.date);
  const artifact = buildArtifact(plan, results, verification, new Date().toISOString());
  const jsonPath = join(DATA_DIR, `fleet-optimization-chain-${options.date}.json`);
  const mdPath = join(DOCS_DIR, `fleet-optimization-chain-${options.date}.md`);

  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(DOCS_DIR, { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(artifact));

  console.log(
    [
      `Wrote ${jsonPath} and ${mdPath}.`,
      `snapshot=${artifact.verification.statsSnapshot || "unavailable"}`,
      `commands=${artifact.summary.commands}`,
      `pass=${artifact.summary.pass}`,
      `fail=${artifact.summary.fail}`,
      `skipped=${artifact.summary.skipped}`,
      `handoffSites=${artifact.verification.handoffSiteCount}`,
    ].join(" "),
  );

  if (
    artifact.summary.fail > 0 ||
    (!options.dryRun &&
      (!verification.planMatchesStats ||
        !verification.handoffMatchesStats ||
        verification.refreshFailuresBlockReadiness ||
        !verification.handoffMutationFlagsFalse))
  ) {
    process.exitCode = 1;
  }
}

export function buildFleetOptimizationChainPlan(
  input: ChainOptions & { generatedAt: string },
): ChainPlan {
  const commands: ChainCommand[] = [];
  if (!input.skipStatsUpdate) {
    commands.push({ id: "stats-update", args: ["stats:update"] });
  }
  commands.push({ id: "gsc-permission-audit", args: ["gsc:permissions:audit"] });
  commands.push({ id: "adsense-queue", args: ["adsense:queue"] });
  if (!input.skipApiDataAudit) {
    commands.push({
      id: "vercel-api-data-inventory",
      args: ["exec", "tsx", "scripts/setup/audit-vercel-api-data-sites.ts"],
    });
  }
  commands.push(
    {
      id: "fleet-optimize-plan",
      args: [
        "exec",
        "tsx",
        "scripts/setup/create-fleet-optimization-plan.ts",
        `--date=${input.date}`,
      ],
    },
    {
      id: "t3-title-content-handoff",
      args: [
        "exec",
        "tsx",
        "scripts/setup/create-t3-title-content-handoff.ts",
        `--date=${input.date}`,
      ],
    },
  );

  return {
    generatedAt: input.generatedAt,
    date: input.date,
    dryRun: input.dryRun,
    skipStatsUpdate: input.skipStatsUpdate,
    skipApiDataAudit: input.skipApiDataAudit,
    productionMutationPerformed: false,
    cmsMutationPerformed: false,
    searchConsoleMutationPerformed: false,
    adsenseMutationPerformed: false,
    titleOrBodyMutationPerformed: false,
    commands,
  };
}

export function parseCliOptions(args: string[]): ChainOptions {
  const options: ChainOptions = {
    dryRun: false,
    skipStatsUpdate: false,
    skipApiDataAudit: false,
    date: seoulDate(new Date()),
  };
  for (const arg of args) {
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--skip-stats-update") {
      options.skipStatsUpdate = true;
      continue;
    }
    if (arg === "--skip-api-data-audit") {
      options.skipApiDataAudit = true;
      continue;
    }
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

export function buildArtifact(
  plan: ChainPlan,
  results: ChainResult[],
  verification: ChainVerification,
  generatedAt = new Date().toISOString(),
): ChainArtifact {
  const completedResults = completeResults(plan.commands, results);
  return {
    ...plan,
    generatedAt,
    results: completedResults,
    verification,
    summary: {
      commands: plan.commands.length,
      pass: results.filter((result) => result.status === "pass").length,
      fail: results.filter((result) => result.status === "fail").length,
      skipped: completedResults.filter((result) => result.status === "skipped").length,
    },
    stopCondition:
      "This chain is local and non-mutating. It only refreshes dashboard evidence and handoff artifacts; it does not authorize CMS edits, title/body edits, Search Console mutation, AdSense mutation, publishing, or deployment.",
  };
}

function completeResults(
  commands: ChainCommand[],
  results: ChainResult[],
): ChainResult[] {
  const completed = [...results];
  if (completed.length >= commands.length) {
    return completed;
  }
  const failed = completed.find((result) => result.status === "fail");
  const reason = failed ? `not run after ${failed.id} failed` : "not run";
  for (const command of commands.slice(completed.length)) {
    completed.push({
      id: command.id,
      status: "skipped",
      exitCode: null,
      stdoutTail: reason,
      stderrTail: "",
    });
  }
  return completed;
}

function runCommands(commands: ChainCommand[]): ChainResult[] {
  const results: ChainResult[] = [];
  for (const command of commands) {
    const child = spawnSyncPnpm(command.args);
    const status = child.status === 0 ? "pass" : "fail";
    results.push({
      id: command.id,
      status,
      exitCode: child.status,
      stdoutTail: tail(child.stdout ?? ""),
      stderrTail: tail(child.stderr || child.error?.message || ""),
    });
    if (status === "fail") {
      break;
    }
  }
  return results;
}

function skippedResults(commands: ChainCommand[]): ChainResult[] {
  return commands.map((command) => ({
    id: command.id,
    status: "skipped",
    exitCode: null,
    stdoutTail: "dry-run",
    stderrTail: "",
  }));
}

function buildVerification(date: string): ChainVerification {
  const stats = safeReadJson<StatsSnapshot>(join(DATA_DIR, "site-stats.json"));
  const plan = safeReadJson<FleetPlan>(join(DATA_DIR, `fleet-optimization-plan-${date}.json`));
  const handoff = safeReadJson<T3Handoff>(join(DATA_DIR, `t3-title-content-handoff-${date}.json`));
  const statsSnapshot = stringValue(stats?.generatedAt);
  const planSnapshot = stringValue(plan?.dashboardEvidence?.snapshotTimestamp);
  const handoffSnapshot = stringValue(handoff?.dashboardEvidence?.snapshotTimestamp);
  const refreshFailedSources = stringArray(handoff?.dashboardEvidence?.refreshFailedSources);
  const readinessBlockingRefreshFailedSources = refreshFailedSources.filter(
    isReadinessBlockingRefreshFailure,
  );
  return {
    statsSnapshot,
    planSnapshot,
    handoffSnapshot,
    refreshFailedSources,
    refreshFailureCount: refreshFailedSources.length,
    refreshFailuresBlockReadiness: readinessBlockingRefreshFailedSources.length > 0,
    planMatchesStats: Boolean(statsSnapshot && planSnapshot === statsSnapshot),
    handoffMatchesStats: Boolean(statsSnapshot && handoffSnapshot === statsSnapshot),
    handoffMutationFlagsFalse: allMutationFlagsFalse(handoff?.mutationStatus),
    handoffSiteCount: numberValue(handoff?.summary?.siteCount),
    titleHandoffCount: numberValue(handoff?.summary?.titleHandoffCount),
    contentHandoffCount: numberValue(handoff?.summary?.contentHandoffCount),
  };
}

export function isReadinessBlockingRefreshFailure(source: string): boolean {
  return !isMaintenanceRefreshFailure(source);
}

function isMaintenanceRefreshFailure(source: string): boolean {
  return (
    source.includes("ga4:missing_config") ||
    source.includes("adsense_collector:transient_error") ||
    source.includes("ads_txt_collector:transient_error")
  );
}

function allMutationFlagsFalse(flags: Record<string, unknown> | undefined): boolean {
  const required = [
    "cmsMutationPerformed",
    "productionDeploymentPerformed",
    "searchConsoleMutationPerformed",
    "adsenseMutationPerformed",
    "titleOrBodyMutationPerformed",
  ];
  return required.every((key) => flags?.[key] === false);
}

function spawnSyncPnpm(args: string[]) {
  const pnpm = pnpmInvocation();
  return spawnSync(pnpm.bin, [...pnpm.argsPrefix, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
  });
}

function pnpmInvocation(): { bin: string; argsPrefix: string[] } {
  const appData = process.env.APPDATA;
  const pnpmCjs = appData ? join(appData, "npm", "node_modules", "pnpm", "bin", "pnpm.cjs") : "";
  if (pnpmCjs && existsSync(pnpmCjs)) {
    return { bin: process.execPath, argsPrefix: [pnpmCjs] };
  }
  return { bin: process.platform === "win32" ? "pnpm.cmd" : "pnpm", argsPrefix: [] };
}

function safeReadJson<T>(path: string): T | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}

function renderMarkdown(artifact: ChainArtifact): string {
  return `# Fleet Optimization Chain - ${artifact.date}

Mutation status: no CMS, database, Search Console, AdSense, title/body, publishing, or deployment mutation performed.

- Generated at: \`${artifact.generatedAt}\`
- Stats snapshot: \`${artifact.verification.statsSnapshot || "unavailable"}\`
- Plan snapshot: \`${artifact.verification.planSnapshot || "unavailable"}\`
- T3 handoff snapshot: \`${artifact.verification.handoffSnapshot || "unavailable"}\`
- Plan matches stats: \`${artifact.verification.planMatchesStats}\`
- T3 handoff matches stats: \`${artifact.verification.handoffMatchesStats}\`
- Refresh failures block readiness: \`${artifact.verification.refreshFailuresBlockReadiness}\`
- Refresh failed sources: ${artifact.verification.refreshFailedSources.length > 0 ? artifact.verification.refreshFailedSources.map((source) => `\`${source}\``).join(", ") : "`none`"}
- T3 mutation flags false: \`${artifact.verification.handoffMutationFlagsFalse}\`
- T3 sites: \`${artifact.verification.handoffSiteCount}\`
- Title handoff rows: \`${artifact.verification.titleHandoffCount}\`
- Content handoff rows: \`${artifact.verification.contentHandoffCount}\`

## Commands

| Step | Status | Exit |
|---|---|---:|
${artifact.results.map((result) => `| \`${result.id}\` | \`${result.status}\` | ${result.exitCode ?? "null"} |`).join("\n")}

## Stop Condition

${artifact.stopCondition}
`;
}

function tail(value: string, max = 4000): string {
  return value.length > max ? value.slice(-max) : value;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
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
