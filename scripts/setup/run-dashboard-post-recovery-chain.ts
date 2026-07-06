import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DATA_DIR = "data";
const DOCS_DIR = join("docs", "work-orders");
const COMMAND_OUTPUT_TAIL_LENGTH = 1200;
const REQUIRED_POST_RECOVERY_ACCEPTANCE_IDS = [
  "external_gsc_access_restored",
  "dashboard_verify_local_verified",
  "rendered_ui_smoke_current",
  "dashboard_surface_current",
  "recommendations_safe_to_act",
  "mutation_boundary_clean",
];

interface ChainCommand {
  id: string;
  args: string[];
}

interface ChainOptions {
  dryRun: boolean;
  date: string;
  dateOverride: boolean;
}

interface ChainPlan {
  generatedAt: string;
  date: string;
  dryRun: boolean;
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

interface DashboardVerificationSnapshot {
  path: string;
  exists: boolean;
  statsSnapshot: string;
  verdict: string;
  expectedBlocked: number | null;
  fail: number | null;
  skipped: number | null;
  externalBlockerEvidenceCount: number | null;
  externalBlockerEvidence: ExternalBlockerSnapshot[];
  actionabilityBlockerHosts: string[];
  surfaceBlockerHosts: string[];
  actionabilityStatus: string;
  postRecoveryAcceptance: string[];
}

interface ExternalBlockerSnapshot {
  source: string;
  host: string;
  siteId: string;
  gscStatus: string;
  permissionLevel: string;
  accessState: string;
}

interface ChainArtifact extends ChainPlan {
  dashboardVerification: DashboardVerificationSnapshot;
  results: ChainResult[];
  artifactIntegrity: ChainResult | null;
  summary: {
    commands: number;
    pass: number;
    fail: number;
    skipped: number;
  };
  readiness: "ready_to_act" | "external_recovery_required" | "failed" | "dry_run";
  stopCondition: string;
}

function main(): void {
  const options = parseCliOptions(process.argv.slice(2));
  const plan = buildDashboardPostRecoveryChainPlan({
    ...options,
    generatedAt: new Date().toISOString(),
  });
  const results = options.dryRun ? skippedResults(plan.commands) : runCommands(plan.commands);
  const dashboardVerification = readDashboardVerificationSnapshot(options.date);
  const artifact = buildDashboardPostRecoveryChainArtifact(
    { ...plan, generatedAt: new Date().toISOString() },
    results,
    dashboardVerification,
  );
  const jsonPath = join(DATA_DIR, `dashboard-post-recovery-chain-${options.date}.json`);
  const mdPath = join(DOCS_DIR, `dashboard-post-recovery-chain-${options.date}.md`);

  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(DOCS_DIR, { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(artifact));
  if (!options.dryRun) {
    applyArtifactIntegrityResult(artifact, runArtifactIntegrity(options.date));
    writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
    writeFileSync(mdPath, renderMarkdown(artifact));
  }

  console.log(
    [
      `Wrote ${jsonPath} and ${mdPath}.`,
      `snapshot=${artifact.dashboardVerification.statsSnapshot || "unavailable"}`,
      `verdict=${artifact.dashboardVerification.verdict || "unavailable"}`,
      `commands=${artifact.summary.commands}`,
      `pass=${artifact.summary.pass}`,
      `fail=${artifact.summary.fail}`,
      `skipped=${artifact.summary.skipped}`,
      `artifactIntegrity=${artifact.artifactIntegrity?.status ?? "not_run"}`,
      `readiness=${artifact.readiness}`,
    ].join(" "),
  );

  if (
    artifact.artifactIntegrity?.status === "fail" ||
    (artifact.readiness !== "ready_to_act" && artifact.readiness !== "dry_run")
  ) {
    process.exitCode = 1;
  }
}

export function buildDashboardPostRecoveryChainPlan(
  input: ChainOptions & { generatedAt: string },
): ChainPlan {
  const commands: ChainCommand[] = [
    { id: "gsc-permission-audit", args: ["gsc:permissions:audit"] },
    { id: "dashboard-verify", args: ["dashboard:verify"] },
    {
      id: "dashboard-acceptance",
      args: ["dashboard:acceptance", join(DATA_DIR, `dashboard-verification-${input.date}.json`)],
    },
  ];

  return {
    generatedAt: input.generatedAt,
    date: input.date,
    dryRun: input.dryRun,
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
    date: seoulDate(new Date()),
    dateOverride: false,
  };

  for (const arg of args) {
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--skip-stats-update") {
      continue;
    }
    if (arg.startsWith("--date=")) {
      options.date = arg.slice("--date=".length);
      options.dateOverride = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new Error("--date must be YYYY-MM-DD.");
  }
  if (options.dateOverride && !options.dryRun) {
    throw new Error("--date is only supported with --dry-run; non-dry runs must verify the current dated artifact.");
  }
  return options;
}

export function buildDashboardPostRecoveryChainArtifact(
  plan: ChainPlan,
  results: ChainResult[],
  dashboardVerification: DashboardVerificationSnapshot,
): ChainArtifact {
  const annotatedResults = annotatePreRefreshResultTails(results, dashboardVerification);
  const pass = annotatedResults.filter((result) => result.status === "pass").length;
  const fail = annotatedResults.filter((result) => result.status === "fail").length;
  const skipped = annotatedResults.filter((result) => result.status === "skipped").length;
  const readiness = classifyReadiness(plan, results, dashboardVerification);

  return {
    ...plan,
    dashboardVerification,
    results: annotatedResults,
    artifactIntegrity: null,
    summary: {
      commands: plan.commands.length,
      pass,
      fail,
      skipped,
    },
    readiness,
    stopCondition:
      "This local chain does not authorize CMS edits, Search Console mutations, AdSense submissions, deployments, DNS changes, publishing, or title/body edits. Dashboard recommendations are executable only when readiness is ready_to_act.",
  };
}

export function applyArtifactIntegrityResult(
  artifact: ChainArtifact,
  result: ChainResult,
): ChainArtifact {
  artifact.artifactIntegrity = result;
  if (result.status === "fail") {
    artifact.readiness = "failed";
  }
  return artifact;
}

function runArtifactIntegrity(date: string): ChainResult {
  const child = spawnSyncPnpm([
    "dashboard:artifact-integrity",
    `--date=${date}`,
    "--allow-missing-post-write-integrity",
  ]);
  return {
    id: "dashboard-artifact-integrity",
    status: child.status === 0 ? "pass" : "fail",
    exitCode: child.status,
    stdoutTail: tail(child.stdout ?? ""),
    stderrTail: tail(child.stderr || child.error?.message || ""),
  };
}

function annotatePreRefreshResultTails(
  results: ChainResult[],
  dashboardVerification: DashboardVerificationSnapshot,
): ChainResult[] {
  const finalSnapshot = dashboardVerification.statsSnapshot;
  if (!finalSnapshot) {
    return results;
  }

  return results.map((result) => {
    if (result.id !== "gsc-permission-audit") {
      return result;
    }
    const resultSnapshot = snapshotFromOutput(result.stdoutTail);
    if (
      !resultSnapshot ||
      resultSnapshot === finalSnapshot ||
      result.stdoutTail.includes("pre_refresh_non_authoritative=true")
    ) {
      return result;
    }
    return {
      ...result,
      stdoutTail: tail(
        `${result.stdoutTail}\npre_refresh_non_authoritative=true finalDashboardVerificationSnapshot=${finalSnapshot}\n`,
      ),
    };
  });
}

function classifyReadiness(
  plan: ChainPlan,
  results: ChainResult[],
  dashboardVerification: DashboardVerificationSnapshot,
): ChainArtifact["readiness"] {
  if (plan.dryRun) {
    return "dry_run";
  }
  if (!dashboardVerification.exists) {
    return "failed";
  }
  const failedIds = results
    .filter((result) => result.status === "fail")
    .map((result) => result.id);
  const skippedIds = results
    .filter((result) => result.status === "skipped")
    .map((result) => result.id);
  const onlyAcceptanceFailed =
    failedIds.length === 1 &&
    failedIds[0] === "dashboard-acceptance" &&
    skippedIds.length === 0;
  const hasConcreteExternalBlocker =
    dashboardVerification.verdict === "local_verified_external_blocker" &&
    (dashboardVerification.expectedBlocked ?? 0) > 0 &&
    dashboardVerification.fail === 0 &&
    dashboardVerification.skipped === 0 &&
    (dashboardVerification.externalBlockerEvidenceCount ?? 0) > 0 &&
    dashboardVerification.externalBlockerEvidence.some(isConcreteExternalBlocker) &&
    dashboardVerification.actionabilityStatus === "blocked_for_action_until_post_recovery_verify" &&
    dashboardVerification.actionabilityBlockerHosts.length > 0 &&
    dashboardVerification.surfaceBlockerHosts.length > 0;
  if (
    hasConcreteExternalBlocker &&
    (failedIds.length === 0 || onlyAcceptanceFailed)
  ) {
    return "external_recovery_required";
  }
  if (
    failedIds.length > 0 ||
    skippedIds.length > 0 ||
    dashboardVerification.fail !== 0 ||
    dashboardVerification.skipped !== 0
  ) {
    return "failed";
  }
  return dashboardVerification.verdict === "local_verified" &&
    dashboardVerification.expectedBlocked === 0 &&
    dashboardVerification.actionabilityStatus === "safe_to_act" &&
    postRecoveryAcceptanceFullySatisfied(dashboardVerification.postRecoveryAcceptance)
    ? "ready_to_act"
    : "failed";
}

function postRecoveryAcceptanceFullySatisfied(rows: string[]): boolean {
  const expected = REQUIRED_POST_RECOVERY_ACCEPTANCE_IDS.map((id) => `${id}=satisfied`);
  return (
    rows.length === expected.length &&
    new Set(rows).size === rows.length &&
    expected.every((row) => rows.includes(row))
  );
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
      results.push(...skippedResults(commands.slice(results.length)));
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
    stdoutTail: "dry-run or skipped after failed command",
    stderrTail: "",
  }));
}

function readDashboardVerificationSnapshot(date: string): DashboardVerificationSnapshot {
  const path = join(DATA_DIR, `dashboard-verification-${date}.json`);
  const artifact = safeReadJson(path);
  if (!artifact) {
    return {
      path,
      exists: false,
      statsSnapshot: "",
      verdict: "",
      expectedBlocked: null,
      fail: null,
      skipped: null,
      externalBlockerEvidenceCount: null,
      externalBlockerEvidence: [],
      actionabilityBlockerHosts: [],
      surfaceBlockerHosts: [],
      actionabilityStatus: "",
      postRecoveryAcceptance: [],
    };
  }

  const postRecoveryAcceptance = Array.isArray(artifact.postRecoveryAcceptance)
    ? artifact.postRecoveryAcceptance
        .filter(isRecord)
        .map((item) => `${String(item.id ?? "unknown")}=${String(item.status ?? "missing")}`)
    : [];
  const externalBlockerEvidence = Array.isArray(artifact.externalBlockerEvidence)
    ? artifact.externalBlockerEvidence.filter(isRecord).map((item) => ({
        source: stringValue(item.source),
        host: stringValue(item.host),
        siteId: stringValue(item.siteId),
        gscStatus: stringValue(item.gscStatus),
        permissionLevel: stringValue(item.permissionLevel),
        accessState: stringValue(item.accessState),
      }))
    : [];

  return {
    path,
    exists: true,
    statsSnapshot: stringValue(artifact.statsSnapshot),
    verdict: stringValue(artifact.verdict),
    expectedBlocked: numberOrNull(isRecord(artifact.summary) ? artifact.summary.expectedBlocked : null),
    fail: numberOrNull(isRecord(artifact.summary) ? artifact.summary.fail : null),
    skipped: numberOrNull(isRecord(artifact.summary) ? artifact.summary.skipped : null),
    externalBlockerEvidenceCount: Array.isArray(artifact.externalBlockerEvidence)
      ? artifact.externalBlockerEvidence.length
      : null,
    externalBlockerEvidence,
    actionabilityBlockerHosts: stringArray(
      isRecord(artifact.dashboardActionability) ? artifact.dashboardActionability.blockerHosts : null,
    ),
    surfaceBlockerHosts: stringArray(
      isRecord(artifact.dashboardSurfaceEvidence) ? artifact.dashboardSurfaceEvidence.blockerHosts : null,
    ),
    actionabilityStatus: stringValue(
      isRecord(artifact.dashboardActionability) ? artifact.dashboardActionability.status : null,
    ),
    postRecoveryAcceptance,
  };
}

function renderMarkdown(artifact: ChainArtifact): string {
  return `# Dashboard Post-Recovery Chain - ${artifact.date}

- Generated at: \`${artifact.generatedAt}\`
- Dry run: \`${artifact.dryRun}\`
- Readiness: \`${artifact.readiness}\`
- Stats snapshot: \`${artifact.dashboardVerification.statsSnapshot || "unavailable"}\`
- Verification verdict: \`${artifact.dashboardVerification.verdict || "unavailable"}\`
- Production mutation: \`${artifact.productionMutationPerformed}\`
- CMS mutation: \`${artifact.cmsMutationPerformed}\`
- Search Console mutation: \`${artifact.searchConsoleMutationPerformed}\`
- AdSense mutation: \`${artifact.adsenseMutationPerformed}\`
- Title/body mutation: \`${artifact.titleOrBodyMutationPerformed}\`

## Commands

| Step | Status | Exit |
|---|---|---:|
${artifact.results.map((result) => `| \`${result.id}\` | \`${result.status}\` | ${result.exitCode ?? "null"} |`).join("\n")}

## Artifact Integrity

${artifact.artifactIntegrity ? `- Status: \`${artifact.artifactIntegrity.status}\`
- Exit: ${artifact.artifactIntegrity.exitCode ?? "null"}
- Command: \`pnpm dashboard:artifact-integrity --date=${artifact.date}\`` : "- `not_run`"}

## Dashboard Verification

- Path: \`${artifact.dashboardVerification.path}\`
- Exists: \`${artifact.dashboardVerification.exists}\`
- Expected blocked: \`${artifact.dashboardVerification.expectedBlocked ?? "n/a"}\`
- Fail: \`${artifact.dashboardVerification.fail ?? "n/a"}\`
- Skipped: \`${artifact.dashboardVerification.skipped ?? "n/a"}\`
- External blocker evidence count: \`${artifact.dashboardVerification.externalBlockerEvidenceCount ?? "n/a"}\`
- External blocker evidence: ${artifact.dashboardVerification.externalBlockerEvidence.length > 0 ? artifact.dashboardVerification.externalBlockerEvidence.map((item) => `\`${item.host}:${item.permissionLevel}:${item.accessState}\``).join(", ") : "`none`"}
- Actionability: \`${artifact.dashboardVerification.actionabilityStatus || "unavailable"}\`
- Actionability blocker hosts: ${artifact.dashboardVerification.actionabilityBlockerHosts.length > 0 ? artifact.dashboardVerification.actionabilityBlockerHosts.map((host) => `\`${host}\``).join(", ") : "`none`"}
- Surface blocker hosts: ${artifact.dashboardVerification.surfaceBlockerHosts.length > 0 ? artifact.dashboardVerification.surfaceBlockerHosts.map((host) => `\`${host}\``).join(", ") : "`none`"}
- Post-recovery acceptance: ${artifact.dashboardVerification.postRecoveryAcceptance.length > 0 ? artifact.dashboardVerification.postRecoveryAcceptance.map((item) => `\`${item}\``).join(", ") : "`none`"}

## Stop Condition

${artifact.stopCondition}
`;
}

function spawnSyncPnpm(args: string[]) {
  const pnpm = pnpmInvocation();
  return spawnSync(pnpm.bin, [...pnpm.argsPrefix, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
    maxBuffer: 1024 * 1024 * 10,
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

function safeReadJson(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) {
    return null;
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function tail(value: string, max = COMMAND_OUTPUT_TAIL_LENGTH): string {
  return value.length > max ? value.slice(-max) : value;
}

function snapshotFromOutput(output: string): string {
  return /(?:^|\s)snapshot=([^\s]+)/.exec(output)?.[1] ?? "";
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isConcreteExternalBlocker(value: ExternalBlockerSnapshot): boolean {
  return (
    value.source === "gsc_permission_audit" &&
    value.host.length > 0 &&
    value.siteId.length > 0 &&
    value.gscStatus.length > 0 &&
    value.permissionLevel.length > 0 &&
    value.accessState.length > 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
