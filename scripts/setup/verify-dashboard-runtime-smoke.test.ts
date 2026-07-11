import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { DashboardData } from "../../app/lib/dashboard-data.js";
import { looksGarbledText } from "../../app/lib/text-readability.js";
import { verifyDashboardRuntimeSmoke } from "./verify-dashboard-runtime-smoke.js";

describe("verify-dashboard-runtime-smoke", () => {
  it("passes for current matching dashboard data and returns concrete blocker hosts", () => {
    const data = makeDashboardData();

    const result = verifyDashboardRuntimeSmoke(data);

    expect(result).toMatchObject({
      siteCount: 1,
      actionCount: 1,
      insightCount: 0,
      chainStatus: "current",
      chainVerdict: "readiness_blocked",
      blockerHosts: ["yesa.kr"],
    });
    expect(result.checks).toContain("readiness-blocker");
  });

  it("passes when the concrete GSC blocker is restricted access", () => {
    const data = makeDashboardData({
      gscPermissionAudit: {
        ...makeDashboardData().gscPermissionAudit,
        restrictedAccess: 1,
        unverified: 0,
        results: [
          {
            siteId: "yesa",
            host: "yesa.kr",
            configuredGscSiteUrl: "https://yesa.kr/",
            gscStatus: "permission_denied",
            listedSiteUrl: "https://yesa.kr/",
            permissionLevel: "siteRestrictedUser",
            accessState: "restricted_access",
            requiredAction: "Grant owner-level Search Console access.",
          },
        ],
      },
    } as Partial<DashboardData>);

    expect(verifyDashboardRuntimeSmoke(data).blockerHosts).toEqual(["yesa.kr"]);
  });

  it("fails when the dashboard snapshot is older than the freshness window", () => {
    const generatedAt = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();

    expect(() => verifyDashboardRuntimeSmoke(makeDashboardData({ generatedAt }))).toThrow(
      "Dashboard snapshot generatedAt is older than 48 hours.",
    );
  });

  it("fails closed when readiness is blocked but no GSC audit is loaded", () => {
    expect(() =>
      verifyDashboardRuntimeSmoke(makeDashboardData({ gscPermissionAudit: null })),
    ).toThrow("Readiness is blocked but no GSC permission audit is loaded.");
  });

  it("fails closed when the action queue does not surface the GSC blocker", () => {
    expect(() =>
      verifyDashboardRuntimeSmoke(
        makeDashboardData({
          actions: [
            {
              label: "Other action",
              value: "Refresh stats",
              reason: "Not the GSC blocker.",
              nextStep: "Run another command.",
            },
          ],
        }),
      ),
    ).toThrow("Action queue does not surface the GSC permission audit blocker.");
  });

  it("fails closed when fleet command summary is incomplete", () => {
    const cases = [
      { pass: 5 },
      { fail: 1 },
      { skipped: 1 },
      { commands: 0, pass: 0 },
    ];

    for (const override of cases) {
      const base = makeDashboardData();
      expect(() =>
        verifyDashboardRuntimeSmoke({
          ...base,
          fleetOptimizationChain: {
            ...base.fleetOptimizationChain,
            ...override,
          },
        } as DashboardData),
      ).toThrow(
        /Fleet chain (did not pass every command|has failed commands|has skipped commands|has no commands)/,
      );
    }
  });

  it("fails closed when local evidence blocks actionability without an external readiness blocker", () => {
    const base = makeDashboardData();

    expect(() =>
      verifyDashboardRuntimeSmoke({
        ...base,
        fleetOptimizationChain: {
          ...base.fleetOptimizationChain,
          refreshFailedSources: [],
          readinessBlockingRefreshFailedSources: [],
          maintenanceRefreshFailedSources: [],
          refreshFailureCount: 0,
          refreshFailuresBlockReadiness: false,
        },
        t3TitleContentHandoff: {
          ...base.t3TitleContentHandoff,
          refreshFailedSources: ["skipped_refresh_failed:gsc:auth_error:1"],
        },
      } as DashboardData),
    ).toThrow("Dashboard actionability is blocked by local evidence, not an external readiness blocker.");
  });

  it("passes clean local evidence before a post-recovery chain artifact exists", () => {
    const base = makeDashboardData();

    const result = verifyDashboardRuntimeSmoke({
      ...base,
      actions: [],
      fleetOptimizationChain: {
        ...base.fleetOptimizationChain,
        refreshFailedSources: ["skipped_refresh_failed:adsense_collector:transient_error:18"],
        readinessBlockingRefreshFailedSources: [],
        maintenanceRefreshFailedSources: ["skipped_refresh_failed:adsense_collector:transient_error:18"],
        refreshFailureCount: 1,
        refreshFailuresBlockReadiness: false,
      },
      gscPermissionAudit: {
        ...base.gscPermissionAudit,
        handoffStatus: "resolved",
        unverified: 0,
        notListed: 0,
        results: [],
      },
      t3TitleContentHandoff: {
        ...base.t3TitleContentHandoff,
        refreshFailedSources: ["skipped_refresh_failed:adsense_collector:transient_error:18"],
      },
      dashboardPostRecoveryChain: null,
    } as DashboardData);

    expect(result).toMatchObject({
      chainVerdict: "ready",
      blockerHosts: [],
    });
  });

  it("detects mojibake patterns beyond replacement characters", () => {
    expect(looksGarbledText("Search Console \u4EA6\uB0C5\uC2B4\uC6B0\u91C9\uBE0C? recovery")).toBe(true);
    expect(looksGarbledText("Search Console permission recovery")).toBe(false);
  });

  it("fails when action or insight text contains mojibake", () => {
    expect(() =>
      verifyDashboardRuntimeSmoke(
        makeDashboardData({
          actions: [
            {
              label: "GSC",
              value: "GSC permission audit",
              reason: "Search Console \u4EA6\uB0C5\uC2B4\uC6B0\u91C9\uBE0C? recovery",
              nextStep: "Verify the property.",
            },
          ],
        }),
      ),
    ).toThrow("Dashboard readable text contains mojibake or replacement characters.");
  });
});

function makeDashboardData(
  overrides: Partial<DashboardData> & { generatedAt?: string } = {},
): DashboardData {
  const generatedAt = overrides.generatedAt ?? new Date(Date.now() - 1000).toISOString();
  const chainArtifactPath = writeChainArtifact();
  return {
    generatedAt,
    siteCount: 1,
    stats: [{ id: "yesa", host: "yesa.kr" }],
    actions: [
      {
        label: "GSC",
        value: "GSC permission audit",
        reason: "Search Console permission is blocked.",
        nextStep: "Verify the property.",
      },
    ],
    insights: [],
    fleetOptimizationChainStatus: {
      state: "current",
      reason: "Current chain matches stats.",
      expectedStatsGeneratedAt: generatedAt,
      statsSnapshot: generatedAt,
    },
    fleetOptimizationChain: {
      artifactPath: chainArtifactPath,
      workOrderPath: "docs/work-orders/fleet-optimization-chain-2026-07-05.md",
      generatedAt,
      date: "2026-07-05",
      statsSnapshot: generatedAt,
      planSnapshot: generatedAt,
      handoffSnapshot: generatedAt,
      refreshFailedSources: ["skipped_refresh_failed:gsc:auth_error:1"],
      refreshFailureCount: 1,
      refreshFailuresBlockReadiness: true,
      commands: 6,
      pass: 6,
      fail: 0,
      skipped: 0,
      planMatchesStats: true,
      handoffMatchesStats: true,
      handoffMutationFlagsFalse: true,
      handoffSiteCount: 13,
      titleHandoffCount: 10,
      contentHandoffCount: 8,
    },
    t3TitleContentHandoff: {
      artifactPath: "data/t3-title-content-handoff-2026-07-05.json",
      workOrderPath: "docs/work-orders/t3-title-content-handoff-2026-07-05.md",
      generatedAt,
      snapshotTimestamp: generatedAt,
      refreshFailedSources: [],
      siteCount: 1,
      titleHandoffCount: 1,
      contentHandoffCount: 0,
      sites: [
        {
          host: "example.com",
          url: "https://example.com/",
          localPath: "D:\\web\\example",
          actions: ["title"],
          planRanks: [1],
          gscImpressions30d: 10,
          gscClicks30d: 1,
          gscCtr30d: 0.1,
          gscPosition30d: 12,
          topQuery: "example query",
          recommendedNextAction: "Prepare a non-mutating title handoff.",
          sitemapWarnings: 0,
          sitemapErrors: 0,
          adsenseStatus: "ok",
          adsTxtStatus: "valid",
        },
      ],
      hiddenSiteCount: 0,
      cmsMutationPerformed: false,
      productionDeploymentPerformed: false,
      searchConsoleMutationPerformed: false,
      adsenseMutationPerformed: false,
      titleOrBodyMutationPerformed: false,
    },
    adsenseProofFreshness: {
      status: "resolved",
      candidateSiteIds: [],
      candidateCount: 0,
      reason: "No proof work required.",
      remediationCommand: "pnpm adsense:proof:verify",
    },
    gscPermissionAudit: {
      artifactPath: "data/gsc-permission-audit-2026-07-05.json",
      workOrderPath: "docs/work-orders/gsc-permission-audit-2026-07-05.md",
      generatedAt,
      collectorSnapshot: `data/site-stats.json generatedAt=${generatedAt}`,
      handoffStatus: "pending_external",
      productionMutationPerformed: false,
      gscMutationPerformed: false,
      serviceAccountEmail: null,
      auditedRows: 1,
      ownerAccess: 0,
      restrictedAccess: 0,
      unverified: 1,
      notListed: 0,
      results: [
        {
          siteId: "yesa",
          host: "yesa.kr",
          configuredGscSiteUrl: "https://yesa.kr/",
          gscStatus: "auth_error",
          listedSiteUrl: "https://yesa.kr/",
          permissionLevel: "siteUnverifiedUser",
          accessState: "unverified",
          requiredAction: "Verify the Search Console property.",
        },
      ],
    },
    ...overrides,
  } as unknown as DashboardData;
}

function writeChainArtifact(): string {
  const dir = mkdtempSync(join(tmpdir(), "dashboard-smoke-chain-"));
  const artifactPath = join(dir, "fleet-optimization-chain-2026-07-05.json");
  writeFileSync(
    artifactPath,
    JSON.stringify({
      productionMutationPerformed: false,
      cmsMutationPerformed: false,
      searchConsoleMutationPerformed: false,
      adsenseMutationPerformed: false,
      titleOrBodyMutationPerformed: false,
    }),
  );
  return artifactPath;
}
