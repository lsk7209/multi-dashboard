import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  describeRefreshFailureSources,
  isMaintenanceRefreshFailureSource,
  type RefreshFailureDetail,
} from "../../app/lib/refresh-failure-details.js";

const DATA_DIR = "data";
const DOCS_DIR = join("docs", "work-orders");
const POST_RECOVERY_ACCEPTANCE_COMMAND = "pnpm dashboard:post-recovery";

interface VerificationCommand {
  id: string;
  args: string[];
}

interface CommandResult {
  id: string;
  status: "pass" | "expected_blocked" | "fail" | "skipped";
  exitCode: number | null;
  stdoutTail: string;
  stderrTail: string;
}

export interface FleetChainArtifact {
  generatedAt?: unknown;
  date?: unknown;
  productionMutationPerformed?: unknown;
  cmsMutationPerformed?: unknown;
  searchConsoleMutationPerformed?: unknown;
  adsenseMutationPerformed?: unknown;
  titleOrBodyMutationPerformed?: unknown;
  summary?: {
    commands?: unknown;
    pass?: unknown;
    fail?: unknown;
    skipped?: unknown;
  };
  verification?: {
    statsSnapshot?: unknown;
    refreshFailedSources?: unknown;
    refreshFailuresBlockReadiness?: unknown;
    planMatchesStats?: unknown;
    handoffMatchesStats?: unknown;
    handoffMutationFlagsFalse?: unknown;
  };
}

interface GscPermissionAuditArtifact {
  collectorSnapshot?: unknown;
  handoffStatus?: unknown;
  productionMutationPerformed?: unknown;
  gscMutationPerformed?: unknown;
  summary?: {
    restrictedAccess?: unknown;
    unverified?: unknown;
    notListed?: unknown;
  };
  results?: Array<{
    siteId?: unknown;
    host?: unknown;
    configuredGscSiteUrl?: unknown;
    gscStatus?: unknown;
    listedSiteUrl?: unknown;
    permissionLevel?: unknown;
    accessState?: unknown;
    requiredAction?: unknown;
  }>;
}

interface ExternalBlockerEvidence {
  source: "gsc_permission_audit";
  artifactPath: string;
  workOrderPath: string;
  collectorSnapshot: string;
  host: string;
  siteId: string;
  gscStatus: string;
  permissionLevel: string;
  accessState: string;
  requiredAction: string;
}

interface PostRecoveryCommand {
  id: string;
  args: string[];
  reason: string;
  requires: string[];
}

interface MutationBoundaryEvidence {
  localEvidenceArtifactsWritten: true;
  productionMutationPerformed: false;
  cmsMutationPerformed: false;
  searchConsoleMutationPerformed: false;
  adsenseMutationPerformed: false;
  titleOrBodyMutationPerformed: false;
  evidenceArtifacts: Array<{
    source: string;
    path: string;
    exists: boolean;
    generatedAt: string;
    snapshot: string;
    productionMutationPerformed: boolean | null;
    cmsMutationPerformed: boolean | null;
    searchConsoleMutationPerformed: boolean | null;
    adsenseMutationPerformed: boolean | null;
    titleOrBodyMutationPerformed: boolean | null;
  }>;
}

interface RenderedUiSmokeEvidence {
  path: string;
  exists: boolean;
  expectedStatsSnapshot: string;
  statsSnapshot: string;
  artifactGeneratedAt: string;
  status: "current" | "stale" | "missing" | "unknown";
  productionMutationPerformed: boolean | null;
  cmsMutationPerformed: boolean | null;
  searchConsoleMutationPerformed: boolean | null;
  adsenseMutationPerformed: boolean | null;
  titleOrBodyMutationPerformed: boolean | null;
}

interface DashboardSurfaceEvidence {
  sourceCommand: "dashboard-smoke";
  status: "current" | "missing" | "unknown";
  statsSnapshot: string;
  siteCount: number | null;
  actionCount: number | null;
  insightCount: number | null;
  chainStatus: string;
  chainVerdict: string;
  blockerHosts: string[];
}

interface DashboardActionabilityEvidence {
  status:
    | "safe_to_act"
    | "blocked_for_action_until_post_recovery_verify"
    | "unknown";
  allowedUse: string;
  reason: string;
  blockerHosts: string[];
  requiredVerificationCommand: string;
}

interface PostRecoveryAcceptanceCriterion {
  id: string;
  status: "satisfied" | "pending_external" | "pending_verification" | "failed";
  requirement: string;
  evidence: string;
}

interface DashboardVerificationArtifact {
  generatedAt: string;
  date: string;
  productionMutationPerformed: false;
  cmsMutationPerformed: false;
  searchConsoleMutationPerformed: false;
  adsenseMutationPerformed: false;
  titleOrBodyMutationPerformed: false;
  commands: VerificationCommand[];
  results: CommandResult[];
  summary: {
    commands: number;
    pass: number;
    expectedBlocked: number;
    fail: number;
    skipped: number;
  };
  verdict: "local_verified" | "local_verified_external_blocker" | "pending_verification" | "failed";
  blockerSources: string[];
  maintenanceSources: string[];
  blockerDetails: RefreshFailureDetail[];
  maintenanceDetails: RefreshFailureDetail[];
  externalBlockerEvidence: ExternalBlockerEvidence[];
  postRecoveryShortcutCommand: string;
  postRecoveryCommands: PostRecoveryCommand[];
  renderedUiSmokeEvidence: RenderedUiSmokeEvidence;
  dashboardSurfaceEvidence: DashboardSurfaceEvidence;
  dashboardActionability: DashboardActionabilityEvidence;
  postRecoveryAcceptance: PostRecoveryAcceptanceCriterion[];
  mutationBoundaryEvidence: MutationBoundaryEvidence;
  statsSnapshot: string;
  stopCondition: string;
}

function main(): void {
  const date = seoulDate(new Date());
  const commands = buildDashboardVerificationCommands();
  const results = runDashboardVerificationCommands(commands, date);
  const artifact = buildDashboardVerificationArtifact(date, commands, results);
  const jsonPath = join(DATA_DIR, `dashboard-verification-${date}.json`);
  const mdPath = join(DOCS_DIR, `dashboard-verification-${date}.md`);

  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(DOCS_DIR, { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(artifact));

  console.log(
    [
      `Wrote ${jsonPath} and ${mdPath}.`,
      `snapshot=${artifact.statsSnapshot || "unavailable"}`,
      `verdict=${artifact.verdict}`,
      `commands=${artifact.summary.commands}`,
      `pass=${artifact.summary.pass}`,
      `expectedBlocked=${artifact.summary.expectedBlocked}`,
      `fail=${artifact.summary.fail}`,
      `skipped=${artifact.summary.skipped}`,
      `blockers=${artifact.blockerSources.length > 0 ? artifact.blockerSources.join(",") : "none"}`,
    ].join(" "),
  );

  process.exitCode = dashboardVerificationExitCode(artifact.verdict);
}

export function dashboardVerificationExitCode(
  verdict: DashboardVerificationArtifact["verdict"],
): number {
  return verdict === "local_verified" || verdict === "local_verified_external_blocker" ? 0 : 1;
}

export function buildDashboardVerificationCommands(): VerificationCommand[] {
  return [
    { id: "fleet-optimize", args: ["fleet:optimize"] },
    { id: "dashboard-smoke", args: ["dashboard:smoke"] },
    { id: "dashboard-ui-smoke", args: ["dashboard:ui-smoke", `--url=${verificationDashboardUrl()}`] },
    { id: "adsense-proof-verify", args: ["adsense:proof:verify"] },
  ];
}

function verificationDashboardUrl(): string {
  const rawUrl = process.env.DASHBOARD_URL || "http://127.0.0.1:3000/";
  try {
    const url = new URL(rawUrl);
    url.searchParams.set("actionabilityMode", "local-evidence");
    return url.toString();
  } catch {
    return "http://127.0.0.1:3000/?actionabilityMode=local-evidence";
  }
}

export function runDashboardVerificationCommands(
  commands: VerificationCommand[],
  date: string,
): CommandResult[] {
  const results: CommandResult[] = [];
  for (const command of commands) {
    if (results.some((result) => result.status === "fail")) {
      results.push(skippedResult(command, "not run after failed command"));
      continue;
    }

    const child = spawnSyncPnpm(command.args);
    const result = classifyCommandResult(command, child.status, child.stdout ?? "", child.stderr ?? "", date);
    results.push(result);
  }
  return results;
}

export function classifyCommandResult(
  command: VerificationCommand,
  exitCode: number | null,
  stdout: string,
  stderr: string,
  date: string,
): CommandResult {
  if (exitCode === 0) {
    return {
      id: command.id,
      status: "pass",
      exitCode,
      stdoutTail: tail(sanitizeCommandOutput(stdout)),
      stderrTail: tail(sanitizeCommandOutput(stderr)),
    };
  }

  if (command.id === "fleet-optimize" && isExpectedFleetReadinessBlock(date)) {
    return {
      id: command.id,
      status: "expected_blocked",
      exitCode,
      stdoutTail: tail(sanitizeCommandOutput(stdout)),
      stderrTail: tail(sanitizeCommandOutput(stderr)),
    };
  }

  return {
    id: command.id,
    status: "fail",
    exitCode,
    stdoutTail: tail(sanitizeCommandOutput(stdout)),
    stderrTail: tail(sanitizeCommandOutput(stderr)),
  };
}

export function buildDashboardVerificationArtifact(
  date: string,
  commands: VerificationCommand[],
  results: CommandResult[],
  generatedAt = new Date().toISOString(),
): DashboardVerificationArtifact {
  const chainPath = join(DATA_DIR, `fleet-optimization-chain-${date}.json`);
  const chain = safeReadJson<FleetChainArtifact>(chainPath);
  const blockerSources = stringArray(chain?.verification?.refreshFailedSources);
  const maintenanceSources = blockerSources.filter(isMaintenanceRefreshFailure);
  const readinessBlockingSources = blockerSources.filter((source) => !isMaintenanceRefreshFailure(source));
  const fail = results.filter((result) => result.status === "fail").length;
  const expectedBlocked = results.filter((result) => result.status === "expected_blocked").length;
  const statsSnapshot = stringValue(chain?.verification?.statsSnapshot);
  const gscAuditMatch = loadGscAuditForStatsSnapshot(statsSnapshot, date);
  const gscAuditPath = gscAuditMatch.path;
  const gscAudit = gscAuditMatch.artifact;
  const externalBlockerEvidence =
    expectedBlocked > 0 && statsSnapshot
      ? buildExternalBlockerEvidence(gscAudit, date, statsSnapshot, gscAuditPath)
      : [];
  const dashboardSurfaceEvidence = buildDashboardSurfaceEvidence(results, statsSnapshot);
  const renderedUiSmokeEvidence = buildRenderedUiSmokeEvidence(date, statsSnapshot);
  const dashboardActionability = buildDashboardActionability(
    externalBlockerEvidence,
    dashboardSurfaceEvidence,
    chain,
  );
  const mutationBoundaryEvidence = buildMutationBoundaryEvidence(date, statsSnapshot, chainPath, chain, gscAuditPath, gscAudit);
  const verdict = classifyDashboardVerificationVerdict({
    fail,
    expectedBlocked,
    externalBlockerEvidence,
    renderedUiSmokeEvidence,
    dashboardSurfaceEvidence,
    dashboardActionability,
    mutationBoundaryEvidence,
  });
  return {
    generatedAt,
    date,
    productionMutationPerformed: false,
    cmsMutationPerformed: false,
    searchConsoleMutationPerformed: false,
    adsenseMutationPerformed: false,
    titleOrBodyMutationPerformed: false,
    commands,
    results,
    summary: {
      commands: commands.length,
      pass: results.filter((result) => result.status === "pass").length,
      expectedBlocked,
      fail,
      skipped: results.filter((result) => result.status === "skipped").length,
    },
    verdict,
    blockerSources,
    maintenanceSources,
    blockerDetails: describeRefreshFailureSources(readinessBlockingSources),
    maintenanceDetails: describeRefreshFailureSources(maintenanceSources),
    externalBlockerEvidence,
    postRecoveryShortcutCommand:
      expectedBlocked > 0 ? "pnpm dashboard:post-recovery" : "",
    postRecoveryCommands: buildDashboardPostRecoveryCommands(externalBlockerEvidence, date),
    renderedUiSmokeEvidence,
    dashboardSurfaceEvidence,
    dashboardActionability,
    postRecoveryAcceptance: buildPostRecoveryAcceptance({
      verdict,
      externalBlockerEvidence,
      renderedUiSmokeEvidence,
      dashboardSurfaceEvidence,
      dashboardActionability,
      mutationBoundaryEvidence,
    }),
    mutationBoundaryEvidence,
    statsSnapshot,
    stopCondition:
      "This verification is production/external non-mutating. It refreshes local dashboard evidence artifacts, accepts only known external readiness blockers, runs runtime smoke and proof verification, and does not authorize CMS edits, title/body edits, Search Console mutation, AdSense mutation, publishing, DNS changes, or deployment.",
  };
}

export function classifyDashboardVerificationVerdict({
  fail,
  expectedBlocked,
  externalBlockerEvidence,
  renderedUiSmokeEvidence,
  dashboardSurfaceEvidence,
  dashboardActionability,
  mutationBoundaryEvidence,
}: {
  fail: number;
  expectedBlocked: number;
  externalBlockerEvidence: ExternalBlockerEvidence[];
  renderedUiSmokeEvidence: RenderedUiSmokeEvidence;
  dashboardSurfaceEvidence: DashboardSurfaceEvidence;
  dashboardActionability: DashboardActionabilityEvidence;
  mutationBoundaryEvidence: MutationBoundaryEvidence;
}): DashboardVerificationArtifact["verdict"] {
  if (fail > 0) {
    return "failed";
  }
  const mutationBoundaryClean = isMutationBoundaryClean(mutationBoundaryEvidence);
  if (!mutationBoundaryClean) {
    return "failed";
  }
  const dashboardEvidenceCurrent =
    renderedUiSmokeEvidence.status === "current" &&
    dashboardSurfaceEvidence.status === "current";
  if (expectedBlocked > 0) {
    return dashboardEvidenceCurrent &&
      dashboardActionability.status === "blocked_for_action_until_post_recovery_verify" &&
      dashboardActionability.blockerHosts.length > 0 &&
      externalBlockerEvidence.length > 0 &&
      externalBlockerEvidence.every(isConcreteExternalBlockerEvidence)
      ? "local_verified_external_blocker"
      : "pending_verification";
  }
  if (
    dashboardEvidenceCurrent &&
    dashboardActionability.status === "safe_to_act" &&
    dashboardActionability.blockerHosts.length === 0 &&
    dashboardSurfaceEvidence.blockerHosts.length === 0
  ) {
    return "local_verified";
  }
  return "pending_verification";
}

function isMutationBoundaryClean(evidence: MutationBoundaryEvidence): boolean {
  return (
    evidence.localEvidenceArtifactsWritten === true &&
    evidence.productionMutationPerformed === false &&
    evidence.cmsMutationPerformed === false &&
    evidence.searchConsoleMutationPerformed === false &&
    evidence.adsenseMutationPerformed === false &&
    evidence.titleOrBodyMutationPerformed === false &&
    evidence.evidenceArtifacts.length > 0 &&
    evidence.evidenceArtifacts.every(isCleanMutationEvidenceArtifact)
  );
}

function isCleanMutationEvidenceArtifact(
  artifact: MutationBoundaryEvidence["evidenceArtifacts"][number],
): boolean {
  return (
    artifact.exists === true &&
    artifact.source.length > 0 &&
    artifact.path.length > 0 &&
    artifact.generatedAt.length > 0 &&
    artifact.snapshot.length > 0 &&
    mutationEvidenceFlagClean(artifact.productionMutationPerformed) &&
    mutationEvidenceFlagClean(artifact.cmsMutationPerformed) &&
    mutationEvidenceFlagClean(artifact.searchConsoleMutationPerformed) &&
    mutationEvidenceFlagClean(artifact.adsenseMutationPerformed) &&
    mutationEvidenceFlagClean(artifact.titleOrBodyMutationPerformed)
  );
}

function mutationEvidenceFlagClean(value: boolean | null): boolean {
  return value === false || value === null;
}

function buildPostRecoveryAcceptance({
  verdict,
  externalBlockerEvidence,
  renderedUiSmokeEvidence,
  dashboardSurfaceEvidence,
  dashboardActionability,
  mutationBoundaryEvidence,
}: {
  verdict: DashboardVerificationArtifact["verdict"];
  externalBlockerEvidence: ExternalBlockerEvidence[];
  renderedUiSmokeEvidence: RenderedUiSmokeEvidence;
  dashboardSurfaceEvidence: DashboardSurfaceEvidence;
  dashboardActionability: DashboardActionabilityEvidence;
  mutationBoundaryEvidence: MutationBoundaryEvidence;
}): PostRecoveryAcceptanceCriterion[] {
  return [
    {
      id: "external_gsc_access_restored",
      status:
        verdict === "local_verified"
          ? "satisfied"
          : externalBlockerEvidence.length > 0
            ? "pending_external"
            : "pending_verification",
      requirement: "Search Console access/ownership is restored for every external GSC blocker.",
      evidence:
        verdict === "local_verified"
          ? "No external GSC blocker evidence remains."
          : externalBlockerEvidence.length > 0
            ? `Pending blockers: ${externalBlockerEvidence.map((item) => item.host || "unknown").join(", ")}.`
            : `Current verdict is ${verdict}; external blocker evidence is unavailable or not current.`,
    },
    {
      id: "dashboard_verify_local_verified",
      status:
        verdict === "local_verified"
          ? "satisfied"
          : verdict === "failed"
            ? "failed"
            : "pending_verification",
      requirement: "`pnpm dashboard:verify` finishes with verdict `local_verified`.",
      evidence: `Current verdict is ${verdict}.`,
    },
    {
      id: "rendered_ui_smoke_current",
      status: renderedUiSmokeEvidence.status === "current" ? "satisfied" : "pending_verification",
      requirement: "Rendered browser UI smoke exists and matches the current stats snapshot.",
      evidence: `Rendered UI smoke status is ${renderedUiSmokeEvidence.status}.`,
    },
    {
      id: "dashboard_surface_current",
      status: dashboardSurfaceEvidence.status === "current" ? "satisfied" : "pending_verification",
      requirement: "Dashboard runtime surface evidence matches the current stats snapshot.",
      evidence: `Dashboard surface status is ${dashboardSurfaceEvidence.status}.`,
    },
    {
      id: "recommendations_safe_to_act",
      status:
        dashboardActionability.status === "safe_to_act"
          ? "satisfied"
          : dashboardActionability.status === "unknown"
            ? "pending_verification"
            : "pending_external",
      requirement: "Dashboard actions and insights are execution-ready, not read-only.",
      evidence: `Current actionability is ${dashboardActionability.status}.`,
    },
    {
      id: "mutation_boundary_clean",
      status:
        mutationBoundaryEvidence.productionMutationPerformed === false &&
        mutationBoundaryEvidence.cmsMutationPerformed === false &&
        mutationBoundaryEvidence.searchConsoleMutationPerformed === false &&
        mutationBoundaryEvidence.adsenseMutationPerformed === false &&
        mutationBoundaryEvidence.titleOrBodyMutationPerformed === false
          ? "satisfied"
          : "failed",
      requirement: "Verification remains non-mutating for production, CMS, GSC, AdSense, and title/body content.",
      evidence:
        "Mutation flags: production=false, cms=false, searchConsole=false, adsense=false, titleOrBody=false.",
    },
  ];
}

export function buildDashboardActionability(
  externalBlockerEvidence: ExternalBlockerEvidence[],
  surfaceEvidence: DashboardSurfaceEvidence,
  chain: FleetChainArtifact | undefined,
): DashboardActionabilityEvidence {
  const blockerHosts = [
    ...new Set([
      ...externalBlockerEvidence.map((evidence) => evidence.host).filter(Boolean),
      ...surfaceEvidence.blockerHosts,
    ]),
  ];
  if (
    externalBlockerEvidence.length > 0 ||
    surfaceEvidence.chainVerdict === "readiness_blocked" ||
    blockerHosts.length > 0
  ) {
    return {
      status: "blocked_for_action_until_post_recovery_verify",
      allowedUse:
        "Read-only triage is allowed; do not execute generated action/insight recommendations until post-recovery verification passes.",
      reason:
        "The dashboard surface is current, but readiness is blocked by external Search Console access, so recommendations are not execution-ready.",
      blockerHosts,
      requiredVerificationCommand: POST_RECOVERY_ACCEPTANCE_COMMAND,
    };
  }
  if (surfaceEvidence.status !== "current") {
    return {
      status: "unknown",
      allowedUse: "Read-only inspection only until dashboard surface evidence is current.",
      reason: "Dashboard surface evidence is missing or not matched to the current stats snapshot.",
      blockerHosts,
      requiredVerificationCommand: POST_RECOVERY_ACCEPTANCE_COMMAND,
    };
  }
  if (!isFleetChainArtifactSafeToAct(chain)) {
    return {
      status: "unknown",
      allowedUse:
        "Read-only inspection only until fleet chain command and verification evidence is fully successful.",
      reason:
        "Dashboard surface evidence is current, but fleet chain evidence is incomplete, failed, skipped, mismatched, or still has refresh failures.",
      blockerHosts,
      requiredVerificationCommand: POST_RECOVERY_ACCEPTANCE_COMMAND,
    };
  }
  return {
    status: "safe_to_act",
    allowedUse: "Action and insight recommendations are locally verified against the current snapshot.",
    reason: "No external readiness blocker is present and dashboard surface evidence is current.",
    blockerHosts,
    requiredVerificationCommand: POST_RECOVERY_ACCEPTANCE_COMMAND,
  };
}

function isConcreteExternalBlockerEvidence(evidence: ExternalBlockerEvidence): boolean {
  return (
    evidence.source === "gsc_permission_audit" &&
    evidence.artifactPath.length > 0 &&
    evidence.workOrderPath.length > 0 &&
    evidence.collectorSnapshot.length > 0 &&
    evidence.host.length > 0 &&
    evidence.siteId.length > 0 &&
    evidence.gscStatus.length > 0 &&
    evidence.permissionLevel.length > 0 &&
    evidence.accessState.length > 0
  );
}

function isFleetChainArtifactSafeToAct(chain: FleetChainArtifact | undefined): boolean {
  if (!chain?.summary || !chain.verification) {
    return false;
  }
  const commands = finiteNumber(chain.summary.commands);
  const pass = finiteNumber(chain.summary.pass);
  const fail = finiteNumber(chain.summary.fail);
  const skipped = finiteNumber(chain.summary.skipped);
  return (
    commands !== null &&
    pass !== null &&
    fail !== null &&
    skipped !== null &&
    commands > 0 &&
    pass === commands &&
    fail === 0 &&
    skipped === 0 &&
    stringArray(chain.verification.refreshFailedSources).length === 0 &&
    chain.verification.refreshFailuresBlockReadiness === false &&
    chain.verification.planMatchesStats === true &&
    chain.verification.handoffMatchesStats === true &&
    chain.verification.handoffMutationFlagsFalse === true
  );
}

function buildDashboardSurfaceEvidence(
  results: CommandResult[],
  statsSnapshot: string,
): DashboardSurfaceEvidence {
  const result = results.find((item) => item.id === "dashboard-smoke");
  if (!result || result.status !== "pass") {
    return {
      sourceCommand: "dashboard-smoke",
      status: "missing",
      statsSnapshot: "",
      siteCount: null,
      actionCount: null,
      insightCount: null,
      chainStatus: "",
      chainVerdict: "",
      blockerHosts: [],
    };
  }

  const output = `${result.stdoutTail}\n${result.stderrTail}`;
  const snapshot = stringFromOutput(output, "snapshot");
  const siteCount = numberFromOutput(output, "sites");
  const actionCount = numberFromOutput(output, "actions");
  const insightCount = numberFromOutput(output, "insights");
  const chainStatus = stringFromOutput(output, "chainStatus");
  const chainVerdict = stringFromOutput(output, "verdict");
  const blockers = stringFromOutput(output, "blockers");
  return {
    sourceCommand: "dashboard-smoke",
    status: snapshot && statsSnapshot && snapshot === statsSnapshot ? "current" : "unknown",
    statsSnapshot: snapshot,
    siteCount,
    actionCount,
    insightCount,
    chainStatus,
    chainVerdict,
    blockerHosts: blockers && blockers !== "none" ? blockers.split(",").filter(Boolean) : [],
  };
}

function buildRenderedUiSmokeEvidence(date: string, statsSnapshot: string): RenderedUiSmokeEvidence {
  const path = join(DATA_DIR, `dashboard-ui-smoke-${date}.json`);
  const artifact = safeReadJson<Record<string, unknown>>(path);
  const snapshot = stringValue(artifact?.generatedAt);
  const mutationStatus = isRecord(artifact?.mutationStatus)
    ? artifact.mutationStatus
    : undefined;
  return {
    path,
    exists: Boolean(artifact),
    expectedStatsSnapshot: statsSnapshot,
    statsSnapshot: snapshot,
    artifactGeneratedAt: stringValue(artifact?.artifactGeneratedAt),
    status: renderedUiSmokeStatus(Boolean(artifact), statsSnapshot, snapshot),
    productionMutationPerformed:
      booleanOrNull(artifact?.productionMutationPerformed) ??
      booleanOrNull(mutationStatus?.productionDeploymentPerformed),
    cmsMutationPerformed:
      booleanOrNull(artifact?.cmsMutationPerformed) ??
      booleanOrNull(mutationStatus?.cmsMutationPerformed),
    searchConsoleMutationPerformed:
      booleanOrNull(artifact?.searchConsoleMutationPerformed) ??
      booleanOrNull(mutationStatus?.searchConsoleMutationPerformed),
    adsenseMutationPerformed:
      booleanOrNull(artifact?.adsenseMutationPerformed) ??
      booleanOrNull(mutationStatus?.adsenseMutationPerformed),
    titleOrBodyMutationPerformed:
      booleanOrNull(artifact?.titleOrBodyMutationPerformed) ??
      booleanOrNull(mutationStatus?.titleOrBodyMutationPerformed),
  };
}

function renderedUiSmokeStatus(
  exists: boolean,
  expectedStatsSnapshot: string,
  statsSnapshot: string,
): RenderedUiSmokeEvidence["status"] {
  if (!exists) {
    return "missing";
  }
  if (!expectedStatsSnapshot || !statsSnapshot) {
    return "unknown";
  }
  return statsSnapshot === expectedStatsSnapshot ? "current" : "stale";
}

export function buildDashboardPostRecoveryCommands(
  externalBlockerEvidence: ExternalBlockerEvidence[],
  date: string,
): PostRecoveryCommand[] {
  if (externalBlockerEvidence.length === 0) {
    return [];
  }

  return [
    {
      id: "gsc-permission-audit",
      args: ["gsc:permissions:audit"],
      reason: "Confirm Search Console ownership/access is restored for the configured property.",
      requires: [],
    },
    {
      id: "dashboard-verify",
      args: ["dashboard:verify"],
      reason:
        "Refresh the dashboard snapshot and run the full local verification gate, including rendered browser evidence.",
      requires: [
        "A local dashboard dev server is running at http://127.0.0.1:3000/; start it with `pnpm dev --hostname 127.0.0.1 --port 3000` or set DASHBOARD_URL/--url.",
      ],
    },
    {
      id: "dashboard-acceptance",
      args: ["dashboard:acceptance", join(DATA_DIR, `dashboard-verification-${date}.json`)],
      reason: "Fail closed unless the exact dated dashboard verification artifact is fully post-recovery actionable.",
      requires: [
        `Run after \`pnpm dashboard:verify\` has written \`${join(DATA_DIR, `dashboard-verification-${date}.json`)}\`.`,
      ],
    },
  ];
}

function isExpectedFleetReadinessBlock(date: string): boolean {
  const chain = safeReadJson<FleetChainArtifact>(join(DATA_DIR, `fleet-optimization-chain-${date}.json`));
  const statsSnapshot = stringValue(chain?.verification?.statsSnapshot);
  const gscAudit = loadGscAuditForStatsSnapshot(statsSnapshot, date).artifact;
  return isExpectedFleetReadinessBlockArtifact(chain, gscAudit);
}

export function isExpectedFleetReadinessBlockArtifact(
  chain: FleetChainArtifact | undefined,
  gscAudit: GscPermissionAuditArtifact | undefined,
): boolean {
  if (!chain?.summary || !chain.verification) {
    return false;
  }
  const fail = finiteNumber(chain.summary.fail);
  const commands = finiteNumber(chain.summary.commands);
  const pass = finiteNumber(chain.summary.pass);
  const skipped = finiteNumber(chain.summary.skipped);
  const refreshFailedSources = stringArray(chain.verification.refreshFailedSources);
  const readinessBlockingRefreshFailedSources = refreshFailedSources.filter(
    (source) => !isMaintenanceRefreshFailure(source),
  );
  return (
    commands !== null &&
    pass !== null &&
    fail !== null &&
    skipped !== null &&
    commands > 0 &&
    pass === commands &&
    fail === 0 &&
    skipped === 0 &&
    chain.verification.refreshFailuresBlockReadiness === true &&
    readinessBlockingRefreshFailedSources.length > 0 &&
    readinessBlockingRefreshFailedSources.every(isGscAuthRefreshFailure) &&
    chain.verification.planMatchesStats === true &&
    chain.verification.handoffMatchesStats === true &&
    chain.verification.handoffMutationFlagsFalse === true &&
    gscAuditMatchesStatsSnapshot(gscAudit, chain.verification.statsSnapshot) &&
    hasConcreteGscPermissionBlocker(gscAudit)
  );
}

function isGscAuthRefreshFailure(source: string): boolean {
  return source.includes("gsc:auth_error");
}

function isMaintenanceRefreshFailure(source: string): boolean {
  return isMaintenanceRefreshFailureSource(source);
}

function hasConcreteGscPermissionBlocker(gscAudit: GscPermissionAuditArtifact | undefined): boolean {
  if (!gscAudit) {
    return false;
  }
  if (gscAudit.productionMutationPerformed !== false || gscAudit.gscMutationPerformed !== false) {
    return false;
  }
  if (!gscAuditHandoffStatusIsConsistent(gscAudit) || gscAudit.handoffStatus !== "pending_external") {
    return false;
  }
  const blockedCount =
    numberValue(gscAudit.summary?.restrictedAccess) +
    numberValue(gscAudit.summary?.unverified) +
    numberValue(gscAudit.summary?.notListed);
  if (blockedCount <= 0 || !Array.isArray(gscAudit.results)) {
    return false;
  }
  return gscAudit.results.some(isExternalGscPermissionBlockerResult);
}

function gscAuditMatchesStatsSnapshot(
  gscAudit: GscPermissionAuditArtifact | undefined,
  statsSnapshot: unknown,
): boolean {
  const snapshot = stringValue(statsSnapshot);
  return (
    Boolean(snapshot) &&
    stringValue(gscAudit?.collectorSnapshot) === `data/site-stats.json generatedAt=${snapshot}`
  );
}

export function loadGscAuditForStatsSnapshot(
  statsSnapshot: string,
  fallbackDate: string,
  dataDirectory = DATA_DIR,
): { path: string; artifact: GscPermissionAuditArtifact | undefined } {
  const fallbackPath = join(dataDirectory, `gsc-permission-audit-${fallbackDate}.json`);
  let entries: string[] = [];
  try {
    entries = readdirSync(dataDirectory);
  } catch {
    return { path: fallbackPath, artifact: safeReadJson<GscPermissionAuditArtifact>(fallbackPath) };
  }

  const latest = entries
    .filter((entry) => /^gsc-permission-audit-\d{4}-\d{2}-\d{2}\.json$/.test(entry))
    .sort()
    .reverse()[0];
  if (!latest) {
    return { path: fallbackPath, artifact: undefined };
  }
  const path = join(dataDirectory, latest);
  const artifact = safeReadJson<GscPermissionAuditArtifact>(path);
  return { path, artifact };
}

export function buildExternalBlockerEvidence(
  gscAudit: GscPermissionAuditArtifact | undefined,
  date: string,
  statsSnapshot: string,
  artifactPath: string,
): ExternalBlockerEvidence[] {
  if (
    !gscAuditMatchesStatsSnapshot(gscAudit, statsSnapshot) ||
    !Array.isArray(gscAudit?.results) ||
    !gscAuditHandoffStatusIsConsistent(gscAudit) ||
    gscAudit.handoffStatus !== "pending_external"
  ) {
    return [];
  }
  return gscAudit.results
    .filter(isExternalGscPermissionBlockerResult)
    .map((result) => ({
      source: "gsc_permission_audit" as const,
      artifactPath,
      workOrderPath: join(DOCS_DIR, `gsc-permission-audit-${auditDateFromPath(artifactPath) ?? date}.md`),
      collectorSnapshot: stringValue(gscAudit.collectorSnapshot),
      host: stringValue(result.host),
      siteId: stringValue(result.siteId),
      gscStatus: stringValue(result.gscStatus),
      permissionLevel: stringValue(result.permissionLevel),
      accessState: stringValue(result.accessState),
      requiredAction: stringValue(result.requiredAction),
    }));
}

function isExternalGscPermissionBlockerResult(
  result: NonNullable<GscPermissionAuditArtifact["results"]>[number],
): boolean {
  return (
    result.accessState !== "owner_access" &&
    (
      result.gscStatus === "auth_error" ||
      result.permissionLevel === "siteUnverifiedUser" ||
      result.accessState === "restricted_access" ||
      result.accessState === "unverified" ||
      result.accessState === "not_listed"
    )
  );
}

function gscAuditHandoffStatusIsConsistent(
  gscAudit: GscPermissionAuditArtifact | undefined,
): boolean {
  const results = Array.isArray(gscAudit?.results) ? gscAudit.results : [];
  const handoffStatus = stringValue(gscAudit?.handoffStatus);
  if (handoffStatus === "resolved") {
    return results.length === 0;
  }
  if (handoffStatus === "pending_local_refresh") {
    return (
      results.length > 0 &&
      results.every((result) => result.accessState === "owner_access")
    );
  }
  if (handoffStatus === "pending_external") {
    return (
      results.length > 0 &&
      results.some((result) => result.accessState !== "owner_access")
    );
  }
  return false;
}

function auditDateFromPath(artifactPath: string): string | null {
  return /gsc-permission-audit-(\d{4}-\d{2}-\d{2})\.json$/.exec(artifactPath)?.[1] ?? null;
}

function buildMutationBoundaryEvidence(
  date: string,
  statsSnapshot: string,
  chainPath: string,
  chain: FleetChainArtifact | undefined,
  gscAuditPath: string,
  gscAudit: GscPermissionAuditArtifact | undefined,
): MutationBoundaryEvidence {
  const artifactSpecs = [
    {
      source: "site_stats_snapshot",
      path: join(DATA_DIR, "site-stats.json"),
      artifact: safeReadJson<Record<string, unknown>>(join(DATA_DIR, "site-stats.json")),
    },
    {
      source: "site_stats_history",
      path: join(DATA_DIR, "history", `${dateFromIso(statsSnapshot) ?? date}.json`),
      artifact: safeReadJson<Record<string, unknown>>(join(DATA_DIR, "history", `${dateFromIso(statsSnapshot) ?? date}.json`)),
    },
    {
      source: "fleet_optimization_chain",
      path: chainPath,
      artifact: chain as Record<string, unknown> | undefined,
    },
    {
      source: "gsc_permission_audit",
      path: gscAuditPath,
      artifact: gscAudit as Record<string, unknown> | undefined,
    },
    {
      source: "adsense_remediation_queue",
      path: join(DATA_DIR, `adsense-remediation-queue-${date}.json`),
      artifact: safeReadJson<Record<string, unknown>>(join(DATA_DIR, `adsense-remediation-queue-${date}.json`)),
    },
    {
      source: "vercel_api_data_inventory",
      path: join(DATA_DIR, "vercel-api-data-sites.json"),
      artifact: safeReadJson<Record<string, unknown>>(join(DATA_DIR, "vercel-api-data-sites.json")),
    },
    {
      source: "fleet_optimization_plan",
      path: join(DATA_DIR, `fleet-optimization-plan-${date}.json`),
      artifact: safeReadJson<Record<string, unknown>>(join(DATA_DIR, `fleet-optimization-plan-${date}.json`)),
    },
    {
      source: "t3_title_content_handoff",
      path: join(DATA_DIR, `t3-title-content-handoff-${date}.json`),
      artifact: safeReadJson<Record<string, unknown>>(join(DATA_DIR, `t3-title-content-handoff-${date}.json`)),
    },
  ];
  return {
    localEvidenceArtifactsWritten: true,
    productionMutationPerformed: false,
    cmsMutationPerformed: false,
    searchConsoleMutationPerformed: false,
    adsenseMutationPerformed: false,
    titleOrBodyMutationPerformed: false,
    evidenceArtifacts: artifactSpecs.map(({ source, path, artifact }) =>
      buildMutationEvidenceArtifact(source, path, artifact),
    ),
  };
}

function buildMutationEvidenceArtifact(
  source: string,
  path: string,
  artifact: Record<string, unknown> | undefined,
): MutationBoundaryEvidence["evidenceArtifacts"][number] {
  const mutationStatus = isRecord(artifact?.mutationStatus)
    ? artifact.mutationStatus
    : undefined;
  const defaultNonMutating = artifact ? false : null;
  return {
    source,
    path,
    exists: Boolean(artifact),
    generatedAt: stringValue(artifact?.generatedAt),
    snapshot: artifactSnapshot(artifact),
    productionMutationPerformed:
      booleanOrNull(artifact?.productionMutationPerformed) ??
      booleanOrNull(mutationStatus?.productionDeploymentPerformed) ??
      defaultNonMutating,
    cmsMutationPerformed:
      booleanOrNull(artifact?.cmsMutationPerformed) ??
      booleanOrNull(mutationStatus?.cmsMutationPerformed) ??
      defaultNonMutating,
    searchConsoleMutationPerformed:
      booleanOrNull(artifact?.searchConsoleMutationPerformed) ??
      booleanOrNull(artifact?.gscMutationPerformed) ??
      booleanOrNull(mutationStatus?.searchConsoleMutationPerformed) ??
      defaultNonMutating,
    adsenseMutationPerformed:
      booleanOrNull(artifact?.adsenseMutationPerformed) ??
      booleanOrNull(mutationStatus?.adsenseMutationPerformed) ??
      defaultNonMutating,
    titleOrBodyMutationPerformed:
      booleanOrNull(artifact?.titleOrBodyMutationPerformed) ??
      booleanOrNull(mutationStatus?.titleOrBodyMutationPerformed) ??
      defaultNonMutating,
  };
}

function artifactSnapshot(artifact: Record<string, unknown> | undefined): string {
  const dashboardEvidence = isRecord(artifact?.dashboardEvidence)
    ? artifact.dashboardEvidence
    : undefined;
  const verification = isRecord(artifact?.verification) ? artifact.verification : undefined;
  return (
    stringValue(artifact?.collectorSnapshot) ||
    stringValue(artifact?.snapshotTimestamp) ||
    stringValue(dashboardEvidence?.snapshotTimestamp) ||
    stringValue(verification?.statsSnapshot) ||
    stringValue(artifact?.generatedAt)
  );
}

function skippedResult(command: VerificationCommand, reason: string): CommandResult {
  return {
    id: command.id,
    status: "skipped",
    exitCode: null,
    stdoutTail: reason,
    stderrTail: "",
  };
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

export function renderMarkdown(artifact: DashboardVerificationArtifact): string {
  return `# Dashboard Verification - ${artifact.date}

Mutation status: production/external systems were not mutated; local dashboard evidence artifacts were refreshed.

- Generated at: \`${artifact.generatedAt}\`
- Stats snapshot: \`${artifact.statsSnapshot || "unavailable"}\`
- Verdict: \`${artifact.verdict}\`
- External blocker sources: ${artifact.blockerSources.length > 0 ? artifact.blockerSources.map((source) => `\`${source}\``).join(", ") : "`none`"}
- Maintenance sources: ${artifact.maintenanceSources.length > 0 ? artifact.maintenanceSources.map((source) => `\`${source}\``).join(", ") : "`none`"}
- External blocker evidence: ${artifact.externalBlockerEvidence.length > 0 ? artifact.externalBlockerEvidence.map((evidence) => `\`${evidence.host || "unknown"}:${evidence.permissionLevel || "unknown"}:${evidence.accessState || "unknown"}\``).join(", ") : "`none`"}

## Refresh Failure Details

| Severity | Label | Source | Next step |
|---|---|---|---|
${[...artifact.blockerDetails, ...artifact.maintenanceDetails].map((detail) => `| \`${detail.severity}\` | ${detail.label} | \`${detail.source}\` | ${detail.nextStep} |`).join("\n") || "| `none` | none | `none` | none |"}

## External Blocker Evidence

${artifact.externalBlockerEvidence.length > 0 ? artifact.externalBlockerEvidence.map((evidence) => `- \`${evidence.host}\` (\`${evidence.siteId || "unknown"}\`): \`${evidence.gscStatus}\`, \`${evidence.permissionLevel}\`, \`${evidence.accessState}\`; required action \`${evidence.requiredAction}\`; work order \`${evidence.workOrderPath}\`.`).join("\n") : "- `none`"}

## Post-Recovery Verification

${artifact.postRecoveryShortcutCommand ? `Shortcut: \`${artifact.postRecoveryShortcutCommand}\`\n` : ""}
${artifact.postRecoveryCommands.length > 0 ? artifact.postRecoveryCommands.map(renderPostRecoveryCommand).join("\n") : "- `none`"}

## Rendered UI Smoke Evidence

- Path: \`${artifact.renderedUiSmokeEvidence.path}\`
- Exists: \`${artifact.renderedUiSmokeEvidence.exists}\`
- Status: \`${artifact.renderedUiSmokeEvidence.status}\`
- Expected stats snapshot: \`${artifact.renderedUiSmokeEvidence.expectedStatsSnapshot || "unavailable"}\`
- UI smoke stats snapshot: \`${artifact.renderedUiSmokeEvidence.statsSnapshot || "unavailable"}\`
- Artifact generated at: \`${artifact.renderedUiSmokeEvidence.artifactGeneratedAt || "unavailable"}\`

## Dashboard Surface Evidence

- Source command: \`${artifact.dashboardSurfaceEvidence.sourceCommand}\`
- Status: \`${artifact.dashboardSurfaceEvidence.status}\`
- Stats snapshot: \`${artifact.dashboardSurfaceEvidence.statsSnapshot || "unavailable"}\`
- Sites: \`${formatNullableNumber(artifact.dashboardSurfaceEvidence.siteCount)}\`
- Actions: \`${formatNullableNumber(artifact.dashboardSurfaceEvidence.actionCount)}\`
- Insights: \`${formatNullableNumber(artifact.dashboardSurfaceEvidence.insightCount)}\`
- Fleet chain status: \`${artifact.dashboardSurfaceEvidence.chainStatus || "unavailable"}\`
- Fleet verdict: \`${artifact.dashboardSurfaceEvidence.chainVerdict || "unavailable"}\`
- Blocker hosts: ${artifact.dashboardSurfaceEvidence.blockerHosts.length > 0 ? artifact.dashboardSurfaceEvidence.blockerHosts.map((host) => `\`${host}\``).join(", ") : "`none`"}

## Dashboard Actionability

- Status: \`${artifact.dashboardActionability.status}\`
- Allowed use: ${artifact.dashboardActionability.allowedUse}
- Reason: ${artifact.dashboardActionability.reason}
- Blocker hosts: ${artifact.dashboardActionability.blockerHosts.length > 0 ? artifact.dashboardActionability.blockerHosts.map((host) => `\`${host}\``).join(", ") : "`none`"}
- Required verification command: \`${artifact.dashboardActionability.requiredVerificationCommand}\`

## Post-Recovery Acceptance

| Status | Criterion | Requirement | Evidence |
|---|---|---|---|
${artifact.postRecoveryAcceptance.map((item) => `| \`${item.status}\` | \`${item.id}\` | ${item.requirement} | ${item.evidence} |`).join("\n")}

## Mutation Boundary

- Local evidence artifacts written: \`${artifact.mutationBoundaryEvidence.localEvidenceArtifactsWritten}\`
- Production mutation: \`${artifact.mutationBoundaryEvidence.productionMutationPerformed}\`
- CMS mutation: \`${artifact.mutationBoundaryEvidence.cmsMutationPerformed}\`
- Search Console mutation: \`${artifact.mutationBoundaryEvidence.searchConsoleMutationPerformed}\`
- AdSense mutation: \`${artifact.mutationBoundaryEvidence.adsenseMutationPerformed}\`
- Title/body mutation: \`${artifact.mutationBoundaryEvidence.titleOrBodyMutationPerformed}\`

## Evidence Artifact Inventory

| Source | Path | Exists | Snapshot | Production | CMS | GSC | AdSense | Title/body |
|---|---|---:|---|---:|---:|---:|---:|---:|
${artifact.mutationBoundaryEvidence.evidenceArtifacts.map((item) => `| \`${item.source}\` | \`${item.path}\` | \`${item.exists}\` | \`${item.snapshot || "unknown"}\` | \`${formatNullableBoolean(item.productionMutationPerformed)}\` | \`${formatNullableBoolean(item.cmsMutationPerformed)}\` | \`${formatNullableBoolean(item.searchConsoleMutationPerformed)}\` | \`${formatNullableBoolean(item.adsenseMutationPerformed)}\` | \`${formatNullableBoolean(item.titleOrBodyMutationPerformed)}\` |`).join("\n")}

## Commands

| Step | Status | Exit |
|---|---|---:|
${artifact.results.map((result) => `| \`${result.id}\` | \`${result.status}\` | ${result.exitCode ?? "null"} |`).join("\n")}

## Stop Condition

${artifact.stopCondition}
`;
}

function renderPostRecoveryCommand(command: PostRecoveryCommand, index: number): string {
  const requires =
    command.requires.length > 0
      ? `\n   - Requires: ${command.requires.join(" ")}`
      : "";
  return `${index + 1}. \`pnpm ${command.args.join(" ")}\` - ${command.reason}${requires}`;
}

function formatNullableBoolean(value: boolean | null): string {
  return value === null ? "n/a" : String(value);
}

function formatNullableNumber(value: number | null): string {
  return value === null ? "n/a" : String(value);
}

function tail(value: string, max = 4000): string {
  return value.length > max ? value.slice(-max) : value;
}

function sanitizeCommandOutput(value: string): string {
  return value.replace(/\u2009/g, " ");
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function stringFromOutput(output: string, key: string): string {
  const match = new RegExp(`(?:^|\\s)${escapeRegExp(key)}=([^\\s]+)`).exec(output);
  return match?.[1] ?? "";
}

function numberFromOutput(output: string, key: string): number | null {
  const value = stringFromOutput(output, key);
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dateFromIso(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T/.exec(value);
  return match?.[1] ?? null;
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
