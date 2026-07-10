import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import type { DashboardData } from "../../app/lib/dashboard-data.js";
import { looksGarbledText } from "../../app/lib/text-readability.js";
import {
  buildRenderedDashboardUiExpectations,
  buildRenderedDashboardUiSmokeArtifact,
  getArgValue,
  hasValidLocalEvidenceToken,
  isLocalEvidenceActionabilityUrl,
  LOCAL_EVIDENCE_TOKEN_PATH,
  prepareDashboardSmokeUrl,
  redactActionabilityToken,
  renderRenderedDashboardUiSmokeMarkdown,
  unauthorizedLocalEvidenceUrl,
  requestsLocalEvidenceMode,
} from "./verify-dashboard-rendered-ui-smoke.js";

describe("verify-dashboard-rendered-ui-smoke", () => {
  it("accepts both supported command-line option forms", () => {
    expect(getArgValue("--url", ["node", "smoke", "--url=http://127.0.0.1:3004/"])).toBe(
      "http://127.0.0.1:3004/",
    );
    expect(getArgValue("--url", ["node", "smoke", "--url", "http://127.0.0.1:3004/"])).toBe(
      "http://127.0.0.1:3004/",
    );
  });

  it("builds expectations for the current hard-blocker/no-maintenance split", () => {
    const result = buildRenderedDashboardUiExpectations(makeDashboardData());

    expect(result).toMatchObject({
      generatedAt: "2026-07-05T14:45:01.131Z",
      siteCount: 98,
      blockingSources: ["skipped_refresh_failed:gsc:auth_error:1"],
      maintenanceSources: [],
      blockerHosts: ["yesa.kr"],
      actionabilityStatus: "blocked_for_action_until_post_recovery_verify",
      actionabilityCommand: "pnpm dashboard:post-recovery",
      actionabilityAllowedUse:
        "Read-only triage only. Do not execute dashboard recommendations until post-recovery verification passes.",
      actionabilityReason:
        "Blocked until pnpm dashboard:post-recovery passes for yesa.kr.",
      fleetChainArtifactPath: "data/fleet-optimization-chain-2026-07-05.json",
      gscPermissionAuditArtifactPath: "data/gsc-permission-audit-2026-07-05.json",
      gscPermissionAuditHandoffStatus: "pending_external",
    });
  });

  it("fails closed when refresh split counts do not match the chain total", () => {
    expect(() =>
      buildRenderedDashboardUiExpectations(
        makeDashboardData({
          fleetOptimizationChain: {
            ...makeChain(),
            refreshFailureCount: 2,
          },
        }),
      ),
    ).toThrow("Fleet refresh split does not add up to refreshFailureCount.");
  });

  it("accepts a collector-level GA4 blocker without inventing a GSC host", () => {
    expect(
      buildRenderedDashboardUiExpectations(
        makeDashboardData({
          fleetOptimizationChain: {
            ...makeChain(),
            refreshFailedSources: ["skipped_refresh_failed:ga4:api_error:40"],
            readinessBlockingRefreshFailedSources: ["skipped_refresh_failed:ga4:api_error:40"],
          },
          gscPermissionAudit: {
            ...makeDashboardData().gscPermissionAudit,
            handoffStatus: "current",
            unverified: 0,
            results: [],
          },
        } as Partial<DashboardData>),
      ).blockerHosts,
    ).toEqual([]);
  });

  it("builds blocked expectations when local evidence blocks actionability without an external readiness blocker", () => {
    expect(
      buildRenderedDashboardUiExpectations(
        makeDashboardData({
          fleetOptimizationChain: {
            ...makeChain(),
            refreshFailedSources: [],
            readinessBlockingRefreshFailedSources: [],
            refreshFailureCount: 0,
            refreshFailuresBlockReadiness: false,
            fail: 1,
            pass: 5,
          },
        }),
      ),
    ).toMatchObject({
      actionabilityStatus: "blocked_for_action_until_post_recovery_verify",
      blockingSources: [],
      blockerHosts: ["yesa.kr"],
    });
  });

  it("does not treat pending local refresh owner-access audits as external GSC blockers", () => {
    expect(
      buildRenderedDashboardUiExpectations(
        makeDashboardData({
          fleetOptimizationChain: {
            ...makeChain(),
            refreshFailedSources: [],
            readinessBlockingRefreshFailedSources: [],
            maintenanceRefreshFailedSources: [],
            refreshFailureCount: 0,
            refreshFailuresBlockReadiness: false,
          },
          gscPermissionAudit: {
            ...makeDashboardData().gscPermissionAudit,
            handoffStatus: "pending_local_refresh",
            ownerAccess: 1,
            unverified: 0,
            notListed: 0,
            results: [
              {
                siteId: "yesa",
                host: "yesa.kr",
                configuredGscSiteUrl: "https://yesa.kr/",
                gscStatus: "auth_error",
                listedSiteUrl: "https://yesa.kr/",
                permissionLevel: "siteOwner",
                accessState: "owner_access",
                requiredAction:
                  "Re-run stats collection; current auth failure may be transient or property-specific.",
              },
            ],
          },
        } as Partial<DashboardData>),
      ),
    ).toMatchObject({
      blockerHosts: [],
      gscPermissionAuditHandoffStatus: "pending_local_refresh",
    });
  });

  it("builds safe expectations in local-evidence mode before post-recovery chain exists", () => {
    expect(
      buildRenderedDashboardUiExpectations(
        makeDashboardData({
          fleetOptimizationChain: {
            ...makeChain(),
            refreshFailedSources: [],
            readinessBlockingRefreshFailedSources: [],
            maintenanceRefreshFailedSources: [],
            refreshFailureCount: 0,
            refreshFailuresBlockReadiness: false,
          },
          gscPermissionAudit: {
            ...makeDashboardData().gscPermissionAudit,
            unverified: 0,
            notListed: 0,
            results: [],
          },
          dashboardPostRecoveryChain: null,
        } as Partial<DashboardData>),
        { requirePostRecoveryChain: false },
      ),
    ).toMatchObject({
      actionabilityStatus: "safe_to_act",
      blockerHosts: [],
      actionabilityReason: "All dashboard readiness evidence is current and unblocked.",
    });
  });

  it("does not treat public local-evidence query strings as authorized without a token", () => {
    const url = "http://127.0.0.1:3000/?actionabilityMode=local-evidence";

    expect(requestsLocalEvidenceMode(url)).toBe(true);
    expect(isLocalEvidenceActionabilityUrl(url)).toBe(false);
    expect(isLocalEvidenceActionabilityUrl(`${url}&actionabilityToken=`)).toBe(false);
    expect(isLocalEvidenceActionabilityUrl(`${url}&actionabilityToken=bogus`)).toBe(false);
    expect(hasValidLocalEvidenceToken("bogus")).toBe(false);
  });

  it("creates and cleans up a short-lived token only for local-evidence smoke URLs", () => {
    rmSync(LOCAL_EVIDENCE_TOKEN_PATH, { force: true });

    const untouched = prepareDashboardSmokeUrl("http://127.0.0.1:3000/");
    expect(untouched.url).toBe("http://127.0.0.1:3000/");
    expect(existsSync(LOCAL_EVIDENCE_TOKEN_PATH)).toBe(false);
    untouched.cleanup();

    const prepared = prepareDashboardSmokeUrl("http://127.0.0.1:3000/?actionabilityMode=local-evidence");
    try {
      const parsed = new URL(prepared.url);
      const token = parsed.searchParams.get("actionabilityToken");
      const tokenFile = JSON.parse(readFileSync(LOCAL_EVIDENCE_TOKEN_PATH, "utf8")) as {
        token?: unknown;
        tokenHash?: unknown;
        expiresAt?: unknown;
      };

      expect(parsed.searchParams.get("actionabilityMode")).toBe("local-evidence");
      expect(typeof token).toBe("string");
      expect(token).not.toBe("");
      expect(tokenFile.token).toBeUndefined();
      expect(typeof tokenFile.tokenHash).toBe("string");
      expect(readFileSync(LOCAL_EVIDENCE_TOKEN_PATH, "utf8")).not.toContain(token ?? "");
      expect(typeof tokenFile.expiresAt).toBe("string");
      expect(Date.parse(tokenFile.expiresAt as string)).toBeGreaterThan(Date.now());
      expect(isLocalEvidenceActionabilityUrl(prepared.url)).toBe(true);
      expect(hasValidLocalEvidenceToken(token ?? undefined)).toBe(true);
    } finally {
      prepared.cleanup();
    }

    expect(existsSync(LOCAL_EVIDENCE_TOKEN_PATH)).toBe(false);
  });

  it("builds a bogus-token URL for rendered unauthorized local-evidence checks", () => {
    expect(
      unauthorizedLocalEvidenceUrl(
        "http://127.0.0.1:3000/?actionabilityMode=local-evidence&actionabilityToken=real",
      ),
    ).toBe("http://127.0.0.1:3000/?actionabilityMode=local-evidence&actionabilityToken=bogus");
    expect(unauthorizedLocalEvidenceUrl("http://127.0.0.1:3000/")).toBe(
      "http://127.0.0.1:3000/?actionabilityMode=local-evidence&actionabilityToken=bogus",
    );
  });

  it("redacts local-evidence tokens from persisted smoke artifacts", () => {
    const redacted = redactActionabilityToken(
      "http://127.0.0.1:3000/?actionabilityMode=local-evidence&actionabilityToken=secret-token",
    );
    const artifact = buildRenderedDashboardUiSmokeArtifact(
      {
        url: "http://127.0.0.1:3000/?actionabilityMode=local-evidence&actionabilityToken=secret-token",
        ...buildRenderedDashboardUiExpectations(makeDashboardData()),
        checks: ["http-2xx"],
      },
      "2026-07-05T15:03:30.000Z",
    );

    expect(redacted).toBe(
      "http://127.0.0.1:3000/?actionabilityMode=local-evidence&actionabilityToken=redacted",
    );
    expect(artifact.url).toBe(redacted);
    expect(renderRenderedDashboardUiSmokeMarkdown(artifact)).not.toContain("secret-token");
  });

  it("requires concrete GSC blocker hosts when readiness is blocked", () => {
    expect(() =>
      buildRenderedDashboardUiExpectations(
        makeDashboardData({
          gscPermissionAudit: {
            artifactPath: "data/gsc-permission-audit-2026-07-05.json",
            workOrderPath: "docs/work-orders/gsc-permission-audit-2026-07-05.md",
            generatedAt: "2026-07-05T14:45:01.131Z",
            collectorSnapshot: "data/site-stats.json generatedAt=2026-07-05T14:45:01.131Z",
            handoffStatus: "pending_external",
            productionMutationPerformed: false,
            gscMutationPerformed: false,
            serviceAccountEmail: null,
            auditedRows: 1,
            ownerAccess: 0,
            restrictedAccess: 0,
            unverified: 0,
            notListed: 0,
            results: [],
          },
        }),
      ),
    ).toThrow("Readiness is blocked but no GSC blocker host exists.");
  });

  it("keeps every concrete GSC blocker host in expectations", () => {
    const data = makeDashboardData({
      gscPermissionAudit: {
        ...makeDashboardData().gscPermissionAudit,
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
          {
            siteId: "second",
            host: "second.example",
            configuredGscSiteUrl: "https://second.example/",
            gscStatus: "auth_error",
            listedSiteUrl: null,
            permissionLevel: null,
            accessState: "not_listed",
            requiredAction: "Grant Search Console owner access.",
          },
        ],
      },
    } as Partial<DashboardData>);

    expect(buildRenderedDashboardUiExpectations(data).blockerHosts).toEqual([
      "yesa.kr",
      "second.example",
    ]);
  });

  it("builds a non-mutating UI smoke artifact", () => {
    const artifact = buildRenderedDashboardUiSmokeArtifact(
      {
        url: "http://127.0.0.1:3000/",
        ...buildRenderedDashboardUiExpectations(makeDashboardData()),
        checks: ["http-2xx", "fleet-panel"],
      },
      "2026-07-05T15:03:30.000Z",
    );

    expect(artifact).toMatchObject({
      date: "2026-07-06",
      actionabilityStatus: "blocked_for_action_until_post_recovery_verify",
      actionabilityCommand: "pnpm dashboard:post-recovery",
      productionMutationPerformed: false,
      cmsMutationPerformed: false,
      searchConsoleMutationPerformed: false,
      adsenseMutationPerformed: false,
      titleOrBodyMutationPerformed: false,
    });
    expect(artifact.stopCondition).toContain("does not authorize CMS edits");
  });

  it("writes blocked allowed-use and reason copy to the UI smoke markdown", () => {
    const artifact = buildRenderedDashboardUiSmokeArtifact(
      {
        url: "http://127.0.0.1:3000/",
        ...buildRenderedDashboardUiExpectations(makeDashboardData()),
        checks: ["http-2xx", "actionability-read-only-visible"],
      },
      "2026-07-05T15:03:30.000Z",
    );

    const markdown = renderRenderedDashboardUiSmokeMarkdown(artifact);

    expect(markdown).toContain(
      "- Allowed use: Read-only triage only. Do not execute dashboard recommendations until post-recovery verification passes.",
    );
    expect(markdown).toContain(
      "- Reason: Blocked until pnpm dashboard:post-recovery passes for yesa.kr.",
    );
    expect(markdown).toContain("- GSC handoff status: `pending_external`");
  });

  it("detects mojibake patterns beyond replacement characters", () => {
    expect(looksGarbledText("Search Console \u6C85\uB69C\uBE10 recovery")).toBe(true);
    expect(looksGarbledText("Search Console permission recovery")).toBe(false);
  });
});

function makeDashboardData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    generatedAt: "2026-07-05T14:45:01.131Z",
    siteCount: 98,
    stats: Array.from({ length: 98 }, (_, index) => ({
      id: `site-${index}`,
      host: `site-${index}.example`,
    })),
    fleetOptimizationChainStatus: {
      state: "current",
      reason: "Current chain matches stats.",
      expectedStatsGeneratedAt: "2026-07-05T14:45:01.131Z",
      statsSnapshot: "2026-07-05T14:45:01.131Z",
    },
    fleetOptimizationChain: makeChain(),
    t3TitleContentHandoff: {
      artifactPath: "data/t3-title-content-handoff-2026-07-05.json",
      workOrderPath: "docs/work-orders/t3-title-content-handoff-2026-07-05.md",
      generatedAt: "2026-07-05T14:45:01.131Z",
      snapshotTimestamp: "2026-07-05T14:45:01.131Z",
      refreshFailedSources: [],
      siteCount: 1,
      titleHandoffCount: 1,
      contentHandoffCount: 0,
      sites: [],
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
      generatedAt: "2026-07-05T14:45:01.131Z",
      collectorSnapshot: "data/site-stats.json generatedAt=2026-07-05T14:45:01.131Z",
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

function makeChain() {
  return {
    artifactPath: "data/fleet-optimization-chain-2026-07-05.json",
    workOrderPath: "docs/work-orders/fleet-optimization-chain-2026-07-05.md",
    generatedAt: "2026-07-05T14:45:06.000Z",
    date: "2026-07-05",
    statsSnapshot: "2026-07-05T14:45:01.131Z",
    planSnapshot: "2026-07-05T14:45:01.131Z",
    handoffSnapshot: "2026-07-05T14:45:01.131Z",
    refreshFailedSources: ["skipped_refresh_failed:gsc:auth_error:1"],
    readinessBlockingRefreshFailedSources: ["skipped_refresh_failed:gsc:auth_error:1"],
    maintenanceRefreshFailedSources: [],
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
  };
}
