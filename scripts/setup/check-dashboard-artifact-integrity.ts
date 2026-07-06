import { existsSync, readFileSync } from "node:fs";
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

interface IntegrityCheck {
  id: string;
  pass: boolean;
  evidence: string;
}

interface IntegrityResult {
  date: string;
  ready: boolean;
  checks: IntegrityCheck[];
}

interface IntegrityInput {
  date: string;
  siteStats: Record<string, unknown> | null;
  verification: Record<string, unknown> | null;
  uiSmoke: Record<string, unknown> | null;
  postRecovery: Record<string, unknown> | null;
  verificationMarkdown?: string | null;
  uiSmokeMarkdown?: string | null;
  postRecoveryMarkdown?: string | null;
  auditArtifacts?: Record<string, Record<string, unknown> | null>;
  auditMarkdowns?: Record<string, string | null>;
  allowMissingPostWriteIntegrity?: boolean;
}

function main(): void {
  const options = parseCliOptions(process.argv.slice(2));
  const input = {
    ...readIntegrityInput(options.date),
    allowMissingPostWriteIntegrity: options.allowMissingPostWriteIntegrity,
  };
  const result = evaluateDashboardArtifactIntegrity(input);
  const failed = result.checks.filter((check) => !check.pass);

  console.log(
    [
      `date=${result.date}`,
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

export function evaluateDashboardArtifactIntegrity(input: IntegrityInput): IntegrityResult {
  const currentSnapshot = stringValue(input.siteStats?.generatedAt);
  const verificationSnapshot = stringValue(input.verification?.statsSnapshot);
  const renderedEvidence = recordValue(input.verification?.renderedUiSmokeEvidence);
  const surfaceEvidence = recordValue(input.verification?.dashboardSurfaceEvidence);
  const summary = recordValue(input.verification?.summary);
  const actionability = recordValue(input.verification?.dashboardActionability);
  const postSnapshot = recordValue(input.postRecovery?.dashboardVerification);
  const externalBlockers = arrayValue(input.verification?.externalBlockerEvidence);
  const actionabilityHosts = stringArray(actionability?.blockerHosts);
  const surfaceHosts = stringArray(surfaceEvidence?.blockerHosts);
  const uiSmokeHosts = stringArray(input.uiSmoke?.blockerHosts);
  const externalHosts = externalBlockers
    .filter(isRecord)
    .map((item) => stringValue(item.host))
    .filter(Boolean);
  const postRecoveryAcceptance = arrayValue(input.verification?.postRecoveryAcceptance);
  const verdict = stringValue(input.verification?.verdict);
  const blockerSources = stringArray(input.verification?.blockerSources);
  const blockerDetailSources = arrayValue(input.verification?.blockerDetails)
    .filter(isRecord)
    .map((item) => stringValue(item.source));
  const verificationPostRecoveryCommands = arrayValue(input.verification?.postRecoveryCommands);
  const postResults = arrayValue(input.postRecovery?.results);
  const postCommands = arrayValue(input.postRecovery?.commands);

  const checks: IntegrityCheck[] = [
    {
      id: "required_artifacts_exist",
      pass: Boolean(input.siteStats && input.verification && input.uiSmoke && input.postRecovery),
      evidence: `siteStats=${Boolean(input.siteStats)} verification=${Boolean(input.verification)} uiSmoke=${Boolean(input.uiSmoke)} postRecovery=${Boolean(input.postRecovery)}`,
    },
    {
      id: "current_snapshot_aligned",
      pass:
        stringValue(input.verification?.date) === input.date &&
        isIsoTimestamp(stringValue(input.verification?.generatedAt)) &&
        isIsoTimestamp(currentSnapshot) &&
        verificationSnapshot === currentSnapshot &&
        stringValue(input.uiSmoke?.date) === input.date &&
        stringValue(renderedEvidence?.path) === join(DATA_DIR, `dashboard-ui-smoke-${input.date}.json`) &&
        stringValue(renderedEvidence?.expectedStatsSnapshot) === currentSnapshot &&
        stringValue(renderedEvidence?.statsSnapshot) === currentSnapshot &&
        stringValue(surfaceEvidence?.statsSnapshot) === currentSnapshot &&
        stringValue(input.uiSmoke?.generatedAt) === currentSnapshot &&
        stringValue(postSnapshot?.statsSnapshot) === currentSnapshot,
      evidence: `current=${currentSnapshot || "missing"} verification=${verificationSnapshot || "missing"} renderedExpected=${stringValue(renderedEvidence?.expectedStatsSnapshot) || "missing"} rendered=${stringValue(renderedEvidence?.statsSnapshot) || "missing"} surface=${stringValue(surfaceEvidence?.statsSnapshot) || "missing"} ui=${stringValue(input.uiSmoke?.generatedAt) || "missing"} post=${stringValue(postSnapshot?.statsSnapshot) || "missing"}`,
    },
    {
      id: "post_recovery_matches_verification",
      pass:
        stringValue(postSnapshot?.path) === join(DATA_DIR, `dashboard-verification-${input.date}.json`) &&
        stringValue(postSnapshot?.verdict) === verdict &&
        finiteNumber(postSnapshot?.expectedBlocked) !== null &&
        finiteNumber(postSnapshot?.expectedBlocked) === finiteNumber(summary?.expectedBlocked) &&
        finiteNumber(postSnapshot?.fail) !== null &&
        finiteNumber(postSnapshot?.fail) === finiteNumber(summary?.fail) &&
        finiteNumber(postSnapshot?.skipped) !== null &&
        finiteNumber(postSnapshot?.skipped) === finiteNumber(summary?.skipped) &&
        finiteNumber(postSnapshot?.externalBlockerEvidenceCount) === externalBlockers.length &&
        stringValue(postSnapshot?.actionabilityStatus) === stringValue(actionability?.status) &&
        sameStrings(stringArray(postSnapshot?.actionabilityBlockerHosts), actionabilityHosts) &&
        sameStrings(stringArray(postSnapshot?.surfaceBlockerHosts), surfaceHosts) &&
        sameStrings(stringArray(postSnapshot?.postRecoveryAcceptance), acceptanceRows(postRecoveryAcceptance)) &&
        postRecoveryCommandContractMatches(verdict, verificationPostRecoveryCommands, postCommands),
      evidence: `verdict=${verdict || "missing"}/${stringValue(postSnapshot?.verdict) || "missing"} expectedBlocked=${numberValue(summary?.expectedBlocked)}/${numberValue(postSnapshot?.expectedBlocked)} fail=${numberValue(summary?.fail)}/${numberValue(postSnapshot?.fail)} skipped=${numberValue(summary?.skipped)}/${numberValue(postSnapshot?.skipped)} externalBlockers=${externalBlockers.length}/${numberValue(postSnapshot?.externalBlockerEvidenceCount)} actionability=${stringValue(actionability?.status) || "missing"}/${stringValue(postSnapshot?.actionabilityStatus) || "missing"}`,
    },
    {
      id: "blocker_evidence_concrete",
      pass:
        verdict !== "local_verified_external_blocker" ||
        (
          blockerSources.length > 0 &&
          blockerSources.every((source) => blockerDetailSources.includes(source)) &&
          externalBlockers.length > 0 &&
          externalBlockers.every((blocker) =>
            externalBlockerMatchesAudit(
              blocker,
              verificationSnapshot,
              input.auditArtifacts,
              input.auditMarkdowns,
            ),
          )
        ),
      evidence: `blockerSources=${formatList(blockerSources)} blockerDetails=${formatList(blockerDetailSources)} externalBlockers=${externalBlockers.length}`,
    },
    {
      id: "blocker_hosts_aligned",
      pass:
        verdict !== "local_verified_external_blocker" ||
        (
          sameStrings(actionabilityHosts, externalHosts) &&
          sameStrings(surfaceHosts, externalHosts) &&
          sameStrings(uiSmokeHosts, externalHosts)
        ),
      evidence: `actionability=${formatList(actionabilityHosts)} surface=${formatList(surfaceHosts)} uiSmoke=${formatList(uiSmokeHosts)} external=${formatList(externalHosts)}`,
    },
    {
      id: "actionability_commands_aligned",
      pass:
        verdict !== "local_verified_external_blocker" ||
        (
          stringValue(input.verification?.postRecoveryShortcutCommand) === "pnpm dashboard:post-recovery" &&
          stringValue(actionability?.requiredVerificationCommand) === "pnpm dashboard:post-recovery" &&
          stringValue(input.uiSmoke?.actionabilityCommand) === "pnpm dashboard:post-recovery"
        ),
      evidence: `shortcut=${stringValue(input.verification?.postRecoveryShortcutCommand) || "none"} actionability=${stringValue(actionability?.requiredVerificationCommand) || "none"} uiSmoke=${stringValue(input.uiSmoke?.actionabilityCommand) || "none"}`,
    },
    {
      id: "commands_and_tails_consistent",
      pass:
        commandIdsMatch(postCommands, postResults) &&
        commandResultsClean(postResults) &&
        postSummaryMatchesResults(input.postRecovery, postResults) &&
        commandFailuresAllowed(input.postRecovery, postResults, externalBlockers) &&
        commandTailSnapshotsMatch(postResults, verificationSnapshot),
      evidence: `commands=${commandIds(postCommands).join(">") || "missing"} results=${commandIds(postResults).join(">") || "missing"} summary=${formatPostSummary(input.postRecovery)} tailSnapshots=${formatTailSnapshots(postResults)}`,
    },
    {
      id: "post_write_integrity_clean",
      pass: postWriteIntegrityClean(input.postRecovery, input.date, input.allowMissingPostWriteIntegrity === true),
      evidence: formatPostWriteIntegrity(input.postRecovery),
    },
    {
      id: "markdown_mirrors_json",
      pass: markdownMirrorsJson({
        input,
        currentSnapshot,
        verificationSnapshot,
        verdict,
        externalHosts,
        actionability,
        postSnapshot,
        postResults,
      }),
      evidence: `verificationMd=${Boolean(input.verificationMarkdown)} uiSmokeMd=${Boolean(input.uiSmokeMarkdown)} postRecoveryMd=${Boolean(input.postRecoveryMarkdown)} snapshot=${verificationSnapshot || "missing"} verdict=${verdict || "missing"} hosts=${formatList(externalHosts)}`,
    },
    {
      id: "verdict_state_consistent",
      pass: isVerdictStateConsistent({
        verdict,
        summary,
        externalBlockers,
        actionability,
        actionabilityHosts,
        surfaceHosts,
        uiSmokeHosts,
        postRecovery: input.postRecovery,
        postRecoveryAcceptance,
      }),
      evidence: `verdict=${verdict || "missing"} expectedBlocked=${numberValue(summary?.expectedBlocked)} externalBlockers=${externalBlockers.length} actionability=${stringValue(actionability?.status) || "missing"} actionabilityHosts=${formatList(actionabilityHosts)} surfaceHosts=${formatList(surfaceHosts)} readiness=${stringValue(input.postRecovery?.readiness) || "missing"}`,
    },
    {
      id: "post_recovery_rows_exact",
      pass: hasExactPostRecoveryRows(postRecoveryAcceptance, true),
      evidence: postRecoveryAcceptance
        .map((item) => isRecord(item) ? `${stringValue(item.id)}=${stringValue(item.status)}` : "invalid_row")
        .join(",") || "missing",
    },
    {
      id: "mutation_boundary_clean",
      pass:
        mutationFlagsClean(input.verification) &&
        mutationFlagsClean(input.uiSmoke) &&
        mutationFlagsClean(input.postRecovery) &&
        mutationBoundaryClean(recordValue(input.verification?.mutationBoundaryEvidence)),
      evidence: `verification=${formatMutationFlags(input.verification)} uiSmoke=${formatMutationFlags(input.uiSmoke)} postRecovery=${formatMutationFlags(input.postRecovery)}`,
    },
  ];

  return {
    date: input.date,
    ready: checks.every((check) => check.pass),
    checks,
  };
}

function isVerdictStateConsistent({
  verdict,
  summary,
  externalBlockers,
  actionability,
  actionabilityHosts,
  surfaceHosts,
  uiSmokeHosts,
  postRecovery,
  postRecoveryAcceptance,
}: {
  verdict: string;
  summary: Record<string, unknown> | undefined;
  externalBlockers: unknown[];
  actionability: Record<string, unknown> | undefined;
  actionabilityHosts: string[];
  surfaceHosts: string[];
  uiSmokeHosts: string[];
  postRecovery: Record<string, unknown> | null;
  postRecoveryAcceptance: unknown[];
}): boolean {
  if (verdict === "local_verified_external_blocker") {
    return (
      numberValue(summary?.expectedBlocked) > 0 &&
      finiteNumber(summary?.expectedBlocked) !== null &&
      finiteNumber(summary?.expectedBlocked) > 0 &&
      finiteNumber(summary?.fail) === 0 &&
      finiteNumber(summary?.skipped) === 0 &&
      externalBlockers.length > 0 &&
      externalBlockers.every(isConcreteExternalBlocker) &&
      stringValue(actionability?.status) === "blocked_for_action_until_post_recovery_verify" &&
      actionabilityHosts.length > 0 &&
      surfaceHosts.length > 0 &&
      uiSmokeHosts.length > 0 &&
      stringValue(postRecovery?.readiness) === "external_recovery_required"
    );
  }

  if (verdict === "local_verified") {
    return (
      finiteNumber(summary?.expectedBlocked) === 0 &&
      finiteNumber(summary?.fail) === 0 &&
      finiteNumber(summary?.skipped) === 0 &&
      externalBlockers.length === 0 &&
      stringValue(actionability?.status) === "safe_to_act" &&
      actionabilityHosts.length === 0 &&
      surfaceHosts.length === 0 &&
      uiSmokeHosts.length === 0 &&
      stringValue(postRecovery?.readiness) === "ready_to_act" &&
      hasExactPostRecoveryRows(postRecoveryAcceptance, true) &&
      postRecoveryAcceptance.every((item) => isSatisfiedPostRecoveryAcceptanceRow(item))
    );
  }

  return false;
}

function hasExactPostRecoveryRows(rows: unknown[], requireText: boolean): boolean {
  const validRows = rows.filter((item) => isPostRecoveryAcceptanceRow(item, requireText));
  const ids = validRows.map((item) => item.id);
  return (
    rows.length === REQUIRED_POST_RECOVERY_ACCEPTANCE_IDS.length &&
    ids.length === REQUIRED_POST_RECOVERY_ACCEPTANCE_IDS.length &&
    REQUIRED_POST_RECOVERY_ACCEPTANCE_IDS.every((id) => ids.includes(id)) &&
    new Set(ids).size === ids.length
  );
}

function isPostRecoveryAcceptanceRow(
  value: unknown,
  requireText: boolean,
): value is Record<string, unknown> & { id: string; status: string } {
  if (!isRecord(value)) {
    return false;
  }
  return (
    REQUIRED_POST_RECOVERY_ACCEPTANCE_IDS.includes(stringValue(value.id)) &&
    stringValue(value.status).length > 0 &&
    (!requireText || (stringValue(value.requirement).trim().length > 0 && stringValue(value.evidence).trim().length > 0))
  );
}

function isSatisfiedPostRecoveryAcceptanceRow(value: unknown): boolean {
  return isPostRecoveryAcceptanceRow(value, true) && value.status === "satisfied";
}

function isConcreteExternalBlocker(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.source === "gsc_permission_audit" &&
    stringValue(value.host).length > 0 &&
    stringValue(value.siteId).length > 0 &&
    stringValue(value.gscStatus).length > 0 &&
    stringValue(value.permissionLevel).length > 0 &&
    stringValue(value.accessState).length > 0
  );
}

function externalBlockerMatchesAudit(
  value: unknown,
  statsSnapshot: string,
  auditArtifacts: Record<string, Record<string, unknown> | null> = {},
  auditMarkdowns: Record<string, string | null> = {},
): boolean {
  if (!isConcreteExternalBlocker(value) || !isRecord(value)) {
    return false;
  }
  const artifactPath = stringValue(value.artifactPath);
  const auditDate = auditDateFromPath(artifactPath);
  const expectedWorkOrderPath = auditDate
    ? join("docs", "work-orders", `gsc-permission-audit-${auditDate}.md`)
    : "";
  const audit = Object.hasOwn(auditArtifacts, artifactPath)
    ? auditArtifacts[artifactPath]
    : safeReadJson(artifactPath);
  const auditMarkdown = textFromMapOrDisk(auditMarkdowns, expectedWorkOrderPath);
  const collectorSnapshot = stringValue(audit?.collectorSnapshot);
  const results = arrayValue(audit?.results);
  return (
    artifactPath.length > 0 &&
    expectedWorkOrderPath.length > 0 &&
    normalizePathForCompare(stringValue(value.workOrderPath)) === normalizePathForCompare(expectedWorkOrderPath) &&
    snapshotFromCollectorSnapshot(stringValue(value.collectorSnapshot)) === statsSnapshot &&
    snapshotFromCollectorSnapshot(collectorSnapshot) === statsSnapshot &&
    gscAuditHandoffStatusIsConsistent(audit) &&
    stringValue(audit?.handoffStatus) === "pending_external" &&
    gscAuditMarkdownMatches(audit, auditMarkdown) &&
    results.some((result) => {
      if (!isRecord(result)) {
        return false;
      }
      return (
        stringValue(result.host) === stringValue(value.host) &&
        stringValue(result.siteId) === stringValue(value.siteId) &&
        stringValue(result.gscStatus) === stringValue(value.gscStatus) &&
        stringValue(result.permissionLevel) === stringValue(value.permissionLevel) &&
        stringValue(result.accessState) === stringValue(value.accessState)
      );
    })
  );
}

function textFromMapOrDisk(
  values: Record<string, string | null>,
  path: string,
): string | null {
  const normalizedPath = normalizePathForCompare(path);
  for (const [key, value] of Object.entries(values)) {
    if (normalizePathForCompare(key) === normalizedPath) {
      return value;
    }
  }
  return safeReadText(path);
}

function gscAuditMarkdownMatches(
  audit: Record<string, unknown> | null | undefined,
  markdown: string | null,
): boolean {
  if (!audit || !markdown) {
    return false;
  }
  const fields = markdownFieldMap(markdown);
  const summary = recordValue(audit.summary);
  const results = arrayValue(audit.results);
  return (
    fields.get("Handoff status") === stringValue(audit.handoffStatus) &&
    fields.get("Snapshot") === stringValue(audit.collectorSnapshot) &&
    fields.get("Audited rows") === String(numberValue(summary?.auditedRows)) &&
    fields.get("Owner access") === String(numberValue(summary?.ownerAccess)) &&
    fields.get("Restricted access") === String(numberValue(summary?.restrictedAccess)) &&
    fields.get("Unverified") === String(numberValue(summary?.unverified)) &&
    fields.get("Not listed") === String(numberValue(summary?.notListed)) &&
    results.every((result) => gscAuditMarkdownContainsResult(markdown, result))
  );
}

function gscAuditMarkdownContainsResult(markdown: string, result: unknown): boolean {
  if (!isRecord(result)) {
    return false;
  }
  return [
    `### ${stringValue(result.host)} (${stringValue(result.siteId)})`,
    `- Configured GSC property: \`${stringValue(result.configuredGscSiteUrl)}\``,
    `- Listed in service account view: \`${stringValue(result.listedSiteUrl) || "not_listed"}\``,
    `- Permission level: \`${stringValue(result.permissionLevel) || "not_listed"}\``,
    `- Access state: \`${stringValue(result.accessState)}\``,
    `- Required action: ${stringValue(result.requiredAction)}`,
  ].every((line) => markdown.includes(line));
}

function gscAuditHandoffStatusIsConsistent(
  audit: Record<string, unknown> | null | undefined,
): boolean {
  const results = arrayValue(audit?.results);
  const handoffStatus = stringValue(audit?.handoffStatus);
  if (handoffStatus === "resolved") {
    return results.length === 0;
  }
  if (handoffStatus === "pending_local_refresh") {
    return (
      results.length > 0 &&
      results.every((result) => isRecord(result) && stringValue(result.accessState) === "owner_access")
    );
  }
  if (handoffStatus === "pending_external") {
    return (
      results.length > 0 &&
      results.some((result) => isRecord(result) && stringValue(result.accessState) !== "owner_access")
    );
  }
  return false;
}

function commandIdsMatch(commands: unknown[], results: unknown[]): boolean {
  const left = commandIds(commands);
  const right = commandIds(results);
  return left.length > 0 && sameStringsInOrder(left, right);
}

function postSummaryMatchesResults(postRecovery: Record<string, unknown> | null, results: unknown[]): boolean {
  const summary = recordValue(postRecovery?.summary);
  const statuses = results.filter(isRecord).map((result) => stringValue(result.status));
  return (
    finiteNumber(summary?.commands) === results.length &&
    finiteNumber(summary?.pass) === statuses.filter((status) => status === "pass").length &&
    finiteNumber(summary?.fail) === statuses.filter((status) => status === "fail").length &&
    finiteNumber(summary?.skipped) === statuses.filter((status) => status === "skipped").length
  );
}

function commandResultsClean(results: unknown[]): boolean {
  return results.length > 0 && results.every((result) => {
    if (!isRecord(result)) {
      return false;
    }
    const id = stringValue(result.id);
    const status = stringValue(result.status);
    const exitCode = result.exitCode;
    const stderrTail = stringValue(result.stderrTail).trim();
    if (!id || !["pass", "fail", "skipped"].includes(status)) {
      return false;
    }
    if (status === "pass") {
      return exitCode === 0 && stderrTail.length === 0;
    }
    if (status === "fail") {
      return typeof exitCode === "number" && Number.isFinite(exitCode) && exitCode !== 0;
    }
    return exitCode === null && stderrTail.length === 0;
  });
}

function commandFailuresAllowed(
  postRecovery: Record<string, unknown> | null,
  results: unknown[],
  externalBlockers: unknown[],
): boolean {
  const failedIds = results
    .filter(isRecord)
    .filter((result) => result.status === "fail")
    .map((result) => stringValue(result.id));
  if (stringValue(postRecovery?.readiness) !== "external_recovery_required") {
    return failedIds.length === 0;
  }
  return (
    externalBlockers.length > 0 &&
    failedIds.length === 1 &&
    failedIds[0] === "dashboard-acceptance"
  );
}

function commandTailSnapshotsMatch(results: unknown[], finalSnapshot: string): boolean {
  if (!finalSnapshot) {
    return false;
  }
  return results.filter(isRecord).every((result) => {
    const stdoutTail = stringValue(result.stdoutTail);
    const snapshot = snapshotFromOutput(stdoutTail);
    return (
      !snapshot ||
      snapshot === finalSnapshot ||
      (
        stdoutTail.includes("pre_refresh_non_authoritative=true") &&
        finalSnapshotFromOutput(stdoutTail) === finalSnapshot
      )
    );
  });
}

function postWriteIntegrityClean(
  postRecovery: Record<string, unknown> | null,
  date: string,
  allowMissingPostWriteIntegrity: boolean,
): boolean {
  const integrity = recordValue(postRecovery?.artifactIntegrity);
  if (!integrity) {
    return allowMissingPostWriteIntegrity;
  }
  const stdoutSummary = artifactIntegrityStdoutSummary(stringValue(integrity.stdoutTail));
  return (
    integrity.id === "dashboard-artifact-integrity" &&
    integrity.status === "pass" &&
    integrity.exitCode === 0 &&
    stringValue(integrity.stderrTail).trim().length === 0 &&
    stdoutSummary?.date === date &&
    stdoutSummary.ready === true &&
    stdoutSummary.pass > 0 &&
    stdoutSummary.fail === 0
  );
}

function formatPostWriteIntegrity(postRecovery: Record<string, unknown> | null): string {
  const integrity = recordValue(postRecovery?.artifactIntegrity);
  if (!integrity) {
    return "artifactIntegrity=not_recorded";
  }
  return `id=${stringValue(integrity.id) || "missing"} status=${stringValue(integrity.status) || "missing"} exit=${String(integrity.exitCode ?? "missing")}`;
}

function markdownMirrorsJson({
  input,
  verificationSnapshot,
  verdict,
  externalHosts,
  actionability,
  postSnapshot,
  postResults,
}: {
  input: IntegrityInput;
  currentSnapshot: string;
  verificationSnapshot: string;
  verdict: string;
  externalHosts: string[];
  actionability: Record<string, unknown> | undefined;
  postSnapshot: Record<string, unknown> | undefined;
  postResults: unknown[];
}): boolean {
  const verificationMarkdown = input.verificationMarkdown ?? "";
  const uiSmokeMarkdown = input.uiSmokeMarkdown ?? "";
  const postRecoveryMarkdown = input.postRecoveryMarkdown ?? "";
  const readiness = stringValue(input.postRecovery?.readiness);
  const actionabilityStatus = stringValue(actionability?.status);
  const hostText = externalHosts.length > 0 ? externalHosts.join(", ") : "none";
  const verificationTop = markdownFieldMap(verificationMarkdown);
  const verificationActionability = markdownFieldMap(markdownSection(verificationMarkdown, "Dashboard Actionability"));
  const uiSmokeTop = markdownFieldMap(uiSmokeMarkdown);
  const uiSmokeActionability = markdownFieldMap(markdownSection(uiSmokeMarkdown, "Actionability"));
  const postRecoveryTop = markdownFieldMap(postRecoveryMarkdown);
  const postRecoveryVerification = markdownFieldMap(markdownSection(postRecoveryMarkdown, "Dashboard Verification"));
  const verificationExternalBlockers = markdownSection(verificationMarkdown, "External Blocker Evidence");
  const verificationAcceptanceRows = markdownAcceptanceRows(markdownSection(verificationMarkdown, "Post-Recovery Acceptance"));
  const verificationMutationBoundary = markdownFieldMap(markdownSection(verificationMarkdown, "Mutation Boundary"));
  const expectedAcceptanceRows = postRecoveryAcceptanceRows(arrayValue(input.verification?.postRecoveryAcceptance));
  const mutationBoundaryEvidence = recordValue(input.verification?.mutationBoundaryEvidence);
  const externalBlockers = arrayValue(input.verification?.externalBlockerEvidence);
  const expectedCommandRows = postResults
    .filter(isRecord)
    .map((result) => ({
      id: stringValue(result.id),
      status: stringValue(result.status),
      exit: result.exitCode === null ? "null" : String(result.exitCode),
    }));
  const postRecoveryCommandRows = markdownCommandRows(markdownSection(postRecoveryMarkdown, "Commands"));

  return (
    verificationMarkdown.length > 0 &&
    uiSmokeMarkdown.length > 0 &&
    postRecoveryMarkdown.length > 0 &&
    verificationTop.get("Stats snapshot") === verificationSnapshot &&
    verificationTop.get("Verdict") === verdict &&
    verificationActionability.get("Status") === actionabilityStatus &&
    verificationActionability.get("Required verification command") === stringValue(actionability?.requiredVerificationCommand) &&
    markdownExternalBlockersMatch(verificationExternalBlockers, externalBlockers) &&
    sameAcceptanceRows(verificationAcceptanceRows, expectedAcceptanceRows) &&
    markdownMutationBoundaryMatches(verificationMutationBoundary, mutationBoundaryEvidence) &&
    externalHosts.every((host) => verificationMarkdown.includes(host)) &&
    uiSmokeTop.get("Stats snapshot") === verificationSnapshot &&
    uiSmokeTop.get("Blocker hosts") === hostText &&
    uiSmokeActionability.get("Status") === actionabilityStatus &&
    uiSmokeActionability.get("Required command") === stringValue(input.uiSmoke?.actionabilityCommand) &&
    postRecoveryTop.get("Readiness") === readiness &&
    postRecoveryTop.get("Stats snapshot") === stringValue(postSnapshot?.statsSnapshot) &&
    postRecoveryTop.get("Verification verdict") === stringValue(postSnapshot?.verdict) &&
    postRecoveryVerification.get("Actionability") === stringValue(postSnapshot?.actionabilityStatus) &&
    externalHosts.every((host) => postRecoveryMarkdown.includes(host)) &&
    sameCommandRows(postRecoveryCommandRows, expectedCommandRows)
  );
}

function markdownExternalBlockersMatch(section: string, blockers: unknown[]): boolean {
  const lines = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (blockers.length === 0) {
    return lines.includes("- `none`");
  }
  const expected = blockers
    .filter(isRecord)
    .map((evidence) =>
      `- \`${stringValue(evidence.host)}\` (\`${stringValue(evidence.siteId) || "unknown"}\`): \`${stringValue(evidence.gscStatus)}\`, \`${stringValue(evidence.permissionLevel)}\`, \`${stringValue(evidence.accessState)}\`; required action \`${stringValue(evidence.requiredAction)}\`; work order \`${stringValue(evidence.workOrderPath)}\`.`,
    );
  return expected.length === blockers.length && sameStringsInOrder(lines, expected);
}

function postRecoveryCommandsMatch(verificationCommands: unknown[], postCommands: unknown[]): boolean {
  if (verificationCommands.length !== postCommands.length || verificationCommands.length === 0) {
    return false;
  }
  return verificationCommands.every((command, index) => {
    const left = isRecord(command) ? command : {};
    const right = isRecord(postCommands[index]) ? postCommands[index] : {};
    return (
      stringValue(left.id) === stringValue(right.id) &&
      sameStringsInOrder(stringArray(left.args), stringArray(right.args))
    );
  });
}

function postRecoveryCommandContractMatches(
  verdict: string,
  verificationCommands: unknown[],
  postCommands: unknown[],
): boolean {
  if (verificationCommands.length === 0) {
    return verdict === "local_verified" && postCommands.length > 0;
  }
  return postRecoveryCommandsMatch(verificationCommands, postCommands);
}

function acceptanceRows(rows: unknown[]): string[] {
  return rows
    .filter((item) => isPostRecoveryAcceptanceRow(item, false))
    .map((item) => `${stringValue(item.id)}=${stringValue(item.status)}`);
}

function postRecoveryAcceptanceRows(rows: unknown[]): Array<{ status: string; id: string; requirement: string; evidence: string }> {
  return rows
    .filter((item) => isPostRecoveryAcceptanceRow(item, true))
    .map((item) => ({
      status: stringValue(item.status),
      id: stringValue(item.id),
      requirement: stringValue(item.requirement).trim(),
      evidence: stringValue(item.evidence).trim(),
    }));
}

function commandIds(items: unknown[]): string[] {
  return items
    .filter(isRecord)
    .map((item) => stringValue(item.id))
    .filter(Boolean);
}

function sameStringsInOrder(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function snapshotFromOutput(output: string): string {
  return /(?:^|\s)snapshot=([^\s]+)/.exec(output)?.[1] ?? "";
}

function finalSnapshotFromOutput(output: string): string {
  return /(?:^|\s)finalDashboardVerificationSnapshot=([^\s]+)/.exec(output)?.[1] ?? "";
}

function snapshotFromCollectorSnapshot(value: string): string {
  return /^data\/site-stats\.json generatedAt=([^\s]+)$/.exec(value)?.[1] ?? "";
}

function auditDateFromPath(path: string): string | null {
  return /gsc-permission-audit-(\d{4}-\d{2}-\d{2})\.json$/.exec(path.replaceAll("\\", "/"))?.[1] ?? null;
}

function artifactIntegrityStdoutSummary(output: string): { date: string; ready: boolean; pass: number; fail: number } | null {
  const matches = [...output.matchAll(/(?:^|\s)date=(\d{4}-\d{2}-\d{2})\s+ready=(true|false)\s+pass=(\d+)\s+fail=(\d+)/g)];
  const match = matches.at(-1);
  if (!match) {
    return null;
  }
  return {
    date: match[1],
    ready: match[2] === "true",
    pass: Number(match[3]),
    fail: Number(match[4]),
  };
}

function normalizePathForCompare(path: string): string {
  return path.replaceAll("\\", "/");
}

function markdownSection(markdown: string, heading: string): string {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start < 0) {
    return "";
  }
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n");
}

function markdownFieldMap(markdown: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^- ([^:]+): (.*)$/.exec(line.trim());
    if (!match) {
      continue;
    }
    fields.set(match[1], stripMarkdownValue(match[2]));
  }
  return fields;
}

function markdownCommandRows(markdown: string): Array<{ id: string; status: string; exit: string }> {
  return markdown
    .split(/\r?\n/)
    .map((line) => /^\| `([^`]+)` \| `([^`]+)` \| ([^|]+) \|$/.exec(line.trim()))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map((match) => ({
      id: match[1],
      status: match[2],
      exit: match[3].trim(),
    }));
}

function markdownAcceptanceRows(markdown: string): Array<{ status: string; id: string; requirement: string; evidence: string }> {
  return markdown
    .split(/\r?\n/)
    .map((line) => /^\| `([^`]+)` \| `([^`]+)` \| ([^|]+) \| ([^|]+) \|$/.exec(line.trim()))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map((match) => ({
      status: match[1],
      id: match[2],
      requirement: match[3].trim(),
      evidence: match[4].trim(),
    }));
}

function sameAcceptanceRows(
  left: Array<{ status: string; id: string; requirement: string; evidence: string }>,
  right: Array<{ status: string; id: string; requirement: string; evidence: string }>,
): boolean {
  return (
    left.length === right.length &&
    left.every((row, index) =>
      row.status === right[index].status &&
      row.id === right[index].id &&
      row.requirement === right[index].requirement &&
      row.evidence === right[index].evidence,
    )
  );
}

function markdownMutationBoundaryMatches(
  fields: Map<string, string>,
  boundary: Record<string, unknown> | undefined,
): boolean {
  return (
    fields.get("Local evidence artifacts written") === String(boundary?.localEvidenceArtifactsWritten) &&
    fields.get("Production mutation") === String(boundary?.productionMutationPerformed) &&
    fields.get("CMS mutation") === String(boundary?.cmsMutationPerformed) &&
    fields.get("Search Console mutation") === String(boundary?.searchConsoleMutationPerformed) &&
    fields.get("AdSense mutation") === String(boundary?.adsenseMutationPerformed) &&
    fields.get("Title/body mutation") === String(boundary?.titleOrBodyMutationPerformed)
  );
}

function sameCommandRows(
  left: Array<{ id: string; status: string; exit: string }>,
  right: Array<{ id: string; status: string; exit: string }>,
): boolean {
  return (
    left.length === right.length &&
    left.every((row, index) =>
      row.id === right[index].id &&
      row.status === right[index].status &&
      row.exit === right[index].exit,
    )
  );
}

function stripMarkdownValue(value: string): string {
  return value.trim().replace(/^`(.+)`$/, "$1");
}

function mutationBoundaryClean(boundary: Record<string, unknown> | undefined): boolean {
  const evidenceArtifacts = arrayValue(boundary?.evidenceArtifacts);
  return (
    boundary?.localEvidenceArtifactsWritten === true &&
    mutationFlagsClean(boundary) &&
    evidenceArtifacts.length > 0 &&
    evidenceArtifacts.every((artifact) => {
      if (!isRecord(artifact)) {
        return false;
      }
      return (
        stringValue(artifact.source).length > 0 &&
        stringValue(artifact.path).length > 0 &&
        artifact.exists === true &&
        stringValue(artifact.generatedAt).length > 0 &&
        stringValue(artifact.snapshot).length > 0 &&
        mutationFlagsClean(artifact, true)
      );
    })
  );
}

function mutationFlagsClean(value: Record<string, unknown> | null | undefined, allowNull = false): boolean {
  const expected = allowNull ? [false, null] : [false];
  return [
    value?.productionMutationPerformed,
    value?.cmsMutationPerformed,
    value?.searchConsoleMutationPerformed,
    value?.adsenseMutationPerformed,
    value?.titleOrBodyMutationPerformed,
  ].every((flag) => expected.includes(flag as false | null));
}

function readIntegrityInput(date: string): IntegrityInput {
  return {
    date,
    siteStats: safeReadJson(join(DATA_DIR, "site-stats.json")),
    verification: safeReadJson(join(DATA_DIR, `dashboard-verification-${date}.json`)),
    uiSmoke: safeReadJson(join(DATA_DIR, `dashboard-ui-smoke-${date}.json`)),
    postRecovery: safeReadJson(join(DATA_DIR, `dashboard-post-recovery-chain-${date}.json`)),
    verificationMarkdown: safeReadText(join("docs", "work-orders", `dashboard-verification-${date}.md`)),
    uiSmokeMarkdown: safeReadText(join("docs", "work-orders", `dashboard-ui-smoke-${date}.md`)),
    postRecoveryMarkdown: safeReadText(join("docs", "work-orders", `dashboard-post-recovery-chain-${date}.md`)),
  };
}

function parseCliOptions(args: string[]): { date: string; allowMissingPostWriteIntegrity: boolean } {
  let date = seoulDate(new Date());
  let allowMissingPostWriteIntegrity = false;
  for (const arg of args) {
    if (arg.startsWith("--date=")) {
      date = arg.slice("--date=".length);
      continue;
    }
    if (arg === "--allow-missing-post-write-integrity") {
      allowMissingPostWriteIntegrity = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("--date must be YYYY-MM-DD.");
    }
  return { date, allowMissingPostWriteIntegrity };
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

function safeReadText(path: string): string | null {
  if (!existsSync(path)) {
    return null;
  }
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function sameStrings(left: string[], right: string[]): boolean {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
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

function isIsoTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value);
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(",") : "none";
}

function formatMutationFlags(value: Record<string, unknown> | null): string {
  return [
    `production=${String(value?.productionMutationPerformed ?? "missing")}`,
    `cms=${String(value?.cmsMutationPerformed ?? "missing")}`,
    `gsc=${String(value?.searchConsoleMutationPerformed ?? "missing")}`,
    `adsense=${String(value?.adsenseMutationPerformed ?? "missing")}`,
    `titleOrBody=${String(value?.titleOrBodyMutationPerformed ?? "missing")}`,
  ].join("/");
}

function formatPostSummary(value: Record<string, unknown> | null): string {
  const summary = recordValue(value?.summary);
  return [
    `commands=${String(summary?.commands ?? "missing")}`,
    `pass=${String(summary?.pass ?? "missing")}`,
    `fail=${String(summary?.fail ?? "missing")}`,
    `skipped=${String(summary?.skipped ?? "missing")}`,
  ].join("/");
}

function formatTailSnapshots(results: unknown[]): string {
  const values = results
    .filter(isRecord)
    .map((result) => `${stringValue(result.id) || "unknown"}:${snapshotFromOutput(stringValue(result.stdoutTail)) || "none"}`);
  return values.length > 0 ? values.join(",") : "missing";
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
