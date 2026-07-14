import { describe, expect, it } from "vitest";
import {
  getDashboardActionability,
  type DashboardActionabilityInput,
} from "./dashboard-actionability.js";

describe("getDashboardActionability", () => {
  it("blocks recommendations when the fleet chain is missing", () => {
    expect(
      getDashboardActionability(
        makeActionabilityInput({
          fleetOptimizationChain: null,
          fleetOptimizationChainStatus: { state: "missing" },
        }),
      ),
    ).toMatchObject({
      status: "blocked_for_action_until_post_recovery_verify",
      blockerHosts: ["missing"],
      command: "pnpm dashboard:post-recovery",
    });
  });

  it("blocks recommendations when the fleet chain is stale or mismatched", () => {
    expect(
      getDashboardActionability(
        makeActionabilityInput({
          fleetOptimizationChainStatus: { state: "snapshot_mismatch" },
        }),
      ),
    ).toMatchObject({
      status: "blocked_for_action_until_post_recovery_verify",
      blockerHosts: ["snapshot_mismatch"],
    });
  });

  it("blocks recommendations when current evidence still has a readiness blocker", () => {
    expect(
      getDashboardActionability(
        makeActionabilityInput({
          fleetOptimizationChain: {
            ...makeChain(),
            refreshFailuresBlockReadiness: true,
          },
          gscPermissionAudit: {
            handoffStatus: "pending_external",
            results: [
              {
                host: "yesa.kr",
                gscStatus: "auth_error",
                accessState: "unverified",
                permissionLevel: "siteUnverifiedUser",
              },
            ],
          },
        }),
      ),
    ).toMatchObject({
      status: "blocked_for_action_until_post_recovery_verify",
      blockerHosts: ["yesa.kr"],
    });
  });

  it("allows execution only when all current evidence is clean", () => {
    expect(getDashboardActionability(makeActionabilityInput())).toMatchObject({
      status: "safe_to_act",
      blockerHosts: [],
    });
  });

  it("blocks when post-recovery chain evidence has not passed", () => {
    for (const dashboardPostRecoveryChain of [
      null,
      { ...makePostRecoveryChain(), readiness: "external_recovery_required" },
      { ...makePostRecoveryChain(), artifactIntegrityStatus: "fail" },
      { ...makePostRecoveryChain(), skipped: 1 },
      { ...makePostRecoveryChain(), actionabilityStatus: "blocked_for_action_until_post_recovery_verify" },
      { ...makePostRecoveryChain(), postRecoveryAcceptanceSatisfied: false },
    ]) {
      expect(
        getDashboardActionability(
          makeActionabilityInput({
            dashboardPostRecoveryChain,
          }),
        ),
      ).toMatchObject({
        status: "blocked_for_action_until_post_recovery_verify",
        blockerHosts: ["post_recovery_chain"],
      });
    }
  });

  it("allows local evidence verification mode before the post-recovery chain exists", () => {
    expect(
      getDashboardActionability(
        makeActionabilityInput({
          dashboardPostRecoveryChain: null,
        }),
        { requirePostRecoveryChain: false },
      ),
    ).toMatchObject({
      status: "safe_to_act",
      blockerHosts: [],
    });
  });

  it("blocks when concrete GSC blockers remain even if the chain otherwise looks clean", () => {
    expect(
      getDashboardActionability(
        makeActionabilityInput({
          gscPermissionAudit: {
            handoffStatus: "pending_external",
            results: [
              {
                host: "yesa.kr",
                gscStatus: "auth_error",
                accessState: "unverified",
                permissionLevel: "siteUnverifiedUser",
              },
            ],
          },
        }),
      ),
    ).toMatchObject({
      status: "blocked_for_action_until_post_recovery_verify",
      blockerHosts: ["yesa.kr"],
    });
  });

  it("blocks when the current GSC permission audit is missing", () => {
    expect(
      getDashboardActionability(
        makeActionabilityInput({
          gscPermissionAudit: null,
        }),
      ),
    ).toMatchObject({
      status: "blocked_for_action_until_post_recovery_verify",
      blockerHosts: ["gsc_permission_audit_missing"],
    });
  });

  it("blocks when the GSC permission audit status is malformed", () => {
    expect(
      getDashboardActionability(
        makeActionabilityInput({
          gscPermissionAudit: { results: [] } as unknown as DashboardActionabilityInput["gscPermissionAudit"],
        }),
      ),
    ).toMatchObject({
      status: "blocked_for_action_until_post_recovery_verify",
      blockerHosts: ["gsc_permission_audit_invalid"],
    });
  });

  it("does not treat pending local refresh owner-access rows as external GSC blockers", () => {
    expect(
      getDashboardActionability(
        makeActionabilityInput({
          dashboardPostRecoveryChain: null,
          gscPermissionAudit: {
            handoffStatus: "pending_local_refresh",
            results: [
              {
                host: "yesa.kr",
                gscStatus: "auth_error",
                accessState: "owner_access",
                permissionLevel: "siteOwner",
              },
            ],
          },
        }),
      ),
    ).toMatchObject({
      status: "blocked_for_action_until_post_recovery_verify",
      blockerHosts: ["gsc_permission_audit_pending_local_refresh"],
    });
  });

  it("blocks when proof freshness or handoff evidence is not ready", () => {
    expect(
      getDashboardActionability(
        makeActionabilityInput({
          adsenseProofFreshness: { status: "stale" },
        }),
      ).status,
    ).toBe("blocked_for_action_until_post_recovery_verify");
    expect(
      getDashboardActionability(
        makeActionabilityInput({
          t3TitleContentHandoff: { refreshFailedSources: ["skipped_refresh_failed:gsc:auth_error:1"] },
        }),
      ).status,
    ).toBe("blocked_for_action_until_post_recovery_verify");
  });

  it("allows maintenance-only refresh sources in the title/content handoff", () => {
    expect(
      getDashboardActionability(
        makeActionabilityInput({
          t3TitleContentHandoff: {
            refreshFailedSources: [
              "skipped_refresh_failed:adsense_collector:transient_error:18",
              "skipped_refresh_failed:ads_txt_collector:transient_error:18",
            ],
          },
        }),
      ).status,
    ).toBe("safe_to_act");
  });

  it("allows legacy API errors only when their paired collector errors are transient", () => {
    expect(
      getDashboardActionability(
        makeActionabilityInput({
          t3TitleContentHandoff: {
            refreshFailedSources: [
              "skipped_refresh_failed:adsense:api_error:18",
              "skipped_refresh_failed:adsense_collector:transient_error:18",
              "skipped_refresh_failed:ads_txt:api_error:18",
              "skipped_refresh_failed:ads_txt_collector:transient_error:18",
            ],
          },
        }),
      ).status,
    ).toBe("safe_to_act");
  });

  it("blocks when the fleet chain command summary is not fully successful", () => {
    for (const fleetOptimizationChain of [
      { ...makeChain(), fail: 1 },
      { ...makeChain(), skipped: 1 },
      { ...makeChain(), pass: 2 },
      { ...makeChain(), commands: 0, pass: 0 },
    ]) {
      expect(
        getDashboardActionability(
          makeActionabilityInput({
            fleetOptimizationChain,
          }),
        ).status,
      ).toBe("blocked_for_action_until_post_recovery_verify");
    }
  });
});

function makeActionabilityInput(
  overrides: Partial<DashboardActionabilityInput> = {},
): DashboardActionabilityInput {
  return {
    adsenseProofFreshness: { status: "current" },
    fleetOptimizationChain: makeChain(),
    fleetOptimizationChainStatus: { state: "current" },
    dashboardPostRecoveryChain: makePostRecoveryChain(),
    gscPermissionAudit: { handoffStatus: "resolved", results: [] },
    t3TitleContentHandoff: { refreshFailedSources: [] },
    ...overrides,
  } as DashboardActionabilityInput;
}

function makeChain(): NonNullable<DashboardActionabilityInput["fleetOptimizationChain"]> {
  return {
    commands: 3,
    pass: 3,
    fail: 0,
    skipped: 0,
    planMatchesStats: true,
    handoffMatchesStats: true,
    handoffMutationFlagsFalse: true,
    refreshFailuresBlockReadiness: false,
    statsSnapshot: "2026-07-05T14:45:01.131Z",
  } as NonNullable<DashboardActionabilityInput["fleetOptimizationChain"]>;
}

function makePostRecoveryChain(): NonNullable<
  DashboardActionabilityInput["dashboardPostRecoveryChain"]
> {
  return {
    readiness: "ready_to_act",
    artifactIntegrityStatus: "pass",
    commands: 3,
    pass: 3,
    fail: 0,
    skipped: 0,
    statsSnapshot: "2026-07-05T14:45:01.131Z",
    verdict: "local_verified",
    actionabilityStatus: "safe_to_act",
    postRecoveryAcceptanceSatisfied: true,
  } as NonNullable<DashboardActionabilityInput["dashboardPostRecoveryChain"]>;
}
