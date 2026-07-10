import type { DashboardData } from "./dashboard-data";

export interface DashboardActionability {
  status: "safe_to_act" | "blocked_for_action_until_post_recovery_verify";
  blockerHosts: string[];
  command: string;
}

export interface DashboardActionabilityOptions {
  requirePostRecoveryChain?: boolean;
}

export type DashboardActionabilityInput = Pick<
  DashboardData,
  | "adsenseProofFreshness"
  | "fleetOptimizationChain"
  | "fleetOptimizationChainStatus"
  | "dashboardPostRecoveryChain"
  | "gscPermissionAudit"
  | "t3TitleContentHandoff"
>;

export function getDashboardActionability(
  data: DashboardActionabilityInput,
  options: DashboardActionabilityOptions = {},
): DashboardActionability {
  const requirePostRecoveryChain = options.requirePostRecoveryChain ?? true;
  const gscAuditBlockers = getGscAuditBlockers(data.gscPermissionAudit);
  const blockerHosts =
    data.gscPermissionAudit?.handoffStatus === "pending_external"
      ? data.gscPermissionAudit.results
          .filter((result) => result.accessState !== "owner_access")
          .map((result) => result.host)
      : [];
  const chain = data.fleetOptimizationChain;
  const proofFreshnessReady =
    data.adsenseProofFreshness.status === "current" ||
    data.adsenseProofFreshness.status === "resolved";
  const fleetChainCommandsSucceeded = Boolean(
    chain &&
      chain.commands > 0 &&
      chain.pass === chain.commands &&
      chain.fail === 0 &&
      chain.skipped === 0,
  );
  const hasCurrentExecutableEvidence = Boolean(
    data.fleetOptimizationChainStatus.state === "current" &&
      chain &&
      fleetChainCommandsSucceeded &&
      data.t3TitleContentHandoff &&
      chain.planMatchesStats &&
      chain.handoffMatchesStats &&
      chain.handoffMutationFlagsFalse &&
      data.t3TitleContentHandoff.refreshFailedSources.length === 0 &&
      proofFreshnessReady,
  );
  const postRecoveryChainReady = Boolean(
    data.dashboardPostRecoveryChain &&
      data.dashboardPostRecoveryChain.readiness === "ready_to_act" &&
      data.dashboardPostRecoveryChain.artifactIntegrityStatus === "pass" &&
      data.dashboardPostRecoveryChain.commands > 0 &&
      data.dashboardPostRecoveryChain.pass ===
        data.dashboardPostRecoveryChain.commands &&
      data.dashboardPostRecoveryChain.fail === 0 &&
      data.dashboardPostRecoveryChain.skipped === 0 &&
      data.dashboardPostRecoveryChain.statsSnapshot === chain?.statsSnapshot &&
      data.dashboardPostRecoveryChain.verdict === "local_verified" &&
      data.dashboardPostRecoveryChain.actionabilityStatus === "safe_to_act" &&
      data.dashboardPostRecoveryChain.postRecoveryAcceptanceSatisfied,
  );
  const isSafeToAct = Boolean(
      hasCurrentExecutableEvidence &&
      gscAuditBlockers.length === 0 &&
      blockerHosts.length === 0 &&
      !chain?.refreshFailuresBlockReadiness &&
      (!requirePostRecoveryChain || postRecoveryChainReady),
  );

  return {
    status: isSafeToAct ? "safe_to_act" : "blocked_for_action_until_post_recovery_verify",
    blockerHosts:
      blockerHosts.length > 0
        ? blockerHosts
        : gscAuditBlockers.length > 0
          ? gscAuditBlockers
        : hasCurrentExecutableEvidence
          ? !requirePostRecoveryChain || postRecoveryChainReady
            ? []
            : ["post_recovery_chain"]
          : [data.fleetOptimizationChainStatus.state],
    command: "pnpm dashboard:post-recovery",
  };
}

function getGscAuditBlockers(
  audit: DashboardActionabilityInput["gscPermissionAudit"],
): string[] {
  if (!audit) {
    return ["gsc_permission_audit_missing"];
  }
  switch (audit.handoffStatus) {
    case "resolved":
      return [];
    case "pending_local_refresh":
      return ["gsc_permission_audit_pending_local_refresh"];
    case "pending_external":
      return [];
    default:
      return ["gsc_permission_audit_invalid"];
  }
}
