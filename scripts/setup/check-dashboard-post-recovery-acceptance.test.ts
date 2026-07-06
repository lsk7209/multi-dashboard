import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateDashboardPostRecoveryAcceptance,
  findLatestDashboardVerificationArtifact,
} from "./check-dashboard-post-recovery-acceptance.js";

describe("check-dashboard-post-recovery-acceptance", () => {
  it("passes only when every post-recovery dashboard field is in the terminal ready state", () => {
    const result = evaluateDashboardPostRecoveryAcceptance(makeReadyArtifact(), "data/dashboard-verification-2026-07-06.json");

    expect(result.ready).toBe(true);
    expect(result.checks.every((check) => check.pass)).toBe(true);
  });

  it("fails the current externally blocked dashboard state", () => {
    const result = evaluateDashboardPostRecoveryAcceptance({
      ...makeReadyArtifact(),
      verdict: "local_verified_external_blocker",
      summary: {
        expectedBlocked: 1,
        fail: 0,
        skipped: 0,
      },
      externalBlockerEvidence: [{ host: "yesa.kr" }],
      dashboardActionability: {
        status: "blocked_for_action_until_post_recovery_verify",
        blockerHosts: ["yesa.kr"],
      },
      dashboardSurfaceEvidence: {
        status: "current",
        statsSnapshot: "2026-07-05T17:25:00.919Z",
        blockerHosts: ["yesa.kr"],
      },
      postRecoveryAcceptance: [
        { id: "external_gsc_access_restored", status: "pending_external" },
        { id: "mutation_boundary_clean", status: "satisfied" },
      ],
    });

    expect(result.ready).toBe(false);
    expect(result.checks.filter((check) => !check.pass).map((check) => check.id)).toEqual([
      "verdict_local_verified",
      "summary_clean",
      "external_blockers_cleared",
      "dashboard_safe_to_act",
      "dashboard_surface_current",
      "post_recovery_rows_satisfied",
    ]);
  });

  it("fails when any evidence artifact reports a mutation", () => {
    const result = evaluateDashboardPostRecoveryAcceptance({
      ...makeReadyArtifact(),
      mutationBoundaryEvidence: {
        localEvidenceArtifactsWritten: true,
        productionMutationPerformed: false,
        cmsMutationPerformed: false,
        searchConsoleMutationPerformed: false,
        adsenseMutationPerformed: false,
        titleOrBodyMutationPerformed: false,
        evidenceArtifacts: [
          {
            source: "gsc_permission_audit",
            productionMutationPerformed: false,
            cmsMutationPerformed: false,
            searchConsoleMutationPerformed: true,
            adsenseMutationPerformed: false,
            titleOrBodyMutationPerformed: false,
          },
        ],
      },
    });

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "mutation_boundary_clean")).toMatchObject({
      pass: false,
    });
  });

  it("fails when post-recovery acceptance rows are fake, missing, or duplicated", () => {
    const fakeRow = evaluateDashboardPostRecoveryAcceptance({
      ...makeReadyArtifact(),
      postRecoveryAcceptance: [{ id: "not_a_real_gate", status: "satisfied" }],
    });
    const missingRow = evaluateDashboardPostRecoveryAcceptance({
      ...makeReadyArtifact(),
      postRecoveryAcceptance: [
        { id: "external_gsc_access_restored", status: "satisfied" },
        { id: "dashboard_verify_local_verified", status: "satisfied" },
      ],
    });
    const duplicateRow = evaluateDashboardPostRecoveryAcceptance({
      ...makeReadyArtifact(),
      postRecoveryAcceptance: [
        ...makeReadyArtifact().postRecoveryAcceptance,
        { id: "mutation_boundary_clean", status: "satisfied" },
      ],
    });

    for (const result of [fakeRow, missingRow, duplicateRow]) {
      expect(result.ready).toBe(false);
      expect(result.checks.find((check) => check.id === "post_recovery_rows_satisfied")).toMatchObject({
        pass: false,
      });
    }
  });

  it("fails when post-recovery acceptance rows omit requirement or evidence text", () => {
    const missingEvidence = evaluateDashboardPostRecoveryAcceptance({
      ...makeReadyArtifact(),
      postRecoveryAcceptance: makeReadyArtifact().postRecoveryAcceptance.map((row) => ({
        ...row,
        evidence: row.id === "dashboard_verify_local_verified" ? "" : row.evidence,
      })),
    });
    const missingRequirement = evaluateDashboardPostRecoveryAcceptance({
      ...makeReadyArtifact(),
      postRecoveryAcceptance: makeReadyArtifact().postRecoveryAcceptance.map((row) => ({
        ...row,
        requirement: row.id === "dashboard_surface_current" ? "" : row.requirement,
      })),
    });

    for (const result of [missingEvidence, missingRequirement]) {
      expect(result.ready).toBe(false);
      expect(result.checks.find((check) => check.id === "post_recovery_rows_satisfied")).toMatchObject({
        pass: false,
      });
    }
  });


  it("fails when mutation evidence artifact rows are malformed", () => {
    const result = evaluateDashboardPostRecoveryAcceptance({
      ...makeReadyArtifact(),
      mutationBoundaryEvidence: {
        localEvidenceArtifactsWritten: true,
        productionMutationPerformed: false,
        cmsMutationPerformed: false,
        searchConsoleMutationPerformed: false,
        adsenseMutationPerformed: false,
        titleOrBodyMutationPerformed: false,
        evidenceArtifacts: [{}],
      },
    });

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "mutation_boundary_clean")).toMatchObject({
      pass: false,
    });
  });

  it("fails when stats-bound mutation evidence snapshots are stale", () => {
    const result = evaluateDashboardPostRecoveryAcceptance({
      ...makeReadyArtifact(),
      mutationBoundaryEvidence: {
        ...makeReadyArtifact().mutationBoundaryEvidence,
        evidenceArtifacts: [
          {
            ...makeReadyArtifact().mutationBoundaryEvidence.evidenceArtifacts[0],
            source: "fleet_optimization_chain",
            snapshot: "2026-07-05T12:00:00.000Z",
          },
        ],
      },
    });

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "mutation_boundary_clean")).toMatchObject({
      pass: false,
    });
  });


  it("fails when the artifact identity or snapshot evidence is stale or mismatched", () => {
    const wrongPathDate = evaluateDashboardPostRecoveryAcceptance(
      makeReadyArtifact(),
      "data/dashboard-verification-2026-07-05.json",
    );
    const staleRenderedEvidence = evaluateDashboardPostRecoveryAcceptance({
      ...makeReadyArtifact(),
      renderedUiSmokeEvidence: {
        status: "current",
        expectedStatsSnapshot: "2026-07-05T12:00:00.000Z",
        statsSnapshot: "2026-07-05T12:00:00.000Z",
      },
    });
    const missingGeneratedAt = evaluateDashboardPostRecoveryAcceptance({
      ...makeReadyArtifact(),
      generatedAt: undefined,
    });
    const staleCurrentStats = evaluateDashboardPostRecoveryAcceptance(
      makeReadyArtifact(),
      "data/dashboard-verification-2026-07-06.json",
      { currentStatsSnapshot: "2026-07-05T12:00:00.000Z" },
    );

    expect(wrongPathDate.ready).toBe(false);
    expect(wrongPathDate.checks.find((check) => check.id === "artifact_identity_current")).toMatchObject({
      pass: false,
    });
    expect(staleRenderedEvidence.ready).toBe(false);
    expect(staleRenderedEvidence.checks.find((check) => check.id === "snapshot_evidence_aligned")).toMatchObject({
      pass: false,
    });
    expect(missingGeneratedAt.ready).toBe(false);
    expect(missingGeneratedAt.checks.find((check) => check.id === "artifact_identity_current")).toMatchObject({
      pass: false,
    });
    expect(staleCurrentStats.ready).toBe(false);
    expect(staleCurrentStats.checks.find((check) => check.id === "artifact_identity_current")).toMatchObject({
      pass: false,
    });
  });

  it("fails closed when required array evidence is missing or malformed", () => {
    const result = evaluateDashboardPostRecoveryAcceptance({
      ...makeReadyArtifact(),
      externalBlockerEvidence: undefined,
      dashboardActionability: {
        status: "safe_to_act",
        blockerHosts: undefined,
      },
      dashboardSurfaceEvidence: {
        status: "current",
        statsSnapshot: "2026-07-05T17:25:00.919Z",
        blockerHosts: undefined,
      },
      postRecoveryAcceptance: undefined,
      mutationBoundaryEvidence: {
        localEvidenceArtifactsWritten: true,
        productionMutationPerformed: false,
        cmsMutationPerformed: false,
        searchConsoleMutationPerformed: false,
        adsenseMutationPerformed: false,
        titleOrBodyMutationPerformed: false,
        evidenceArtifacts: undefined,
      },
    });

    expect(result.ready).toBe(false);
    expect(result.checks.filter((check) => !check.pass).map((check) => check.id)).toEqual([
      "external_blockers_cleared",
      "dashboard_safe_to_act",
      "dashboard_surface_current",
      "post_recovery_rows_satisfied",
      "mutation_boundary_clean",
    ]);
  });

  it("selects only the requested current-date verification artifact by default", () => {
    const dir = mkdtempSync(join(tmpdir(), "dashboard-acceptance-"));
    try {
      writeFileSync(join(dir, "dashboard-verification-2026-07-06.json"), "{}\n");
      writeFileSync(join(dir, "dashboard-verification-2099-01-01.json"), "{}\n");

      expect(findLatestDashboardVerificationArtifact(dir, "2026-07-06")).toBe(
        join(dir, "dashboard-verification-2026-07-06.json"),
      );
      expect(findLatestDashboardVerificationArtifact(dir, "2026-07-07")).toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

function makeReadyArtifact() {
  return {
    date: "2026-07-06",
    generatedAt: "2026-07-05T17:25:00.919Z",
    statsSnapshot: "2026-07-05T17:25:00.919Z",
    verdict: "local_verified",
    summary: {
      expectedBlocked: 0,
      fail: 0,
      skipped: 0,
    },
    externalBlockerEvidence: [],
    dashboardActionability: {
      status: "safe_to_act",
      blockerHosts: [],
    },
    renderedUiSmokeEvidence: {
      status: "current",
      expectedStatsSnapshot: "2026-07-05T17:25:00.919Z",
      statsSnapshot: "2026-07-05T17:25:00.919Z",
    },
    dashboardSurfaceEvidence: {
      status: "current",
      statsSnapshot: "2026-07-05T17:25:00.919Z",
      blockerHosts: [],
    },
    postRecoveryAcceptance: [
      readyRow("external_gsc_access_restored"),
      readyRow("dashboard_verify_local_verified"),
      readyRow("rendered_ui_smoke_current"),
      readyRow("dashboard_surface_current"),
      readyRow("recommendations_safe_to_act"),
      readyRow("mutation_boundary_clean"),
    ],
    productionMutationPerformed: false,
    cmsMutationPerformed: false,
    searchConsoleMutationPerformed: false,
    adsenseMutationPerformed: false,
    titleOrBodyMutationPerformed: false,
    mutationBoundaryEvidence: {
      localEvidenceArtifactsWritten: true,
      productionMutationPerformed: false,
      cmsMutationPerformed: false,
      searchConsoleMutationPerformed: false,
      adsenseMutationPerformed: false,
      titleOrBodyMutationPerformed: false,
      evidenceArtifacts: [
        {
          source: "site_stats_snapshot",
          path: "data\\site-stats.json",
          exists: true,
          snapshot: "2026-07-05T17:25:00.919Z",
          productionMutationPerformed: false,
          cmsMutationPerformed: false,
          searchConsoleMutationPerformed: false,
          adsenseMutationPerformed: false,
          titleOrBodyMutationPerformed: false,
        },
      ],
    },
  };
}

function readyRow(id: string) {
  return {
    id,
    status: "satisfied",
    requirement: `Requirement for ${id}.`,
    evidence: `Evidence for ${id}.`,
  };
}
