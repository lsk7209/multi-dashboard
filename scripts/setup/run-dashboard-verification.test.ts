import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildExternalBlockerEvidence,
  buildDashboardActionability,
  buildDashboardVerificationArtifact,
  buildDashboardPostRecoveryCommands,
  buildDashboardVerificationCommands,
  classifyDashboardVerificationVerdict,
  dashboardVerificationExitCode,
  isExpectedFleetReadinessBlockArtifact,
  loadGscAuditForStatsSnapshot,
  renderMarkdown,
} from "./run-dashboard-verification.js";

describe("run-dashboard-verification", () => {
  it("returns nonzero exit codes for failed or pending verification verdicts", () => {
    expect(dashboardVerificationExitCode("local_verified")).toBe(0);
    expect(dashboardVerificationExitCode("local_verified_external_blocker")).toBe(0);
    expect(dashboardVerificationExitCode("pending_verification")).toBe(1);
    expect(dashboardVerificationExitCode("failed")).toBe(1);
  });

  it("builds the dashboard verification command sequence", () => {
    expect(buildDashboardVerificationCommands()).toEqual([
      { id: "fleet-optimize", args: ["fleet:optimize"] },
      { id: "dashboard-smoke", args: ["dashboard:smoke"] },
      {
        id: "dashboard-ui-smoke",
        args: [
          "dashboard:ui-smoke",
          "--url=http://127.0.0.1:3000/?actionabilityMode=local-evidence",
        ],
      },
      { id: "adsense-proof-verify", args: ["adsense:proof:verify"] },
    ]);
  });

  it("reuses the current snapshot when post-recovery verification skips collection", () => {
    expect(buildDashboardVerificationCommands({ skipStatsUpdate: true })[0]).toEqual({
      id: "fleet-optimize",
      args: ["fleet:optimize", "--skip-stats-update", "--skip-api-data-audit"],
    });
  });

  it("withholds local verification for external blockers when surface evidence is not current", () => {
    const commands = buildDashboardVerificationCommands();
    const artifact = buildDashboardVerificationArtifact(
      "2026-07-05",
      commands,
      [
        {
          id: "fleet-optimize",
          status: "expected_blocked",
          exitCode: 1,
          stdoutTail: "refreshFailuresBlockReadiness=true",
          stderrTail: "",
        },
        {
          id: "dashboard-smoke",
          status: "pass",
          exitCode: 0,
          stdoutTail:
            "Dashboard runtime smoke passed. snapshot=2026-07-05T14:02:20.715Z sites=98 actions=16 insights=72 chainStatus=current verdict=readiness_blocked blockers=yesa.kr checks=8",
          stderrTail: "",
        },
        {
          id: "dashboard-ui-smoke",
          status: "pass",
          exitCode: 0,
          stdoutTail: "Dashboard rendered UI smoke passed.",
          stderrTail: "",
        },
        {
          id: "adsense-proof-verify",
          status: "pass",
          exitCode: 0,
          stdoutTail: "AdSense proof artifacts verified.",
          stderrTail: "",
        },
      ],
      "2026-07-05T14:30:00.000Z",
    );

    expect(artifact.summary).toMatchObject({
      commands: 4,
      pass: 3,
      expectedBlocked: 1,
      fail: 0,
      skipped: 0,
    });
    expect(artifact.verdict).toBe("pending_verification");
    expect(artifact.blockerDetails).toEqual([
      expect.objectContaining({
        source: "skipped_refresh_failed:gsc:auth_error:1",
        severity: "blocking",
        label: "Search Console access blocked",
      }),
    ]);
    expect(
      artifact.maintenanceSources.every(
        (source) =>
          source.includes("ga4:missing_config") ||
          source.includes("adsense_collector:transient_error") ||
          source.includes("ads_txt_collector:transient_error"),
      ),
    ).toBe(true);
    expect(artifact.productionMutationPerformed).toBe(false);
    expect(artifact.cmsMutationPerformed).toBe(false);
    expect(artifact.searchConsoleMutationPerformed).toBe(false);
    expect(artifact.adsenseMutationPerformed).toBe(false);
    expect(artifact.titleOrBodyMutationPerformed).toBe(false);
    expect(artifact.mutationBoundaryEvidence).toMatchObject({
      localEvidenceArtifactsWritten: true,
      productionMutationPerformed: false,
      cmsMutationPerformed: false,
      searchConsoleMutationPerformed: false,
      adsenseMutationPerformed: false,
      titleOrBodyMutationPerformed: false,
    });
    expect(artifact.mutationBoundaryEvidence.evidenceArtifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "site_stats_snapshot", path: "data\\site-stats.json" }),
        expect.objectContaining({ source: "fleet_optimization_chain" }),
        expect.objectContaining({ source: "gsc_permission_audit" }),
        expect.objectContaining({ source: "adsense_remediation_queue" }),
        expect.objectContaining({ source: "vercel_api_data_inventory" }),
        expect.objectContaining({ source: "fleet_optimization_plan" }),
        expect.objectContaining({ source: "t3_title_content_handoff" }),
      ]),
    );
    expect(artifact.renderedUiSmokeEvidence).toEqual(
      expect.objectContaining({
        path: "data\\dashboard-ui-smoke-2026-07-05.json",
        expectedStatsSnapshot: artifact.statsSnapshot,
      }),
    );
    expect(artifact.dashboardSurfaceEvidence).toEqual({
      sourceCommand: "dashboard-smoke",
      status: "unknown",
      statsSnapshot: "2026-07-05T14:02:20.715Z",
      siteCount: 98,
      actionCount: 16,
      insightCount: 72,
      chainStatus: "current",
      chainVerdict: "readiness_blocked",
      blockerHosts: ["yesa.kr"],
    });
    expect(artifact.dashboardActionability).toEqual({
      status: "blocked_for_action_until_post_recovery_verify",
      allowedUse:
        "Read-only triage is allowed; do not execute generated action/insight recommendations until post-recovery verification passes.",
      reason:
        "The dashboard surface is current, but readiness is blocked by external Search Console access, so recommendations are not execution-ready.",
      blockerHosts: ["yesa.kr"],
      requiredVerificationCommand: "pnpm dashboard:post-recovery",
    });
    expect(artifact.postRecoveryShortcutCommand).toBe("pnpm dashboard:post-recovery");
    expect(artifact.postRecoveryAcceptance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "external_gsc_access_restored",
          status: "pending_verification",
        }),
        expect.objectContaining({
          id: "dashboard_verify_local_verified",
          status: "pending_verification",
        }),
        expect.objectContaining({
          id: "recommendations_safe_to_act",
          status: "pending_external",
        }),
        expect.objectContaining({
          id: "mutation_boundary_clean",
          status: "satisfied",
        }),
      ]),
    );
    expect(artifact.stopCondition).toContain("does not authorize CMS edits");
  });

  it("classifies external blockers as locally verified only with current local evidence", () => {
    expect(
      classifyDashboardVerificationVerdict({
        fail: 0,
        expectedBlocked: 1,
        externalBlockerEvidence: [makeExternalBlockerEvidence()],
        renderedUiSmokeEvidence: makeRenderedUiSmokeEvidence({ status: "current" }),
        dashboardSurfaceEvidence: makeDashboardSurfaceEvidence({ status: "current" }),
        dashboardActionability: makeDashboardActionability({
          status: "blocked_for_action_until_post_recovery_verify",
          blockerHosts: ["yesa.kr"],
        }),
        mutationBoundaryEvidence: makeMutationBoundaryEvidence(),
      }),
    ).toBe("local_verified_external_blocker");

    expect(
      classifyDashboardVerificationVerdict({
        fail: 0,
        expectedBlocked: 1,
        externalBlockerEvidence: [makeExternalBlockerEvidence()],
        renderedUiSmokeEvidence: makeRenderedUiSmokeEvidence({ status: "stale" }),
        dashboardSurfaceEvidence: makeDashboardSurfaceEvidence({ status: "current" }),
        dashboardActionability: makeDashboardActionability({
          status: "blocked_for_action_until_post_recovery_verify",
          blockerHosts: ["yesa.kr"],
        }),
        mutationBoundaryEvidence: makeMutationBoundaryEvidence(),
      }),
    ).toBe("pending_verification");

    expect(
      classifyDashboardVerificationVerdict({
        fail: 0,
        expectedBlocked: 1,
        externalBlockerEvidence: [makeExternalBlockerEvidence()],
        renderedUiSmokeEvidence: makeRenderedUiSmokeEvidence({ status: "current" }),
        dashboardSurfaceEvidence: makeDashboardSurfaceEvidence({ status: "current" }),
        dashboardActionability: makeDashboardActionability({
          status: "blocked_for_action_until_post_recovery_verify",
          blockerHosts: ["yesa.kr"],
        }),
        mutationBoundaryEvidence: makeMutationBoundaryEvidence({
          titleOrBodyMutationPerformed: true,
        }),
      }),
    ).toBe("failed");
  });

  it("does not locally verify an external blocker without concrete GSC evidence", () => {
    expect(
      classifyDashboardVerificationVerdict({
        fail: 0,
        expectedBlocked: 1,
        externalBlockerEvidence: [],
        renderedUiSmokeEvidence: makeRenderedUiSmokeEvidence({ status: "current" }),
        dashboardSurfaceEvidence: makeDashboardSurfaceEvidence({ status: "current" }),
        dashboardActionability: makeDashboardActionability({
          status: "blocked_for_action_until_post_recovery_verify",
          blockerHosts: ["yesa.kr"],
        }),
        mutationBoundaryEvidence: makeMutationBoundaryEvidence(),
      }),
    ).toBe("pending_verification");
  });

  it("does not mark actionability safe when fleet chain evidence is incomplete", () => {
    const surfaceEvidence = makeDashboardSurfaceEvidence({
      chainVerdict: "ready",
      blockerHosts: [],
    });

    for (const chain of [
      makeFleetChainArtifact({ summary: { commands: 6, pass: 5, fail: 0, skipped: 0 } }),
      makeFleetChainArtifact({ summary: { commands: 6, pass: 6, fail: 0, skipped: 1 } }),
      makeFleetChainArtifact({ summary: { commands: 0, pass: 0, fail: 0, skipped: 0 } }),
      makeFleetChainArtifact({ summary: { commands: 6, pass: 6, fail: undefined, skipped: 0 } }),
      makeFleetChainArtifact({ summary: { commands: 6, pass: 6, fail: 0, skipped: undefined } }),
      makeFleetChainArtifact({
        verification: {
          refreshFailedSources: ["skipped_refresh_failed:gsc:auth_error:1"],
          refreshFailuresBlockReadiness: false,
        },
      }),
    ]) {
      expect(buildDashboardActionability([], surfaceEvidence, chain)).toMatchObject({
        status: "unknown",
      });
    }

    expect(
      buildDashboardActionability([], surfaceEvidence, makeFleetChainArtifact()),
    ).toMatchObject({
      status: "safe_to_act",
      blockerHosts: [],
    });
  });

  it("does not mark actionability safe when smoke reports blocker hosts with an unexpected verdict token", () => {
    const surfaceEvidence = makeDashboardSurfaceEvidence({
      chainVerdict: "blocked",
      blockerHosts: ["yesa.kr"],
    });

    expect(
      buildDashboardActionability([], surfaceEvidence, makeFleetChainArtifact()),
    ).toMatchObject({
      status: "blocked_for_action_until_post_recovery_verify",
      blockerHosts: ["yesa.kr"],
    });

    expect(
      classifyDashboardVerificationVerdict({
        fail: 0,
        expectedBlocked: 0,
        externalBlockerEvidence: [],
        renderedUiSmokeEvidence: makeRenderedUiSmokeEvidence({ status: "current" }),
        dashboardSurfaceEvidence: surfaceEvidence,
        dashboardActionability: makeDashboardActionability({
          status: "safe_to_act",
          blockerHosts: ["yesa.kr"],
        }),
        mutationBoundaryEvidence: makeMutationBoundaryEvidence(),
      }),
    ).toBe("pending_verification");
  });

  it("fails local verification when mutation evidence artifacts are missing or null-shaped", () => {
    expect(
      classifyDashboardVerificationVerdict({
        fail: 0,
        expectedBlocked: 0,
        externalBlockerEvidence: [],
        renderedUiSmokeEvidence: makeRenderedUiSmokeEvidence({ status: "current" }),
        dashboardSurfaceEvidence: makeDashboardSurfaceEvidence({
          status: "current",
          chainVerdict: "ready",
          blockerHosts: [],
        }),
        dashboardActionability: makeDashboardActionability({
          status: "safe_to_act",
          blockerHosts: [],
        }),
        mutationBoundaryEvidence: makeMutationBoundaryEvidence({
          evidenceArtifacts: [
            {
              source: "site_stats_snapshot",
              path: "data\\site-stats.json",
              exists: false,
              generatedAt: "",
              snapshot: "",
              productionMutationPerformed: null,
              cmsMutationPerformed: null,
              searchConsoleMutationPerformed: null,
              adsenseMutationPerformed: null,
              titleOrBodyMutationPerformed: null,
            },
          ],
        }),
      }),
    ).toBe("failed");
  });

  it("fails the artifact when any verification command fails", () => {
    const commands = buildDashboardVerificationCommands();
    const artifact = buildDashboardVerificationArtifact(
      "2026-07-05",
      commands,
      [
        {
          id: "fleet-optimize",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-smoke",
          status: "fail",
          exitCode: 1,
          stdoutTail: "",
          stderrTail: "smoke failed",
        },
        {
          id: "dashboard-ui-smoke",
          status: "skipped",
          exitCode: null,
          stdoutTail: "not run after failed command",
          stderrTail: "",
        },
        {
          id: "adsense-proof-verify",
          status: "skipped",
          exitCode: null,
          stdoutTail: "not run after failed command",
          stderrTail: "",
        },
      ],
      "2026-07-05T14:30:00.000Z",
    );

    expect(artifact.summary).toMatchObject({
      commands: 4,
      pass: 1,
      expectedBlocked: 0,
      fail: 1,
      skipped: 2,
    });
    expect(artifact.verdict).toBe("failed");
  });

  it("fails closed instead of local_verified when verification sub-evidence is missing", () => {
    const commands = buildDashboardVerificationCommands();
    const artifact = buildDashboardVerificationArtifact(
      "2099-01-01",
      commands,
      commands.map((command) => ({
        id: command.id,
        status: "pass" as const,
        exitCode: 0,
        stdoutTail:
          command.id === "dashboard-smoke"
            ? "Dashboard runtime smoke passed. snapshot=2099-01-01T00:00:00.000Z sites=1 actions=0 insights=0 chainStatus=current verdict=ready blockers=none checks=8"
            : "",
        stderrTail: "",
      })),
      "2099-01-01T00:00:00.000Z",
    );

    expect(artifact.verdict).toBe("failed");
    expect(artifact.postRecoveryAcceptance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "dashboard_verify_local_verified",
          status: "failed",
        }),
      ]),
    );
  });

  it("accepts only GSC-auth readiness blocks with concrete GSC audit evidence", () => {
    const chain = makeFleetChain({
      refreshFailedSources: ["skipped_refresh_failed:gsc:auth_error:1"],
    });
    const audit = makeGscAudit();

    expect(isExpectedFleetReadinessBlockArtifact(chain, audit)).toBe(true);
    expect(
      isExpectedFleetReadinessBlockArtifact(
        {
          ...chain,
          summary: {
            commands: 6,
            pass: 6,
            skipped: 0,
          },
        } as never,
        audit,
      ),
    ).toBe(false);
    expect(
      isExpectedFleetReadinessBlockArtifact(
        {
          ...chain,
          summary: {
            commands: 6,
            pass: 6,
            fail: 0,
          },
        } as never,
        audit,
      ),
    ).toBe(false);
    expect(
      isExpectedFleetReadinessBlockArtifact(
        makeFleetChain({
          refreshFailedSources: [
            "skipped_refresh_failed:ga4:missing_config:1",
            "skipped_refresh_failed:adsense_collector:transient_error:1",
            "skipped_refresh_failed:ads_txt_collector:transient_error:1",
            "skipped_refresh_failed:gsc:auth_error:1",
          ],
        }),
        audit,
      ),
    ).toBe(true);
    expect(
      isExpectedFleetReadinessBlockArtifact(
        makeFleetChain({
          refreshFailedSources: [
            "skipped_refresh_failed:gsc:auth_error:1",
            "skipped_refresh_failed:sitemap:error:1",
          ],
        }),
        audit,
      ),
    ).toBe(false);
    expect(isExpectedFleetReadinessBlockArtifact(chain, undefined)).toBe(false);
    expect(
      isExpectedFleetReadinessBlockArtifact(chain, {
        ...audit,
        gscMutationPerformed: true,
      }),
    ).toBe(false);
    expect(
      isExpectedFleetReadinessBlockArtifact(chain, {
        ...audit,
        collectorSnapshot: "data/site-stats.json generatedAt=2026-07-05T13:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      isExpectedFleetReadinessBlockArtifact(
        {
          ...chain,
          summary: { ...chain.summary, fail: 1 },
        },
        audit,
      ),
    ).toBe(false);
  });

  it("builds structured external blocker evidence from a current GSC audit", () => {
    expect(
      buildExternalBlockerEvidence(
        makeGscAudit(),
        "2026-07-05",
        "2026-07-05T14:02:20.715Z",
        "data/gsc-permission-audit-2026-07-05.json",
      ),
    ).toEqual([
      {
        source: "gsc_permission_audit",
        artifactPath: "data/gsc-permission-audit-2026-07-05.json",
        workOrderPath: "docs\\work-orders\\gsc-permission-audit-2026-07-05.md",
        collectorSnapshot: "data/site-stats.json generatedAt=2026-07-05T14:02:20.715Z",
        host: "yesa.kr",
        siteId: "yesa",
        gscStatus: "auth_error",
        permissionLevel: "siteUnverifiedUser",
        accessState: "unverified",
        requiredAction: "Verify the Search Console property.",
      },
    ]);
  });

  it("does not turn pending-local-refresh owner access rows into external blocker work", () => {
    const audit = {
      ...makeGscAudit(),
      handoffStatus: "pending_local_refresh",
      summary: {
        unverified: 0,
        notListed: 0,
      },
      results: [
        {
          siteId: "yesa",
          host: "yesa.kr",
          gscStatus: "auth_error",
          permissionLevel: "siteOwner",
          accessState: "owner_access",
          requiredAction: "Re-run stats collection; current auth failure may be transient or property-specific.",
        },
      ],
    };

    expect(
      buildExternalBlockerEvidence(
        audit,
        "2026-07-05",
        "2026-07-05T14:02:20.715Z",
        "data/gsc-permission-audit-2026-07-05.json",
      ),
    ).toEqual([]);
    expect(buildDashboardPostRecoveryCommands([], "2026-07-05")).toEqual([]);
    expect(
      isExpectedFleetReadinessBlockArtifact(
        makeFleetChain({
          refreshFailedSources: ["skipped_refresh_failed:gsc:auth_error:1"],
        }),
        audit,
      ),
    ).toBe(false);
  });

  it("selects only the newest GSC audit for verification evidence", () => {
    const dir = mkdtempSync(join(tmpdir(), "dashboard-gsc-audit-"));
    try {
      writeFileSync(
        join(dir, "gsc-permission-audit-2026-07-05.json"),
        JSON.stringify(makeGscAudit()),
      );
      writeFileSync(
        join(dir, "gsc-permission-audit-2026-07-06.json"),
        JSON.stringify({
          ...makeGscAudit(),
          collectorSnapshot: "data/site-stats.json generatedAt=2026-07-06T00:00:00.000Z",
        }),
      );

      const result = loadGscAuditForStatsSnapshot(
        "2026-07-05T14:02:20.715Z",
        "2026-07-06",
        dir,
      );

      expect(result.path).toBe(join(dir, "gsc-permission-audit-2026-07-06.json"));
      expect(buildExternalBlockerEvidence(
        result.artifact,
        "2026-07-06",
        "2026-07-05T14:02:20.715Z",
        result.path,
      )).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not fall back to an older GSC audit when the newest audit is malformed", () => {
    const dir = mkdtempSync(join(tmpdir(), "dashboard-gsc-audit-bad-"));
    try {
      writeFileSync(
        join(dir, "gsc-permission-audit-2026-07-05.json"),
        JSON.stringify(makeGscAudit()),
      );
      writeFileSync(
        join(dir, "gsc-permission-audit-2026-07-06.json"),
        "{",
      );

      const result = loadGscAuditForStatsSnapshot(
        "2026-07-05T14:02:20.715Z",
        "2026-07-06",
        dir,
      );

      expect(result.path).toBe(join(dir, "gsc-permission-audit-2026-07-06.json"));
      expect(result.artifact).toBeUndefined();
      expect(buildExternalBlockerEvidence(
        result.artifact,
        "2026-07-06",
        "2026-07-05T14:02:20.715Z",
        result.path,
      )).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("builds dashboard post-recovery commands only when external blockers exist", () => {
    expect(buildDashboardPostRecoveryCommands([], "2026-07-05")).toEqual([]);
    expect(
      buildDashboardPostRecoveryCommands([
        {
          source: "gsc_permission_audit",
          artifactPath: "data\\gsc-permission-audit-2026-07-05.json",
          workOrderPath: "docs\\work-orders\\gsc-permission-audit-2026-07-05.md",
          collectorSnapshot: "data/site-stats.json generatedAt=2026-07-05T14:30:00.000Z",
          host: "yesa.kr",
          siteId: "yesa",
          gscStatus: "auth_error",
          permissionLevel: "siteUnverifiedUser",
          accessState: "unverified",
          requiredAction: "Verify the Search Console property.",
        },
      ], "2026-07-05").map((command) => command.args),
    ).toEqual([
      ["gsc:permissions:audit"],
      ["dashboard:verify"],
      ["dashboard:acceptance", "data\\dashboard-verification-2026-07-05.json"],
    ]);
    const postRecoveryCommands = buildDashboardPostRecoveryCommands([
      {
        source: "gsc_permission_audit",
        artifactPath: "data\\gsc-permission-audit-2026-07-05.json",
        workOrderPath: "docs\\work-orders\\gsc-permission-audit-2026-07-05.md",
        collectorSnapshot: "data/site-stats.json generatedAt=2026-07-05T14:30:00.000Z",
        host: "yesa.kr",
        siteId: "yesa",
        gscStatus: "auth_error",
        permissionLevel: "siteUnverifiedUser",
        accessState: "unverified",
        requiredAction: "Verify the Search Console property.",
      },
    ], "2026-07-05");
    expect(postRecoveryCommands.find((command) => command.id === "dashboard-verify")?.requires).toEqual([
      "A local dashboard dev server is running at http://127.0.0.1:3000/; start it with `pnpm dev --hostname 127.0.0.1 --port 3000` or set DASHBOARD_URL/--url.",
    ]);
    expect(postRecoveryCommands.find((command) => command.id === "dashboard-acceptance")?.requires).toEqual([
      "Run after `pnpm dashboard:verify` has written `data\\dashboard-verification-2026-07-05.json`.",
    ]);
  });

  it("renders external blocker evidence with site id and required action", () => {
    const commands = buildDashboardVerificationCommands();
    const artifact = buildDashboardVerificationArtifact(
      "2026-07-05",
      commands,
      [
        {
          id: "fleet-optimize",
          status: "expected_blocked",
          exitCode: 1,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "dashboard-smoke",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
        {
          id: "adsense-proof-verify",
          status: "pass",
          exitCode: 0,
          stdoutTail: "",
          stderrTail: "",
        },
      ],
      "2026-07-05T14:30:00.000Z",
    );
    artifact.externalBlockerEvidence = [
      {
        source: "gsc_permission_audit",
        artifactPath: "data\\gsc-permission-audit-2026-07-05.json",
        workOrderPath: "docs\\work-orders\\gsc-permission-audit-2026-07-05.md",
        collectorSnapshot: "data/site-stats.json generatedAt=2026-07-05T14:30:00.000Z",
        host: "yesa.kr",
        siteId: "yesa",
        gscStatus: "auth_error",
        permissionLevel: "siteUnverifiedUser",
        accessState: "unverified",
        requiredAction:
          "Verify the Search Console property or grant owner-level access to the dashboard service account, then re-run stats collection.",
      },
    ];
    artifact.postRecoveryCommands = buildDashboardPostRecoveryCommands(artifact.externalBlockerEvidence, "2026-07-05");
    artifact.renderedUiSmokeEvidence = {
      path: "data\\dashboard-ui-smoke-2026-07-05.json",
      exists: true,
      expectedStatsSnapshot: "2026-07-05T14:30:00.000Z",
      statsSnapshot: "2026-07-05T14:02:20.715Z",
      artifactGeneratedAt: "2026-07-05T14:03:00.000Z",
      status: "stale",
      productionMutationPerformed: false,
      cmsMutationPerformed: false,
      searchConsoleMutationPerformed: false,
      adsenseMutationPerformed: false,
      titleOrBodyMutationPerformed: false,
    };
    artifact.dashboardSurfaceEvidence = {
      sourceCommand: "dashboard-smoke",
      status: "current",
      statsSnapshot: "2026-07-05T14:30:00.000Z",
      siteCount: 98,
      actionCount: 16,
      insightCount: 72,
      chainStatus: "current",
      chainVerdict: "readiness_blocked",
      blockerHosts: ["yesa.kr"],
    };
    artifact.dashboardActionability = {
      status: "blocked_for_action_until_post_recovery_verify",
      allowedUse:
        "Read-only triage is allowed; do not execute generated action/insight recommendations until post-recovery verification passes.",
      reason:
        "The dashboard surface is current, but readiness is blocked by external Search Console access, so recommendations are not execution-ready.",
      blockerHosts: ["yesa.kr"],
      requiredVerificationCommand: "pnpm dashboard:post-recovery",
    };
    artifact.postRecoveryAcceptance = [
      {
        id: "external_gsc_access_restored",
        status: "pending_external",
        requirement: "Search Console access/ownership is restored for every external GSC blocker.",
        evidence: "Pending blockers: yesa.kr.",
      },
      {
        id: "dashboard_verify_local_verified",
        status: "pending_verification",
        requirement: "`pnpm dashboard:verify` finishes with verdict `local_verified`.",
        evidence: "Current verdict is local_verified_external_blocker.",
      },
    ];

    const markdown = renderMarkdown(artifact);

    expect(markdown).toContain("`yesa.kr` (`yesa`)");
    expect(markdown).toContain(
      "required action `Verify the Search Console property or grant owner-level access to the dashboard service account, then re-run stats collection.`",
    );
    expect(markdown).toContain("work order `docs\\work-orders\\gsc-permission-audit-2026-07-05.md`");
    expect(markdown).toContain("## Post-Recovery Verification");
    expect(markdown).toContain("Shortcut: `pnpm dashboard:post-recovery`");
    expect(markdown).toContain("1. `pnpm gsc:permissions:audit`");
    expect(markdown).toContain("2. `pnpm dashboard:verify`");
    expect(markdown).toContain("3. `pnpm dashboard:acceptance data\\dashboard-verification-2026-07-05.json`");
    expect(markdown).toContain("Run after `pnpm dashboard:verify` has written `data\\dashboard-verification-2026-07-05.json`.");
    expect(markdown).toContain("Requires: A local dashboard dev server is running at http://127.0.0.1:3000/");
    expect(markdown).toContain("pnpm dev --hostname 127.0.0.1 --port 3000");
    expect(markdown).toContain("DASHBOARD_URL/--url");
    expect(markdown).toContain("## Rendered UI Smoke Evidence");
    expect(markdown).toContain("- Status: `stale`");
    expect(markdown).toContain("- Expected stats snapshot: `2026-07-05T14:30:00.000Z`");
    expect(markdown).toContain("- UI smoke stats snapshot: `2026-07-05T14:02:20.715Z`");
    expect(markdown).toContain("## Dashboard Surface Evidence");
    expect(markdown).toContain("- Actions: `16`");
    expect(markdown).toContain("- Insights: `72`");
    expect(markdown).toContain("- Fleet verdict: `readiness_blocked`");
    expect(markdown).toContain("- Blocker hosts: `yesa.kr`");
    expect(markdown).toContain("## Dashboard Actionability");
    expect(markdown).toContain("- Status: `blocked_for_action_until_post_recovery_verify`");
    expect(markdown).toContain("Read-only triage is allowed");
    expect(markdown).toContain("- Required verification command: `pnpm dashboard:post-recovery`");
    expect(markdown).toContain("## Post-Recovery Acceptance");
    expect(markdown).toContain("| `pending_external` | `external_gsc_access_restored` |");
    expect(markdown).toContain("| `pending_verification` | `dashboard_verify_local_verified` |");
  });
});

function makeFleetChain({
  refreshFailedSources,
}: {
  refreshFailedSources: string[];
}) {
  return {
    summary: {
      commands: 6,
      pass: 6,
      fail: 0,
      skipped: 0,
    },
    verification: {
      statsSnapshot: "2026-07-05T14:02:20.715Z",
      refreshFailedSources,
      refreshFailuresBlockReadiness: true,
      planMatchesStats: true,
      handoffMatchesStats: true,
      handoffMutationFlagsFalse: true,
    },
  };
}

function makeGscAudit() {
  return {
    collectorSnapshot: "data/site-stats.json generatedAt=2026-07-05T14:02:20.715Z",
    handoffStatus: "pending_external",
    productionMutationPerformed: false,
    gscMutationPerformed: false,
    summary: {
      unverified: 1,
      notListed: 0,
    },
    results: [
      {
        siteId: "yesa",
        host: "yesa.kr",
        gscStatus: "auth_error",
        permissionLevel: "siteUnverifiedUser",
        accessState: "unverified",
        requiredAction: "Verify the Search Console property.",
      },
    ],
  };
}

function makeRenderedUiSmokeEvidence(overrides: Record<string, unknown> = {}) {
  return {
    path: "data\\dashboard-ui-smoke-2026-07-05.json",
    exists: true,
    expectedStatsSnapshot: "2026-07-05T14:02:20.715Z",
    statsSnapshot: "2026-07-05T14:02:20.715Z",
    artifactGeneratedAt: "2026-07-05T14:03:00.000Z",
    status: "current",
    productionMutationPerformed: false,
    cmsMutationPerformed: false,
    searchConsoleMutationPerformed: false,
    adsenseMutationPerformed: false,
    titleOrBodyMutationPerformed: false,
    ...overrides,
  } as never;
}

function makeDashboardSurfaceEvidence(overrides: Record<string, unknown> = {}) {
  return {
    sourceCommand: "dashboard-smoke",
    status: "current",
    statsSnapshot: "2026-07-05T14:02:20.715Z",
    siteCount: 98,
    actionCount: 16,
    insightCount: 72,
    chainStatus: "current",
    chainVerdict: "readiness_blocked",
    blockerHosts: ["yesa.kr"],
    ...overrides,
  } as never;
}

function makeDashboardActionability(overrides: Record<string, unknown> = {}) {
  return {
    status: "blocked_for_action_until_post_recovery_verify",
    allowedUse: "Read-only triage.",
    reason: "External blocker.",
    blockerHosts: ["yesa.kr"],
    requiredVerificationCommand: "pnpm dashboard:post-recovery",
    ...overrides,
  } as never;
}

function makeExternalBlockerEvidence(overrides: Record<string, unknown> = {}) {
  return {
    source: "gsc_permission_audit",
    artifactPath: "data\\gsc-permission-audit-2026-07-05.json",
    workOrderPath: "docs\\work-orders\\gsc-permission-audit-2026-07-05.md",
    collectorSnapshot: "data/site-stats.json generatedAt=2026-07-05T14:02:20.715Z",
    host: "yesa.kr",
    siteId: "yesa",
    gscStatus: "auth_error",
    permissionLevel: "siteUnverifiedUser",
    accessState: "unverified",
    requiredAction: "Verify the Search Console property.",
    ...overrides,
  } as never;
}

function makeMutationBoundaryEvidence(overrides: Record<string, unknown> = {}) {
  return {
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
        generatedAt: "2026-07-05T14:02:20.715Z",
        snapshot: "2026-07-05T14:02:20.715Z",
        productionMutationPerformed: false,
        cmsMutationPerformed: false,
        searchConsoleMutationPerformed: false,
        adsenseMutationPerformed: false,
        titleOrBodyMutationPerformed: false,
      },
    ],
    ...overrides,
  } as never;
}

function makeFleetChainArtifact(overrides: {
  summary?: Record<string, unknown>;
  verification?: Record<string, unknown>;
} = {}) {
  return {
    summary: {
      commands: 6,
      pass: 6,
      fail: 0,
      skipped: 0,
      ...overrides.summary,
    },
    verification: {
      statsSnapshot: "2026-07-05T14:02:20.715Z",
      refreshFailedSources: [],
      refreshFailuresBlockReadiness: false,
      planMatchesStats: true,
      handoffMatchesStats: true,
      handoffMutationFlagsFalse: true,
      ...overrides.verification,
    },
  };
}
