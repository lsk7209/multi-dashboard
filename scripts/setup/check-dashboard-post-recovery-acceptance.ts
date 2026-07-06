import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DATA_DIR = "data";
const REQUIRED_POST_RECOVERY_ACCEPTANCE_IDS = [
  "external_gsc_access_restored",
  "dashboard_verify_local_verified",
  "rendered_ui_smoke_current",
  "dashboard_surface_current",
  "recommendations_safe_to_act",
  "mutation_boundary_clean",
];

interface DashboardVerificationAcceptanceArtifact {
  date?: unknown;
  generatedAt?: unknown;
  statsSnapshot?: unknown;
  verdict?: unknown;
  summary?: {
    expectedBlocked?: unknown;
    fail?: unknown;
    skipped?: unknown;
  };
  externalBlockerEvidence?: unknown;
  dashboardActionability?: {
    status?: unknown;
    blockerHosts?: unknown;
  };
  renderedUiSmokeEvidence?: {
    status?: unknown;
    expectedStatsSnapshot?: unknown;
    statsSnapshot?: unknown;
  };
  dashboardSurfaceEvidence?: {
    status?: unknown;
    statsSnapshot?: unknown;
    blockerHosts?: unknown;
  };
  postRecoveryAcceptance?: unknown;
  productionMutationPerformed?: unknown;
  cmsMutationPerformed?: unknown;
  searchConsoleMutationPerformed?: unknown;
  adsenseMutationPerformed?: unknown;
  titleOrBodyMutationPerformed?: unknown;
  mutationBoundaryEvidence?: {
    localEvidenceArtifactsWritten?: unknown;
    productionMutationPerformed?: unknown;
    cmsMutationPerformed?: unknown;
    searchConsoleMutationPerformed?: unknown;
    adsenseMutationPerformed?: unknown;
    titleOrBodyMutationPerformed?: unknown;
    evidenceArtifacts?: unknown;
  };
}

interface AcceptanceCheck {
  id: string;
  pass: boolean;
  evidence: string;
}

interface AcceptanceResult {
  artifactPath: string;
  ready: boolean;
  checks: AcceptanceCheck[];
}

interface AcceptanceOptions {
  currentStatsSnapshot?: string;
}

function main(): void {
  const artifactPath = process.argv[2] ?? findLatestDashboardVerificationArtifact(DATA_DIR, seoulDate(new Date()));
  if (!artifactPath) {
    console.error("No dashboard verification artifact found. Run `pnpm dashboard:verify` first.");
    process.exitCode = 1;
    return;
  }

  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as DashboardVerificationAcceptanceArtifact;
  const result = evaluateDashboardPostRecoveryAcceptance(artifact, artifactPath, {
    currentStatsSnapshot: readCurrentStatsSnapshot(DATA_DIR),
  });
  const failed = result.checks.filter((check) => !check.pass);

  console.log(
    [
      `artifact=${result.artifactPath}`,
      `ready=${result.ready}`,
      `pass=${result.checks.length - failed.length}`,
      `fail=${failed.length}`,
    ].join(" "),
  );

  for (const check of failed) {
    console.log(`FAIL ${check.id}: ${check.evidence}`);
  }

  if (!result.ready) {
    process.exitCode = 1;
  }
}

export function evaluateDashboardPostRecoveryAcceptance(
  artifact: DashboardVerificationAcceptanceArtifact,
  artifactPath = "",
  options: AcceptanceOptions = {},
): AcceptanceResult {
  const summary = artifact.summary ?? {};
  const hasExternalBlockerEvidence = Array.isArray(artifact.externalBlockerEvidence);
  const externalBlockers = hasExternalBlockerEvidence ? artifact.externalBlockerEvidence as unknown[] : [];
  const hasActionabilityBlockerHosts = Array.isArray(artifact.dashboardActionability?.blockerHosts);
  const actionabilityBlockerHosts = hasActionabilityBlockerHosts
    ? stringArray(artifact.dashboardActionability?.blockerHosts)
    : [];
  const hasSurfaceBlockerHosts = Array.isArray(artifact.dashboardSurfaceEvidence?.blockerHosts);
  const surfaceBlockerHosts = hasSurfaceBlockerHosts
    ? stringArray(artifact.dashboardSurfaceEvidence?.blockerHosts)
    : [];
  const hasPostRecoveryAcceptance = Array.isArray(artifact.postRecoveryAcceptance);
  const postRecoveryAcceptance = hasPostRecoveryAcceptance ? artifact.postRecoveryAcceptance as unknown[] : [];
  const postRecoveryAcceptanceIds = postRecoveryAcceptance
    .filter(isRecord)
    .map((item) => (typeof item.id === "string" ? item.id : ""));
  const hasMutationEvidenceArtifacts = Array.isArray(artifact.mutationBoundaryEvidence?.evidenceArtifacts);
  const mutationEvidenceArtifacts = hasMutationEvidenceArtifacts
    ? artifact.mutationBoundaryEvidence?.evidenceArtifacts as unknown[]
    : [];
  const artifactDate = typeof artifact.date === "string" ? artifact.date : "";
  const pathDate = dateFromDashboardVerificationPath(artifactPath);
  const generatedAt = typeof artifact.generatedAt === "string" ? artifact.generatedAt : "";
  const statsSnapshot = typeof artifact.statsSnapshot === "string" ? artifact.statsSnapshot : "";
  const currentStatsSnapshot = options.currentStatsSnapshot ?? statsSnapshot;
  const renderedExpectedSnapshot =
    typeof artifact.renderedUiSmokeEvidence?.expectedStatsSnapshot === "string"
      ? artifact.renderedUiSmokeEvidence.expectedStatsSnapshot
      : "";
  const renderedStatsSnapshot =
    typeof artifact.renderedUiSmokeEvidence?.statsSnapshot === "string"
      ? artifact.renderedUiSmokeEvidence.statsSnapshot
      : "";
  const surfaceStatsSnapshot =
    typeof artifact.dashboardSurfaceEvidence?.statsSnapshot === "string"
      ? artifact.dashboardSurfaceEvidence.statsSnapshot
      : "";

  const checks: AcceptanceCheck[] = [
    {
      id: "artifact_identity_current",
      pass:
        artifactDate.length > 0 &&
        (!pathDate || artifactDate === pathDate) &&
        isIsoTimestamp(generatedAt) &&
        isIsoTimestamp(statsSnapshot) &&
        statsSnapshot === currentStatsSnapshot,
      evidence: `date=${artifactDate || "missing"} pathDate=${pathDate || "n/a"} generatedAt=${generatedAt || "missing"} statsSnapshot=${statsSnapshot || "missing"} currentStatsSnapshot=${currentStatsSnapshot || "missing"}`,
    },
    {
      id: "snapshot_evidence_aligned",
      pass:
        statsSnapshot.length > 0 &&
        renderedExpectedSnapshot === statsSnapshot &&
        renderedStatsSnapshot === statsSnapshot &&
        surfaceStatsSnapshot === statsSnapshot,
      evidence: `artifact=${statsSnapshot || "missing"} renderedExpected=${renderedExpectedSnapshot || "missing"} rendered=${renderedStatsSnapshot || "missing"} surface=${surfaceStatsSnapshot || "missing"}`,
    },
    {
      id: "verdict_local_verified",
      pass: artifact.verdict === "local_verified",
      evidence: `verdict=${String(artifact.verdict ?? "missing")}`,
    },
    {
      id: "summary_clean",
      pass: summary.expectedBlocked === 0 && summary.fail === 0 && summary.skipped === 0,
      evidence: `expectedBlocked=${String(summary.expectedBlocked ?? "missing")} fail=${String(summary.fail ?? "missing")} skipped=${String(summary.skipped ?? "missing")}`,
    },
    {
      id: "external_blockers_cleared",
      pass: hasExternalBlockerEvidence && externalBlockers.length === 0,
      evidence: hasExternalBlockerEvidence
        ? `externalBlockerEvidence=${externalBlockers.length}`
        : "externalBlockerEvidence=missing_or_malformed",
    },
    {
      id: "dashboard_safe_to_act",
      pass:
        artifact.dashboardActionability?.status === "safe_to_act" &&
        hasActionabilityBlockerHosts &&
        actionabilityBlockerHosts.length === 0,
      evidence: `status=${String(artifact.dashboardActionability?.status ?? "missing")} blockerHosts=${hasActionabilityBlockerHosts ? formatList(actionabilityBlockerHosts) : "missing_or_malformed"}`,
    },
    {
      id: "rendered_ui_smoke_current",
      pass: artifact.renderedUiSmokeEvidence?.status === "current",
      evidence: `status=${String(artifact.renderedUiSmokeEvidence?.status ?? "missing")}`,
    },
    {
      id: "dashboard_surface_current",
      pass:
        artifact.dashboardSurfaceEvidence?.status === "current" &&
        hasSurfaceBlockerHosts &&
        surfaceBlockerHosts.length === 0,
      evidence: `status=${String(artifact.dashboardSurfaceEvidence?.status ?? "missing")} blockerHosts=${hasSurfaceBlockerHosts ? formatList(surfaceBlockerHosts) : "missing_or_malformed"}`,
    },
    {
      id: "post_recovery_rows_satisfied",
      pass:
        hasExactPostRecoveryAcceptanceIds(postRecoveryAcceptanceIds) &&
        postRecoveryAcceptance.every(isSatisfiedPostRecoveryAcceptanceRow),
      evidence: !hasPostRecoveryAcceptance
        ? "missing_or_malformed"
        : postRecoveryAcceptance.length > 0
        ? postRecoveryAcceptance
            .map((item) =>
              isRecord(item) ? `${String(item.id ?? "unknown")}=${String(item.status ?? "missing")}` : "invalid_row",
            )
            .join(",")
        : "missing",
    },
    {
      id: "mutation_boundary_clean",
      pass:
        artifact.productionMutationPerformed === false &&
        artifact.cmsMutationPerformed === false &&
        artifact.searchConsoleMutationPerformed === false &&
        artifact.adsenseMutationPerformed === false &&
        artifact.titleOrBodyMutationPerformed === false &&
        artifact.mutationBoundaryEvidence?.localEvidenceArtifactsWritten === true &&
        artifact.mutationBoundaryEvidence?.productionMutationPerformed === false &&
        artifact.mutationBoundaryEvidence?.cmsMutationPerformed === false &&
        artifact.mutationBoundaryEvidence?.searchConsoleMutationPerformed === false &&
        artifact.mutationBoundaryEvidence?.adsenseMutationPerformed === false &&
        artifact.mutationBoundaryEvidence?.titleOrBodyMutationPerformed === false &&
        hasMutationEvidenceArtifacts &&
        mutationEvidenceArtifacts.length > 0 &&
        mutationEvidenceArtifacts.every((artifact) =>
          isValidMutationEvidenceArtifact(artifact, statsSnapshot),
        ),
      evidence: `topLevel=${formatMutationFlags(artifact)} boundary=${formatMutationFlags(artifact.mutationBoundaryEvidence ?? {})} localEvidenceArtifactsWritten=${String(artifact.mutationBoundaryEvidence?.localEvidenceArtifactsWritten ?? "missing")} evidenceArtifacts=${hasMutationEvidenceArtifacts ? mutationEvidenceArtifacts.length : "missing_or_malformed"}`,
    },
  ];

  return {
    artifactPath,
    ready: checks.every((check) => check.pass),
    checks,
  };
}

export function findLatestDashboardVerificationArtifact(dataDir: string, date = seoulDate(new Date())): string {
  if (!existsSync(dataDir)) {
    return "";
  }

  const expected = `dashboard-verification-${date}.json`;
  return readdirSync(dataDir).includes(expected) ? join(dataDir, expected) : "";
}

function readCurrentStatsSnapshot(dataDir: string): string {
  const artifact = safeReadJson(join(dataDir, "site-stats.json"));
  return typeof artifact?.generatedAt === "string" ? artifact.generatedAt : "";
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

function dateFromDashboardVerificationPath(path: string): string {
  const match = /dashboard-verification-(\d{4}-\d{2}-\d{2})\.json$/.exec(path.replaceAll("\\", "/"));
  return match?.[1] ?? "";
}

function isIsoTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value);
}

function seoulDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function hasExactPostRecoveryAcceptanceIds(ids: string[]): boolean {
  return (
    ids.length === REQUIRED_POST_RECOVERY_ACCEPTANCE_IDS.length &&
    REQUIRED_POST_RECOVERY_ACCEPTANCE_IDS.every((id) => ids.includes(id)) &&
    new Set(ids).size === ids.length
  );
}

function isValidMutationEvidenceArtifact(
  value: unknown,
  currentStatsSnapshot: string,
): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const mutationKeys = [
    "productionMutationPerformed",
    "cmsMutationPerformed",
    "searchConsoleMutationPerformed",
    "adsenseMutationPerformed",
    "titleOrBodyMutationPerformed",
  ];
  const source = typeof value.source === "string" ? value.source : "";
  const snapshot = typeof value.snapshot === "string" ? value.snapshot : "";
  return (
    typeof value.source === "string" &&
    value.source.length > 0 &&
    typeof value.path === "string" &&
    value.path.length > 0 &&
    value.exists === true &&
    snapshot.length > 0 &&
    mutationEvidenceSnapshotMatchesSource(source, snapshot, currentStatsSnapshot) &&
    mutationKeys.every((key) => value[key] === false || value[key] === null)
  );
}

function isSatisfiedPostRecoveryAcceptanceRow(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.status === "satisfied" &&
    typeof value.id === "string" &&
    REQUIRED_POST_RECOVERY_ACCEPTANCE_IDS.includes(value.id) &&
    typeof value.requirement === "string" &&
    value.requirement.trim().length > 0 &&
    typeof value.evidence === "string" &&
    value.evidence.trim().length > 0
  );
}

function mutationEvidenceSnapshotMatchesSource(
  source: string,
  snapshot: string,
  currentStatsSnapshot: string,
): boolean {
  const statsBoundSources = new Set([
    "site_stats_snapshot",
    "site_stats_history",
    "fleet_optimization_chain",
    "gsc_permission_audit",
    "adsense_remediation_queue",
    "fleet_optimization_plan",
    "t3_title_content_handoff",
  ]);
  if (!statsBoundSources.has(source)) {
    return true;
  }
  return (
    snapshot === currentStatsSnapshot ||
    snapshot === `data/site-stats.json generatedAt=${currentStatsSnapshot}`
  );
}

function formatMutationFlags(value: Record<string, unknown>): string {
  return [
    `production=${String(value.productionMutationPerformed ?? "missing")}`,
    `cms=${String(value.cmsMutationPerformed ?? "missing")}`,
    `gsc=${String(value.searchConsoleMutationPerformed ?? "missing")}`,
    `adsense=${String(value.adsenseMutationPerformed ?? "missing")}`,
    `titleOrBody=${String(value.titleOrBodyMutationPerformed ?? "missing")}`,
  ].join("/");
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(",") : "none";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
