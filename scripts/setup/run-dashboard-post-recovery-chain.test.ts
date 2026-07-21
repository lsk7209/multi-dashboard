import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyArtifactIntegrityResult,
  buildDashboardPostRecoveryChainArtifact,
  buildDashboardPostRecoveryChainPlan,
  parseCliOptions,
  tail,
} from "./run-dashboard-post-recovery-chain.js";

describe("run-dashboard-post-recovery-chain", () => {
  it("builds a non-mutating dashboard post-recovery verification plan", () => {
    const plan = buildDashboardPostRecoveryChainPlan({
      generatedAt: "2026-07-06T00:00:00.000Z",
      date: "2026-07-06",
      dryRun: false,
    });

    expect(plan.productionMutationPerformed).toBe(false);
    expect(plan.cmsMutationPerformed).toBe(false);
    expect(plan.searchConsoleMutationPerformed).toBe(false);
    expect(plan.adsenseMutationPerformed).toBe(false);
    expect(plan.titleOrBodyMutationPerformed).toBe(false);
    expect(plan.commands.map((command) => command.id)).toEqual([
      "gsc-permission-audit",
      "dashboard-verify",
      "dashboard-acceptance",
    ]);
    expect(plan.commands.at(-1)?.args).toEqual([
      "dashboard:acceptance",
      join("data", "dashboard-verification-2026-07-06.json"),
    ]);
  });

  it("supports dry-run and accepts the legacy skip stats update flag", () => {
    const options = parseCliOptions([
      "--dry-run",
      "--skip-stats-update",
      "--date=2026-07-06",
    ]);
    const plan = buildDashboardPostRecoveryChainPlan({
      ...options,
      generatedAt: "2026-07-06T00:00:00.000Z",
    });

    expect(options).toEqual({
      dryRun: true,
      date: "2026-07-06",
      dateOverride: true,
    });
    expect(plan.commands.map((command) => command.id)).toEqual([
      "gsc-permission-audit",
      "dashboard-verify",
      "dashboard-acceptance",
    ]);
  });

  it("rejects unsafe or malformed CLI options", () => {
    expect(() => parseCliOptions(["--date=20260706"])).toThrow(/YYYY-MM-DD/);
    expect(() => parseCliOptions(["--date=2026-07-06"])).toThrow(
      /only supported with --dry-run/,
    );
    expect(() => parseCliOptions(["--unknown"])).toThrow(/Unknown option/);
  });

  it("caps command output tails for readable artifacts", () => {
    expect(tail("x".repeat(1300))).toHaveLength(1200);
    expect(tail("ok")).toBe("ok");
  });

  it("classifies a fail-closed acceptance result with external blocker as external recovery required", () => {
    const artifact = buildDashboardPostRecoveryChainArtifact(
      buildDashboardPostRecoveryChainPlan({
        generatedAt: "2026-07-06T00:00:00.000Z",
        date: "2026-07-06",
        dryRun: false,
      }),
      [
        {
          id: "gsc-permission-audit",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-verify",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-acceptance",
          status: "fail",
          exitCode: 1,
          stdoutTail: "",
          stderrTail: "",
        },
      ],
      {
        path: "data/dashboard-verification-2026-07-06.json",
        exists: true,
        statsSnapshot: "2026-07-05T16:52:15.079Z",
        verdict: "local_verified_external_blocker",
        expectedBlocked: 1,
        fail: 0,
        skipped: 0,
        externalBlockerEvidenceCount: 1,
        externalBlockerEvidence: [makeExternalBlocker()],
        actionabilityBlockerHosts: ["yesa.kr"],
        surfaceBlockerHosts: ["yesa.kr"],
        actionabilityStatus: "blocked_for_action_until_post_recovery_verify",
        postRecoveryAcceptance: [
          "external_gsc_access_restored=pending_external",
          "mutation_boundary_clean=satisfied",
        ],
      },
    );

    expect(artifact.summary).toEqual({
      commands: 3,
      pass: 2,
      fail: 1,
      skipped: 0,
    });
    expect(artifact.readiness).toBe("external_recovery_required");
  });

  it("does not hide earlier command failures behind an external blocker verdict", () => {
    const artifact = buildDashboardPostRecoveryChainArtifact(
      buildDashboardPostRecoveryChainPlan({
        generatedAt: "2026-07-06T00:00:00.000Z",
        date: "2026-07-06",
        dryRun: false,
      }),
      [
        {
          id: "gsc-permission-audit",
          status: "fail",
          exitCode: 1,
          stdoutTail: "",
          stderrTail: "auth command failed",
        },
        {
          id: "dashboard-verify",
          status: "skipped",
          exitCode: null,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-acceptance",
          status: "skipped",
          exitCode: null,
          stdoutTail: "",
          stderrTail: "",
        },
      ],
      {
        path: "data/dashboard-verification-2026-07-06.json",
        exists: true,
        statsSnapshot: "2026-07-05T16:52:15.079Z",
        verdict: "local_verified_external_blocker",
        expectedBlocked: 1,
        fail: 0,
        skipped: 0,
        externalBlockerEvidenceCount: 1,
        externalBlockerEvidence: [makeExternalBlocker()],
        actionabilityBlockerHosts: ["yesa.kr"],
        surfaceBlockerHosts: ["yesa.kr"],
        actionabilityStatus: "blocked_for_action_until_post_recovery_verify",
        postRecoveryAcceptance: [
          "external_gsc_access_restored=pending_external",
          "mutation_boundary_clean=satisfied",
        ],
      },
    );

    expect(artifact.readiness).toBe("failed");
  });

  it("does not classify local-only blocked actionability as external recovery required", () => {
    const artifact = buildDashboardPostRecoveryChainArtifact(
      buildDashboardPostRecoveryChainPlan({
        generatedAt: "2026-07-06T00:00:00.000Z",
        date: "2026-07-06",
        dryRun: false,
      }),
      [
        {
          id: "gsc-permission-audit",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-verify",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-acceptance",
          status: "fail",
          exitCode: 1,
          stdoutTail: "",
          stderrTail: "",
        },
      ],
      {
        path: "data/dashboard-verification-2026-07-06.json",
        exists: true,
        statsSnapshot: "2026-07-05T16:52:15.079Z",
        verdict: "pending_verification",
        expectedBlocked: 0,
        fail: 0,
        skipped: 0,
        externalBlockerEvidenceCount: 0,
        externalBlockerEvidence: [],
        actionabilityBlockerHosts: ["current"],
        surfaceBlockerHosts: [],
        actionabilityStatus: "blocked_for_action_until_post_recovery_verify",
        postRecoveryAcceptance: [
          "dashboard_verify_local_verified=pending_verification",
          "mutation_boundary_clean=satisfied",
        ],
      },
    );

    expect(artifact.readiness).toBe("failed");
  });

  it("does not classify external blocker verdict as recovery-required without concrete blocker evidence", () => {
    const artifact = buildDashboardPostRecoveryChainArtifact(
      buildDashboardPostRecoveryChainPlan({
        generatedAt: "2026-07-06T00:00:00.000Z",
        date: "2026-07-06",
        dryRun: false,
      }),
      [
        {
          id: "gsc-permission-audit",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-verify",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-acceptance",
          status: "fail",
          exitCode: 1,
          stdoutTail: "",
          stderrTail: "",
        },
      ],
      {
        path: "data/dashboard-verification-2026-07-06.json",
        exists: true,
        statsSnapshot: "2026-07-05T16:52:15.079Z",
        verdict: "local_verified_external_blocker",
        expectedBlocked: 1,
        fail: 0,
        skipped: 0,
        externalBlockerEvidenceCount: 0,
        externalBlockerEvidence: [],
        actionabilityBlockerHosts: [],
        surfaceBlockerHosts: [],
        actionabilityStatus: "blocked_for_action_until_post_recovery_verify",
        postRecoveryAcceptance: [
          "external_gsc_access_restored=pending_external",
          "mutation_boundary_clean=satisfied",
        ],
      },
    );

    expect(artifact.readiness).toBe("failed");
  });

  it("does not classify external blocker verdict as recovery-required when verification summary failed or skipped", () => {
    for (const override of [{ fail: 1 }, { skipped: 1 }]) {
      const artifact = buildDashboardPostRecoveryChainArtifact(
        buildDashboardPostRecoveryChainPlan({
          generatedAt: "2026-07-06T00:00:00.000Z",
          date: "2026-07-06",
          dryRun: false,
        }),
        [
          {
            id: "gsc-permission-audit",
            status: "pass",
            exitCode: 0,
            stdoutTail: "",
            stderrTail: "",
          },
          {
            id: "dashboard-verify",
            status: "pass",
            exitCode: 0,
            stdoutTail: "",
            stderrTail: "",
          },
          {
            id: "dashboard-acceptance",
            status: "fail",
            exitCode: 1,
            stdoutTail: "",
            stderrTail: "",
          },
        ],
        {
          path: "data/dashboard-verification-2026-07-06.json",
          exists: true,
          statsSnapshot: "2026-07-05T16:52:15.079Z",
          verdict: "local_verified_external_blocker",
          expectedBlocked: 1,
          fail: 0,
          skipped: 0,
          externalBlockerEvidenceCount: 1,
          externalBlockerEvidence: [makeExternalBlocker()],
          actionabilityBlockerHosts: ["yesa.kr"],
          surfaceBlockerHosts: ["yesa.kr"],
          actionabilityStatus: "blocked_for_action_until_post_recovery_verify",
          postRecoveryAcceptance: [
            "external_gsc_access_restored=pending_external",
            "mutation_boundary_clean=satisfied",
          ],
          ...override,
        },
      );

      expect(artifact.readiness).toBe("failed");
    }
  });

  it("keeps a verification command failure as failed even when a stale artifact reports external blocker", () => {
    const artifact = buildDashboardPostRecoveryChainArtifact(
      buildDashboardPostRecoveryChainPlan({
        generatedAt: "2026-07-06T00:00:00.000Z",
        date: "2026-07-06",
        dryRun: false,
      }),
      [
        {
          id: "gsc-permission-audit",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-verify",
          status: "fail",
          exitCode: 1,
          stdoutTail: "",
          stderrTail: "verify failed",
        },
        {
          id: "dashboard-acceptance",
          status: "skipped",
          exitCode: null,
          stdoutTail: "",
          stderrTail: "",
        },
      ],
      {
        path: "data/dashboard-verification-2026-07-06.json",
        exists: true,
        statsSnapshot: "2026-07-05T16:52:15.079Z",
        verdict: "local_verified_external_blocker",
        expectedBlocked: 1,
        fail: 0,
        skipped: 0,
        externalBlockerEvidenceCount: 1,
        externalBlockerEvidence: [makeExternalBlocker()],
        actionabilityBlockerHosts: ["yesa.kr"],
        surfaceBlockerHosts: ["yesa.kr"],
        actionabilityStatus: "blocked_for_action_until_post_recovery_verify",
        postRecoveryAcceptance: [
          "external_gsc_access_restored=pending_external",
          "mutation_boundary_clean=satisfied",
        ],
      },
    );

    expect(artifact.readiness).toBe("failed");
  });

  it("classifies all terminal-ready post-recovery evidence as ready to act", () => {
    const artifact = buildDashboardPostRecoveryChainArtifact(
      buildDashboardPostRecoveryChainPlan({
        generatedAt: "2026-07-06T00:00:00.000Z",
        date: "2026-07-06",
        dryRun: false,
      }),
      [
        {
          id: "gsc-permission-audit",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-verify",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-acceptance",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
      ],
      {
        path: "data/dashboard-verification-2026-07-06.json",
        exists: true,
        statsSnapshot: "2026-07-05T16:52:15.079Z",
        verdict: "local_verified",
        expectedBlocked: 0,
        fail: 0,
        skipped: 0,
        actionabilityStatus: "safe_to_act",
        postRecoveryAcceptance: [
          "external_gsc_access_restored=satisfied",
          "dashboard_verify_local_verified=satisfied",
          "rendered_ui_smoke_current=satisfied",
          "dashboard_surface_current=satisfied",
          "recommendations_safe_to_act=satisfied",
          "mutation_boundary_clean=satisfied",
        ],
      },
    );

    expect(artifact.readiness).toBe("ready_to_act");
  });

  it("downgrades artifact readiness when the post-write integrity gate fails", () => {
    const artifact = buildDashboardPostRecoveryChainArtifact(
      buildDashboardPostRecoveryChainPlan({
        generatedAt: "2026-07-06T00:00:00.000Z",
        date: "2026-07-06",
        dryRun: false,
      }),
      [
        {
          id: "gsc-permission-audit",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-verify",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-acceptance",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
      ],
      makeReadyVerification(),
    );

    applyArtifactIntegrityResult(artifact, {
      id: "dashboard-artifact-integrity",
      status: "fail",
      exitCode: 1,
      stdoutTail: "ready=false",
      stderrTail: "artifact drift",
    });

    expect(artifact.artifactIntegrity?.status).toBe("fail");
    expect(artifact.readiness).toBe("failed");
  });

  it("does not mark ready when acceptance rows are missing", () => {
    const artifact = buildDashboardPostRecoveryChainArtifact(
      buildDashboardPostRecoveryChainPlan({
        generatedAt: "2026-07-06T00:00:00.000Z",
        date: "2026-07-06",
        dryRun: false,
      }),
      [
        {
          id: "gsc-permission-audit",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-verify",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-acceptance",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
      ],
      makeReadyVerification({ postRecoveryAcceptance: [] }),
    );

    expect(artifact.readiness).toBe("failed");
  });

  it("does not mark ready when acceptance rows are fake or incomplete satisfied rows", () => {
    const fake = buildDashboardPostRecoveryChainArtifact(
      buildDashboardPostRecoveryChainPlan({
        generatedAt: "2026-07-06T00:00:00.000Z",
        date: "2026-07-06",
        dryRun: false,
      }),
      [
        {
          id: "gsc-permission-audit",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-verify",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-acceptance",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
      ],
      makeReadyVerification({
        postRecoveryAcceptance: ["not_a_real_gate=satisfied"],
      }),
    );
    const incomplete = buildDashboardPostRecoveryChainArtifact(
      buildDashboardPostRecoveryChainPlan({
        generatedAt: "2026-07-06T00:00:00.000Z",
        date: "2026-07-06",
        dryRun: false,
      }),
      [
        {
          id: "gsc-permission-audit",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-verify",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-acceptance",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
      ],
      makeReadyVerification({
        postRecoveryAcceptance: [
          "external_gsc_access_restored=satisfied",
          "dashboard_verify_local_verified=satisfied",
        ],
      }),
    );

    expect(fake.readiness).toBe("failed");
    expect(incomplete.readiness).toBe("failed");
  });

  it("does not mark ready when dashboard verification has failed or skipped checks", () => {
    const failed = buildDashboardPostRecoveryChainArtifact(
      buildDashboardPostRecoveryChainPlan({
        generatedAt: "2026-07-06T00:00:00.000Z",
        date: "2026-07-06",
        dryRun: false,
      }),
      [
        {
          id: "gsc-permission-audit",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-verify",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-acceptance",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
      ],
      makeReadyVerification({ fail: 1 }),
    );
    const skipped = buildDashboardPostRecoveryChainArtifact(
      buildDashboardPostRecoveryChainPlan({
        generatedAt: "2026-07-06T00:00:00.000Z",
        date: "2026-07-06",
        dryRun: false,
      }),
      [
        {
          id: "gsc-permission-audit",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-verify",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-acceptance",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
      ],
      makeReadyVerification({ skipped: 1 }),
    );

    expect(failed.readiness).toBe("failed");
    expect(skipped.readiness).toBe("failed");
  });
});

function makeReadyVerification(
  overrides: Partial<
    Parameters<typeof buildDashboardPostRecoveryChainArtifact>[2]
  > = {},
): Parameters<typeof buildDashboardPostRecoveryChainArtifact>[2] {
  return {
    path: "data/dashboard-verification-2026-07-06.json",
    exists: true,
    statsSnapshot: "2026-07-05T16:52:15.079Z",
    verdict: "local_verified",
    expectedBlocked: 0,
    fail: 0,
    skipped: 0,
    externalBlockerEvidenceCount: 0,
    externalBlockerEvidence: [],
    actionabilityBlockerHosts: [],
    surfaceBlockerHosts: [],
    actionabilityStatus: "safe_to_act",
    postRecoveryAcceptance: [
      "external_gsc_access_restored=satisfied",
      "dashboard_verify_local_verified=satisfied",
      "rendered_ui_smoke_current=satisfied",
      "dashboard_surface_current=satisfied",
      "recommendations_safe_to_act=satisfied",
      "mutation_boundary_clean=satisfied",
    ],
    ...overrides,
  };
}

function makeExternalBlocker() {
  return {
    source: "gsc_permission_audit",
    host: "yesa.kr",
    siteId: "yesa",
    gscStatus: "auth_error",
    permissionLevel: "siteUnverifiedUser",
    accessState: "unverified",
  };
}
