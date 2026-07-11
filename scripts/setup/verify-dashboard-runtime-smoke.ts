import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  getDashboardData,
  type DashboardData,
  type FleetOptimizationChainSummary,
} from "../../app/lib/dashboard-data.js";
import { getDashboardActionability } from "../../app/lib/dashboard-actionability.js";
import { looksGarbledText } from "../../app/lib/text-readability.js";

const MAX_SNAPSHOT_AGE_MS = 48 * 60 * 60 * 1000;

interface ChainArtifactMutationFlags {
  productionMutationPerformed?: unknown;
  cmsMutationPerformed?: unknown;
  searchConsoleMutationPerformed?: unknown;
  adsenseMutationPerformed?: unknown;
  titleOrBodyMutationPerformed?: unknown;
}

interface SmokeResult {
  generatedAt: string;
  siteCount: number;
  actionCount: number;
  insightCount: number;
  chainStatus: string;
  chainVerdict: "ready" | "readiness_blocked";
  blockerHosts: string[];
  checks: string[];
}

function main(): void {
  const result = verifyDashboardRuntimeSmoke(getDashboardData());
  console.log(
    [
      "Dashboard runtime smoke passed.",
      `snapshot=${result.generatedAt}`,
      `sites=${result.siteCount}`,
      `actions=${result.actionCount}`,
      `insights=${result.insightCount}`,
      `chainStatus=${result.chainStatus}`,
      `verdict=${result.chainVerdict}`,
      `blockers=${result.blockerHosts.length > 0 ? result.blockerHosts.join(",") : "none"}`,
      `checks=${result.checks.length}`,
    ].join(" "),
  );
}

export function verifyDashboardRuntimeSmoke(data: DashboardData): SmokeResult {
  const checks: string[] = [];
  assert(data.generatedAt, "Dashboard snapshot generatedAt is missing.");
  assertCurrentIsoTimestamp(data.generatedAt, "Dashboard snapshot generatedAt");
  checks.push("snapshot-present");

  assert(data.siteCount > 0, "Dashboard has no sites.");
  assert(data.stats.length === data.siteCount, "Dashboard stats count does not match siteCount.");
  checks.push("site-counts");

  const chain = data.fleetOptimizationChain;
  assert(chain, "Current snapshot has no strict-matching fleet optimization chain.");
  assert(
    data.fleetOptimizationChainStatus.state === "current",
    `Fleet chain status is ${data.fleetOptimizationChainStatus.state}, expected current.`,
  );
  assert(
    data.fleetOptimizationChainStatus.statsSnapshot === data.generatedAt,
    "Fleet chain status snapshot does not match dashboard snapshot.",
  );
  assert(chain.statsSnapshot === data.generatedAt, "Fleet chain stats snapshot mismatch.");
  assert(chain.planSnapshot === data.generatedAt, "Fleet chain plan snapshot mismatch.");
  assert(chain.handoffSnapshot === data.generatedAt, "Fleet chain handoff snapshot mismatch.");
  assert(chain.planMatchesStats, "Fleet plan snapshot does not match stats snapshot.");
  assert(chain.handoffMatchesStats, "Fleet handoff snapshot does not match stats snapshot.");
  assert(chain.handoffMutationFlagsFalse, "Fleet handoff mutation flags are not all false.");
  assert(chain.commands > 0, "Fleet chain has no commands.");
  assert(chain.pass === chain.commands, "Fleet chain did not pass every command.");
  assert(chain.fail === 0, "Fleet chain has failed commands.");
  assert(chain.skipped === 0, "Fleet chain has skipped commands.");
  checks.push("fleet-chain-current");

  assertChainArtifactMutationFlagsFalse(chain);
  checks.push("chain-mutation-flags");

  const handoff = data.t3TitleContentHandoff;
  assert(handoff, "Current snapshot has no strict-matching T3 title/content handoff.");
  assert(handoff.snapshotTimestamp === data.generatedAt, "T3 handoff snapshot mismatch.");
  assert(handoff.cmsMutationPerformed === false, "T3 handoff reports CMS mutation.");
  assert(
    handoff.productionDeploymentPerformed === false,
    "T3 handoff reports production deployment.",
  );
  assert(
    handoff.searchConsoleMutationPerformed === false,
    "T3 handoff reports Search Console mutation.",
  );
  assert(handoff.adsenseMutationPerformed === false, "T3 handoff reports AdSense mutation.");
  assert(
    handoff.titleOrBodyMutationPerformed === false,
    "T3 handoff reports title/body mutation.",
  );
  checks.push("t3-handoff-current");

  assert(
    data.adsenseProofFreshness.status === "current" ||
      data.adsenseProofFreshness.status === "resolved",
    `AdSense proof freshness is ${data.adsenseProofFreshness.status}.`,
  );
  checks.push("adsense-proof-freshness");

  const actionability = getDashboardActionability(data, {
    requirePostRecoveryChain: false,
  });
  const blockerHosts = validateReadinessBlocker(data, chain, actionability);
  checks.push("readiness-blocker");

  assertNoGarbledDashboardText(data);
  checks.push("readable-text");

  return {
    generatedAt: data.generatedAt,
    siteCount: data.siteCount,
    actionCount: data.actions.length,
    insightCount: data.insights.length,
    chainStatus: data.fleetOptimizationChainStatus.state,
    chainVerdict: chain.refreshFailuresBlockReadiness ? "readiness_blocked" : "ready",
    blockerHosts,
    checks,
  };
}

function validateReadinessBlocker(
  data: DashboardData,
  chain: FleetOptimizationChainSummary,
  actionability: ReturnType<typeof getDashboardActionability>,
): string[] {
  if (!chain.refreshFailuresBlockReadiness) {
    assert(
      chain.readinessBlockingRefreshFailedSources.length === 0,
      "Ready chain still has readiness-blocking refresh sources.",
    );
    assert(
      actionability.status === "safe_to_act",
      "Dashboard actionability is blocked by local evidence, not an external readiness blocker.",
    );
    return [];
  }

  assert(
    chain.refreshFailedSources.length > 0,
    "Readiness is blocked but refreshFailedSources is empty.",
  );
  const audit = data.gscPermissionAudit;
  assert(audit, "Readiness is blocked but no GSC permission audit is loaded.");
  assert(audit.productionMutationPerformed === false, "GSC audit reports production mutation.");
  assert(audit.gscMutationPerformed === false, "GSC audit reports Search Console mutation.");
  assert(
    audit.restrictedAccess + audit.unverified + audit.notListed > 0,
    "GSC audit has no blocking rows.",
  );

  const blockerRows = audit.results.filter(
    (result) =>
      result.gscStatus === "auth_error" ||
      result.accessState === "restricted_access" ||
      result.accessState === "unverified" ||
      result.permissionLevel === "siteUnverifiedUser" ||
      result.accessState === "not_listed",
  );
  assert(blockerRows.length > 0, "GSC audit has no concrete auth blocker rows.");

  const hasAction = data.actions.some((action) => action.value === "GSC permission audit");
  assert(hasAction, "Action queue does not surface the GSC permission audit blocker.");
  const blockerHosts = blockerRows.map((row) => row.host);
  assert(
    actionability.status === "blocked_for_action_until_post_recovery_verify",
    "Readiness is blocked but dashboard actionability is not blocked.",
  );
  assert(
    actionability.blockerHosts.length > 0 &&
      actionability.blockerHosts.every((host) => blockerHosts.includes(host)),
    "Dashboard actionability blocker hosts do not match concrete GSC blockers.",
  );
  return blockerHosts;
}

function assertChainArtifactMutationFlagsFalse(chain: FleetOptimizationChainSummary): void {
  const artifact = JSON.parse(readFileSync(chain.artifactPath, "utf8")) as ChainArtifactMutationFlags;
  assert(artifact.productionMutationPerformed === false, "Fleet chain reports production mutation.");
  assert(artifact.cmsMutationPerformed === false, "Fleet chain reports CMS mutation.");
  assert(
    artifact.searchConsoleMutationPerformed === false,
    "Fleet chain reports Search Console mutation.",
  );
  assert(artifact.adsenseMutationPerformed === false, "Fleet chain reports AdSense mutation.");
  assert(
    artifact.titleOrBodyMutationPerformed === false,
    "Fleet chain reports title/body mutation.",
  );
}

function assertNoGarbledDashboardText(data: DashboardData): void {
  const text = collectReadableDashboardText(data).join("\n");

  assert(!looksGarbledText(text), "Dashboard readable text contains mojibake or replacement characters.");
}

function collectReadableDashboardText(data: DashboardData): string[] {
  return [
    ...data.actions.flatMap((action) => [
      action.label,
      action.value,
      action.reason,
      action.nextStep,
    ]),
    ...data.insights.flatMap((insight) => [
      insight.reason,
      insight.recommendedAction,
      insight.operatorPrompt,
      insight.verification,
      insight.reviewNote,
      insight.gscDiagnosis,
      ...insight.evidence,
      ...insight.relatedSignals,
    ]),
    ...data.stats.flatMap((stat) => [
      stat.statusLabel,
      stat.statusReason,
      stat.health?.grade,
      stat.health?.reason,
      ...(stat.collectionSources?.flatMap((source) => [source.label, source.reason]) ?? []),
    ]),
    ...(data.collectionSummary?.map((summary) => summary.label) ?? []),
    ...(data.segments?.flatMap((segment) => [segment.label, segment.description]) ?? []),
    data.fleetOptimizationChainStatus.reason,
    data.adsenseProofFreshness.reason,
    data.adsenseProofFreshness.remediationCommand,
    ...(data.gscPermissionAudit?.results?.map((result) => result.requiredAction) ?? []),
    ...(data.t3TitleContentHandoff?.sites.flatMap((site) => [
      site.recommendedNextAction,
      site.topQuery,
    ]) ?? []),
  ].filter((value): value is string => typeof value === "string");
}

function assertCurrentIsoTimestamp(value: string, label: string): void {
  const timestamp = Date.parse(value);
  assert(Number.isFinite(timestamp), `${label} is not a parseable ISO timestamp.`);
  const ageMs = Date.now() - timestamp;
  assert(ageMs >= 0, `${label} is in the future.`);
  assert(ageMs <= MAX_SNAPSHOT_AGE_MS, `${label} is older than 48 hours.`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
