import { describe, it, expect } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  isSignificantUserDrop,
  isSignificantClickDrop,
  getOperationalStatus,
  changeRate,
  sumGscMetrics,
  buildSegments,
  getDevelopmentPaths,
  getDashboardData,
  buildActionItems,
  loadAdsenseExternalProof,
  loadAdsenseProofFreshness,
  loadAdsenseProofGate,
  loadAdsenseRemediationQueue,
  loadDashboardPostRecoveryChain,
  loadFleetOptimizationChain,
  loadFleetOptimizationChainStatus,
  loadGscPermissionAudit,
  loadT3TitleContentHandoff,
  normalizeOpsCollectorAvailability,
  type EnrichedSiteStat,
  type GscMetricSet,
  type MetricSet,
  type Site,
  type SiteStat,
  type SiteTrend,
} from "./dashboard-data";
import { looksGarbledText } from "./text-readability";

describe("normalizeOpsCollectorAvailability", () => {
  it("preserves direct collector status and marks missing collectors explicitly", () => {
    expect(
      normalizeOpsCollectorAvailability({
        githubActions: {
          status: "skipped",
          detail: "Token is unavailable.",
          checkedAt: "2026-07-10T00:00:00.000Z",
          count: 0,
        },
        dashboardArtifacts: {
          status: "ok",
          detail: "Artifact read.",
          checkedAt: "2026-07-10T00:00:00.000Z",
          count: 3,
        },
      }),
    ).toEqual([
      expect.objectContaining({ key: "githubActions", status: "skipped", count: 0 }),
      expect.objectContaining({ key: "dashboardArtifacts", status: "ok", count: 3 }),
      expect.objectContaining({ key: "ga4", status: "missing", count: 0 }),
    ]);
  });
});

// OPERATIONS.md §3-5: 급락은 변동률과 절대규모를 함께 봐야 한다.
// 변동률만 보면 극소 트래픽(주 3명 → -73%)이 오탐이 된다.
describe("isSignificantUserDrop (사용자 급락 게이트)", () => {
  it("변동률 -30% 이상 + 직전 사용자 50명 이상이면 급락이다", () => {
    expect(isSignificantUserDrop(-0.5, 100)).toBe(true);
  });

  it("경계값(-0.3, 50)은 급락이다", () => {
    expect(isSignificantUserDrop(-0.3, 50)).toBe(true);
  });

  it("극소 트래픽(주 3명 → -73%)은 규모 게이트에서 걸러진다", () => {
    expect(isSignificantUserDrop(-0.73, 3)).toBe(false);
  });

  it("규모는 크지만 하락폭이 작으면 급락이 아니다", () => {
    expect(isSignificantUserDrop(-0.1, 500)).toBe(false);
  });

  it("변동률이 null/undefined면 급락이 아니다", () => {
    expect(isSignificantUserDrop(null, 500)).toBe(false);
    expect(isSignificantUserDrop(undefined, 500)).toBe(false);
  });
});

describe("isSignificantClickDrop (클릭 급락 게이트)", () => {
  it("변동률 -30% 이상 + 직전 클릭 10회 이상이면 급락이다", () => {
    expect(isSignificantClickDrop(-0.5, 20)).toBe(true);
  });

  it("경계값(-0.3, 10)은 급락이다", () => {
    expect(isSignificantClickDrop(-0.3, 10)).toBe(true);
  });

  it("직전 클릭 10회 미만이면 급락이 아니다", () => {
    expect(isSignificantClickDrop(-0.9, 5)).toBe(false);
  });
});

describe("changeRate (변동률)", () => {
  it("증가율을 비율로 계산한다", () => {
    expect(changeRate(120, 100)).toBeCloseTo(0.2);
  });

  it("감소율을 음수로 계산한다", () => {
    expect(changeRate(50, 100)).toBeCloseTo(-0.5);
  });

  it("직전 0 · 현재 0이면 0이다", () => {
    expect(changeRate(0, 0)).toBe(0);
  });

  it("직전 0 · 현재 양수면 비율 산정 불가(null = 신규)", () => {
    expect(changeRate(5, 0)).toBeNull();
  });
});

describe("sumGscMetrics (GSC 합산: ctr/position은 노출 가중)", () => {
  it("노출이 없으면 ctr/position은 0이다", () => {
    expect(sumGscMetrics([])).toEqual({
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    });
  });

  it("ctr과 position을 노출수로 가중평균한다", () => {
    const a: GscMetricSet = { clicks: 5, impressions: 100, ctr: 0.1, position: 2 };
    const b: GscMetricSet = { clicks: 25, impressions: 100, ctr: 0.2, position: 4 };
    const result = sumGscMetrics([a, b]);
    expect(result.clicks).toBe(30);
    expect(result.impressions).toBe(200);
    expect(result.ctr).toBeCloseTo(0.15);
    expect(result.position).toBeCloseTo(3);
  });
});

// OPERATIONS.md §2: 운영 상태 판정 순서. 특히 2026-06-05 변경으로
// sitemap 수집 지연은 더 이상 stale(운영 문제)로 보지 않는다.
describe("getOperationalStatus (운영 상태 판정)", () => {
  const fresh = new Date().toISOString();
  const base = (overrides: Partial<SiteStat>): SiteStat => ({
    id: "s",
    name: "s",
    url: "https://s.example",
    ga4PropertyId: "1",
    last7Days: emptyMetrics(),
    ga4Status: "ok",
    gscStatus: "ok",
    ga4LastSuccessfulFetchAt: fresh,
    gscLastSuccessfulFetchAt: fresh,
    ...overrides,
  });

  it("수집이 최신이고 상태가 ok면 정상이다", () => {
    expect(getOperationalStatus(base({}))).toBe("normal");
  });

  it("GA4 권한 오류는 권한 필요다", () => {
    expect(getOperationalStatus(base({ ga4Status: "auth_error" }))).toBe(
      "needsPermission",
    );
  });

  it("GA4 설정 누락은 권한 필요다", () => {
    expect(getOperationalStatus(base({ ga4Status: "missing_config" }))).toBe(
      "needsPermission",
    );
  });

  it("GSC API 오류는 API 실패다", () => {
    expect(getOperationalStatus(base({ gscStatus: "api_error" }))).toBe(
      "apiError",
    );
  });

  it("GA4/GSC 수집이 48시간을 넘으면 오래된 데이터다", () => {
    const old = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
    expect(
      getOperationalStatus(base({ ga4LastSuccessfulFetchAt: old })),
    ).toBe("stale");
  });

  it("sitemap 수집만 오래됐고 GA4/GSC가 정상이면 정상이다 (2026-06-05 규칙)", () => {
    const oldSitemap = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
    expect(
      getOperationalStatus(
        base({ sitemapLastDownloadedAt: oldSitemap }),
      ),
    ).toBe("normal");
  });
});

// P1′ 회귀: 세그먼트 탭 카운트(전체)와 필터 대상(memberIds)이 일치해야 한다.
// 과거 버그: 표시용 stats가 8개로 잘려 탭은 N개라 표시해도 필터는 8개만 걸렸다.
describe("buildSegments (세그먼트 멤버 vs 표시 절단)", () => {
  it("성장 사이트가 8개를 넘어도 memberIds는 전체를 담고 stats만 8개로 자른다", () => {
    const stats = Array.from({ length: 12 }, (_, i) =>
      makeEnriched({
        id: `g${i}`,
        trend: { activeUsersChange: 0.5, sessionsChange: 0.5, gscClicksChange: 0 },
        last7Days: { ...emptyMetrics(), activeUsers: 100 - i },
      }),
    );
    const growth = buildSegments(stats).find((s) => s.key === "growth");
    expect(growth).toBeDefined();
    expect(growth?.count).toBe(12);
    expect(growth?.memberIds).toHaveLength(12);
    expect(growth?.stats).toHaveLength(8);
  });
});

describe("getDevelopmentPaths", () => {
  it("keeps the local folder and adds a GitHub repository link", () => {
    const result = getDevelopmentPaths(
      makeSite({
        contentSource: {
          type: "github-next",
          locationLabel: "kwangju",
          localPath: "D:\\web\\kapti",
          githubRepo: "https://github.com/lsk7209/kapti.kr",
        },
      }),
    );

    expect(result.kind).toBe("local");
    expect(result.values).toEqual([
      {
        label: "kwangju",
        path: "D:\\web\\kapti",
        kind: "local",
      },
      {
        label: "GitHub",
        path: "https://github.com/lsk7209/kapti.kr",
        kind: "github",
      },
    ]);
  });

  it("can use GitHub as the primary location when no folder is registered", () => {
    const result = getDevelopmentPaths(
      makeSite({
        contentSource: {
          type: "github-next",
          githubRepo: "https://github.com/lsk7209/site.example",
        },
      }),
    );

    expect(result.kind).toBe("github");
    expect(result.values).toEqual([
      {
        label: "GitHub",
        path: "https://github.com/lsk7209/site.example",
        kind: "github",
      },
    ]);
  });
});

describe("buildActionItems (owner-required public fetch blockers)", () => {
  it("transient AdSense/ads.txt fetch failures are owner actions before local patches", () => {
    const actions = buildActionItems([
      makeEnriched({
        id: "blocked",
        adsenseStatus: "api_error",
        adsenseCollectorStatus: "transient_error",
        adsenseError: "AdSense collection transient: homepage fetch failed",
        adsTxtStatus: "api_error",
        adsTxtCollectorStatus: "transient_error",
        adsTxtError: "ads.txt collection transient: ads_txt fetch failed",
      }),
    ]);

    expect(actions[0]?.kind).toBe("owner");
    expect(actions[0]?.nextStep).toContain("HTTP/HTTPS reachability");
  });

  it("does not put exact approved AdSense domains back into the approval repair queue", () => {
    const actions = buildActionItems([
      makeEnriched({
        id: "sellerpit",
        url: "https://sellerpit.kr/",
        adsenseStatus: "api_error",
        adsenseCollectorStatus: "transient_error",
        adsenseError: "AdSense collection transient: homepage fetch failed",
        adsTxtStatus: "api_error",
        adsTxtCollectorStatus: "transient_error",
        adsTxtError: "ads.txt collection transient: ads_txt fetch failed",
      }),
    ]);

    expect(actions.some((action) => action.kind === "owner")).toBe(false);
    expect(actions.some((action) => action.kind === "monetization")).toBe(
      false,
    );
  });

  it("routes subdomains of approved roots to AdSense console scope review first", () => {
    const actions = buildActionItems([
      makeEnriched({
        id: "smart-sellerpit",
        url: "https://smart.sellerpit.kr/",
        adsenseStatus: "api_error",
        adsenseCollectorStatus: "transient_error",
        adsTxtStatus: "api_error",
        adsTxtCollectorStatus: "transient_error",
      }),
    ]);

    expect(actions[0]?.kind).toBe("owner");
    expect(actions[0]?.value).toBe("AdSense scope review");
    expect(actions[0]?.nextStep).toContain("inherited");
    expect(actions.some((action) => action.kind === "monetization")).toBe(
      false,
    );
  });

  it("prioritizes approved-root scope review before ordinary public fetch repairs", () => {
    const actions = buildActionItems([
      makeEnriched({
        id: "blocked",
        url: "https://blocked-example.kr/",
        adsenseStatus: "api_error",
        adsenseCollectorStatus: "transient_error",
        adsTxtStatus: "api_error",
        adsTxtCollectorStatus: "transient_error",
      }),
      makeEnriched({
        id: "gpt-nexttech7",
        url: "https://gpt.nexttech7.com/",
        adsenseStatus: "api_error",
        adsenseCollectorStatus: "transient_error",
        adsTxtStatus: "api_error",
        adsTxtCollectorStatus: "transient_error",
      }),
    ]);

    expect(actions[0]?.value).toBe("AdSense scope review");
    expect(actions[1]?.value).toBe("Public fetch blocked");
  });

  it("uses external proof decisions to split public fetch blockers", () => {
    const actions = buildActionItems([
      makeEnriched({
        id: "richyou",
        url: "https://richyou.kr/",
        adsenseStatus: "api_error",
        adsenseCollectorStatus: "transient_error",
        adsTxtStatus: "api_error",
        adsTxtCollectorStatus: "transient_error",
        adsenseExternalProof: {
          siteId: "richyou",
          url: "https://richyou.kr/",
          host: "richyou.kr",
          externalHomepageProof: "pass",
          externalHomepageEvidence: "External homepage proof exists.",
          externalAdsTxtProof: "not_proven_in_this_pass",
          externalLoaderProof: "prior live HTML proof documented",
          currentDecision: "strongest_console_check_candidate",
          nextGate: "Check AdSense console site state.",
          endpointRetrySummary:
            "Latest endpoint retry: ads.txt=network_error, robots.txt=network_error.",
          loaderRetrySummary: "Latest raw loader retry: network_error.",
          networkVantageSummary:
            "Latest network vantage: dns=158.247.212.123, tcp80=timeout, tcp443=timeout. sharedOrigin=158.247.212.123/6, originTcp80Pass=0, originTcp443Pass=0, originFullTcpBlocked=6.",
        },
      }),
      makeEnriched({
        id: "nicewomen",
        url: "https://nicewomen.kr/",
        adsenseStatus: "api_error",
        adsenseCollectorStatus: "transient_error",
        adsTxtStatus: "api_error",
        adsTxtCollectorStatus: "transient_error",
        adsenseExternalProof: {
          siteId: "nicewomen",
          url: "https://nicewomen.kr/",
          host: "nicewomen.kr",
          externalHomepageProof: "not_proven_in_this_pass",
          externalHomepageEvidence: "Current homepage proof is missing.",
          externalAdsTxtProof: "not_proven_in_this_pass",
          externalLoaderProof: "historical trace only",
          currentDecision: "hold_for_fresh_external_proof",
          nextGate: "Get current homepage and loader proof.",
        },
      }),
      makeEnriched({
        id: "esgyo",
        url: "https://esgyo.kr/",
        adsenseStatus: "api_error",
        adsenseCollectorStatus: "transient_error",
        adsTxtStatus: "api_error",
        adsTxtCollectorStatus: "transient_error",
        adsenseExternalProof: {
          siteId: "esgyo",
          url: "https://esgyo.kr/",
          host: "esgyo.kr",
          externalHomepageProof: "not_proven_in_this_pass",
          externalHomepageEvidence: "Local source is missing.",
          externalAdsTxtProof: "not_proven_in_this_pass",
          externalLoaderProof: "source_missing_in_available_folder",
          currentDecision: "source_recovery_needed",
          nextGate: "Recover actual production source.",
        },
      }),
      makeEnriched({
        id: "ezfunnel",
        url: "https://ezfunnel.kr/",
        adsenseStatus: "api_error",
        adsenseCollectorStatus: "transient_error",
        adsTxtStatus: "api_error",
        adsTxtCollectorStatus: "transient_error",
        adsenseExternalProof: {
          siteId: "ezfunnel",
          url: "https://ezfunnel.kr/",
          host: "ezfunnel.kr",
          externalHomepageProof: "not_proven_in_this_pass",
          externalHomepageEvidence: "Local hardening package exists.",
          externalAdsTxtProof: "not_proven_in_this_pass",
          externalLoaderProof: "local_hardening_package_only",
          currentDecision: "live_apply_state_needed",
          nextGate: "Confirm live root apply state.",
        },
      }),
    ]);

    expect(actions[0]?.value).toBe("Source recovery needed");
    expect(actions[1]?.value).toBe("Console check candidate");
    expect(actions[1]?.reason).toContain("External homepage proof");
    expect(actions[1]?.reason).toContain(
      "Latest endpoint retry: ads.txt=network_error, robots.txt=network_error.",
    );
    expect(actions[1]?.reason).toContain(
      "Latest raw loader retry: network_error.",
    );
    expect(actions[1]?.reason).toContain(
      "Latest network vantage: dns=158.247.212.123, tcp80=timeout, tcp443=timeout. sharedOrigin=158.247.212.123/6, originTcp80Pass=0, originTcp443Pass=0, originFullTcpBlocked=6.",
    );
    expect(actions[2]?.value).toBe("Live apply check needed");
    expect(actions[3]?.value).toBe("Fresh proof needed");
  });

  it("adds remediation queue actions for telemetry lanes without duplicating covered AdSense lanes", () => {
    const actions = buildActionItems([
      makeEnriched({
        id: "richyou",
        url: "https://richyou.kr/",
        adsenseStatus: "api_error",
        adsenseCollectorStatus: "transient_error",
        adsTxtStatus: "api_error",
        adsTxtCollectorStatus: "transient_error",
        adsenseRemediationQueueItem: makeRemediationQueueItem({
          siteId: "richyou",
          host: "richyou.kr",
          lane: "ordinary_adsense_proof",
        }),
      }),
      makeEnriched({
        id: "smart-sellerpit",
        url: "https://smart.sellerpit.kr/",
        adsenseStatus: "api_error",
        adsenseCollectorStatus: "transient_error",
        adsTxtStatus: "api_error",
        adsTxtCollectorStatus: "transient_error",
        adsenseRemediationQueueItem: makeRemediationQueueItem({
          siteId: "smart-sellerpit",
          host: "smart.sellerpit.kr",
          lane: "approved_root_subdomain_scope",
        }),
      }),
      makeEnriched({
        id: "certifi",
        url: "https://certifi.kr/",
        adsenseStatus: "ok",
        adsTxtStatus: "ok",
        gscStatus: "auth_error",
        adsenseRemediationQueueItem: makeRemediationQueueItem({
          siteId: "certifi",
          host: "certifi.kr",
          lane: "gsc_auth_telemetry",
          requiredEvidence: ["GSC credential/property access restored"],
          stopCondition:
            "This is telemetry maintenance, not an AdSense submit blocker.",
        }),
      }),
      makeEnriched({
        id: "kapti",
        url: "https://kapti.kr/",
        adsenseStatus: "ok",
        adsTxtStatus: "ok",
        ga4Status: "missing_config",
        adsenseRemediationQueueItem: makeRemediationQueueItem({
          siteId: "kapti",
          host: "kapti.kr",
          lane: "ga4_config_telemetry",
          requiredEvidence: ["GA4 property/config binding completed"],
          stopCondition:
            "This is analytics telemetry maintenance, not an AdSense submit blocker.",
        }),
      }),
    ]);

    expect(
      actions.filter(
        (action) =>
          action.siteId === "richyou" &&
          [
            "Public fetch blocked",
            "AdSense proof queue",
            "Console check candidate",
            "External proof partial",
            "Fresh proof needed",
            "Live apply check needed",
            "Source recovery needed",
          ].includes(action.value),
      ),
    ).toHaveLength(1);
    expect(
      actions.find(
        (action) =>
          action.siteId === "richyou" && action.value === "Public fetch blocked",
      ),
    ).toBeDefined();
    expect(
      actions.filter(
        (action) =>
          action.siteId === "smart-sellerpit" &&
          action.value === "AdSense scope review",
      ),
    ).toHaveLength(1);
    expect(
      actions.find((action) => action.siteId === "smart-sellerpit")?.value,
    ).toBe("AdSense scope review");
    expect(actions.find((action) => action.siteId === "certifi")?.value).toBe(
      "GSC auth telemetry",
    );
    expect(actions.find((action) => action.siteId === "kapti")?.value).toBe(
      "GA4 config telemetry",
    );
    expect(actions.find((action) => action.siteId === "certifi")?.reason).toBe(
      "certifi.kr: GSC credential/property access restored.",
    );
  });

  it("prefers GSC permission audit details for permission actions", () => {
    const actions = buildActionItems(
      [
        makeEnriched({
          id: "yesa",
          name: "yesa.kr",
          url: "https://yesa.kr/",
          operationalStatus: "needsPermission",
          statusLabel: "권한 필요",
          statusReason: "GSC 권한 또는 Search Console 속성 확인이 필요합니다.",
          gscStatus: "auth_error",
          adsenseRemediationQueueItem: makeRemediationQueueItem({
            siteId: "yesa",
            host: "yesa.kr",
            lane: "gsc_auth_telemetry",
          }),
        }),
      ],
      makeGscPermissionAuditSummary("2026-07-05T01:00:00.000Z"),
    );

    expect(actions[0]).toMatchObject({
      siteId: "yesa",
      kind: "permission",
      priority: 101,
      value: "GSC permission audit",
    });
    expect(actions[0]?.reason).toContain("siteUnverifiedUser / unverified");
    expect(actions[0]?.nextStep).toContain("pnpm dashboard:post-recovery");
    expect(actions[0]?.nextStep).not.toContain("pnpm fleet:optimize");
    expect(actions.some((action) => action.value === "GSC auth telemetry")).toBe(false);
  });

  it("does not surface external GSC permission actions for pending local refresh audits", () => {
    const actions = buildActionItems(
      [
        makeEnriched({
          id: "yesa",
          name: "yesa.kr",
          url: "https://yesa.kr/",
          operationalStatus: "needsPermission",
          statusLabel: "沅뚰븳 ?꾩슂",
          statusReason: "GSC 沅뚰븳 ?먮뒗 Search Console ?띿꽦 ?뺤씤???꾩슂?⑸땲??",
          gscStatus: "auth_error",
          adsenseRemediationQueueItem: makeRemediationQueueItem({
            siteId: "yesa",
            host: "yesa.kr",
            lane: "gsc_auth_telemetry",
          }),
        }),
      ],
      {
        ...makeGscPermissionAuditSummary("2026-07-05T01:00:00.000Z"),
        handoffStatus: "pending_local_refresh",
        ownerAccess: 1,
        unverified: 0,
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
    );

    expect(actions.some((action) => action.value === "GSC permission audit")).toBe(false);
    expect(actions.some((action) => action.value === "GSC auth telemetry")).toBe(true);
  });

  it("surfaces stale AdSense proof snapshots before the generic proof queue", () => {
    const actions = buildActionItems(
      [
        makeEnriched({
          id: "richyou",
          name: "richyou.kr",
          url: "https://richyou.kr/",
          adsenseRemediationQueueItem: makeRemediationQueueItem({
            siteId: "richyou",
            host: "richyou.kr",
            lane: "ordinary_adsense_proof",
          }),
        }),
      ],
      null,
      {
        status: "stale",
        artifactPath: "data/adsense-external-proof-continuation-2026-06-23.json",
        collectorSnapshot:
          "data/site-stats.json generatedAt=2026-06-23T00:05:08.480Z",
        expectedStatsGeneratedAt: "2026-07-05T12:44:46.344Z",
        candidateSiteIds: ["richyou"],
        candidateCount: 1,
        reason: "External proof collectorSnapshot does not match current stats.",
        remediationCommand: "pnpm adsense:proof:refresh-snapshot",
      },
    );

    expect(actions[0]).toMatchObject({
      siteId: "richyou",
      priority: 94,
      value: "AdSense proof snapshot stale",
    });
    expect(actions.some((action) => action.value === "AdSense proof queue")).toBe(false);
    expect(actions[0]?.nextStep).toContain("pnpm adsense:proof:refresh-snapshot");
  });

  it("does not surface stale AdSense proof for sites no longer in the proof queue", () => {
    const actions = buildActionItems(
      [
        makeEnriched({
          id: "ezfunnel",
          name: "ezfunnel.kr",
          url: "https://ezfunnel.kr/",
          adsenseStatus: "ok",
          adsenseCollectorStatus: "ok",
          adsTxtStatus: "ok",
          adsTxtCollectorStatus: "ok",
        }),
      ],
      null,
      {
        status: "stale",
        artifactPath: "data/adsense-external-proof-continuation-2026-06-23.json",
        collectorSnapshot:
          "data/site-stats.json generatedAt=2026-06-28T19:27:32.760Z",
        expectedStatsGeneratedAt: "2026-07-05T12:44:46.344Z",
        candidateSiteIds: ["ezfunnel"],
        candidateCount: 1,
        reason: "External proof collectorSnapshot does not match current stats.",
        remediationCommand: "pnpm adsense:proof:refresh-snapshot",
      },
    );

    expect(actions.some((action) => action.value === "AdSense proof snapshot stale")).toBe(false);
  });

  it("keeps common action labels and instructions readable", () => {
    const actions = buildActionItems([
      makeEnriched({
        id: "permission",
        name: "permission.example",
        url: "https://permission.example/",
        operationalStatus: "needsPermission",
        statusLabel: "권한 필요",
        statusReason: "GSC 권한 확인이 필요합니다.",
      }),
      makeEnriched({
        id: "adsense",
        name: "adsense.example",
        url: "https://adsense.example/",
        adsenseStatus: "missing_config",
      }),
      makeEnriched({
        id: "adstxt",
        name: "adstxt.example",
        url: "https://adstxt.example/",
        adsTxtStatus: "missing_config",
      }),
      makeEnriched({
        id: "decline",
        name: "decline.example",
        url: "https://decline.example/",
        previous7Days: { ...emptyMetrics(), activeUsers: 100 },
        trend: {
          activeUsersChange: -0.5,
          sessionsChange: 0,
          gscClicksChange: 0,
        },
      }),
    ]);

    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          siteId: "permission",
          label: "권한",
          nextStep: expect.stringContaining("GSC/GA4"),
        }),
        expect.objectContaining({
          siteId: "adsense",
          label: "수익화",
          value: "코드 미탐지",
        }),
        expect.objectContaining({
          siteId: "adstxt",
          label: "수익화",
          value: "ads.txt 없음",
        }),
        expect.objectContaining({
          siteId: "decline",
          label: "급락",
          reason: "GA4 사용자가 직전 7일 대비 크게 감소했습니다.",
        }),
      ]),
    );
    for (const action of actions) {
      expect(`${action.label} ${action.value} ${action.reason} ${action.nextStep}`).not.toMatch(
        /[�沅뚰븳肄붾뱶湲됰씫섏쭛곹깭쒖쐞怨꾩젙묎렐]/,
      );
    }
  });
});

describe("loadAdsenseExternalProof", () => {
  it("loads the latest dated external proof artifact", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-"));
    try {
      writeFileSync(
        join(dir, "adsense-external-proof-continuation-2026-06-22.json"),
        JSON.stringify({
          candidates: [
            {
              siteId: "old",
              url: "https://old.example/",
              host: "old.example",
              externalHomepageProof: "pass",
              externalHomepageEvidence: "old proof",
              externalAdsTxtProof: "pass",
              externalLoaderProof: "pass",
              currentDecision: "manual_external_review_needed",
              nextGate: "old gate",
            },
          ],
        }),
      );
      writeFileSync(
        join(dir, "adsense-external-proof-continuation-2026-06-23.json"),
        JSON.stringify({
          candidates: [
            {
              siteId: "new",
              url: "https://new.example/",
              host: "new.example",
              externalHomepageProof: "pass",
              externalHomepageEvidence: "new proof",
              externalAdsTxtProof: "pass",
              externalLoaderProof: "pass",
              currentDecision: "strongest_console_check_candidate",
              nextGate: "new gate",
            },
          ],
        }),
      );

      const proof = loadAdsenseExternalProof(dir);

      expect(proof.has("old")).toBe(false);
      expect(proof.get("new")?.nextGate).toBe("new gate");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("loads proof only when the collector snapshot matches the expected stats snapshot", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-matching-"));
    try {
      writeFileSync(
        join(dir, "adsense-external-proof-continuation-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T12:49:49.029Z",
          candidates: [
            {
              siteId: "richyou",
              url: "https://richyou.kr/",
              host: "richyou.kr",
              externalHomepageProof: "pass",
              externalHomepageEvidence: "current proof",
              externalAdsTxtProof: "pass",
              externalLoaderProof: "pass",
              currentDecision: "strongest_console_check_candidate",
              nextGate: "console check",
            },
          ],
        }),
      );

      const proof = loadAdsenseExternalProof(
        dir,
        "2026-06-23T12:49:49.029Z",
      );

      expect(proof.get("richyou")?.nextGate).toBe("console check");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores proof when the collector snapshot is stale for the expected stats snapshot", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-stale-"));
    try {
      writeFileSync(
        join(dir, "adsense-external-proof-continuation-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T00:05:08.480Z",
          candidates: [
            {
              siteId: "richyou",
              url: "https://richyou.kr/",
              host: "richyou.kr",
              externalHomepageProof: "pass",
              externalHomepageEvidence: "old proof",
              externalAdsTxtProof: "pass",
              externalLoaderProof: "pass",
              currentDecision: "strongest_console_check_candidate",
              nextGate: "console check",
            },
          ],
        }),
      );

      expect(
        loadAdsenseExternalProof(dir, "2026-06-23T12:49:49.029Z").size,
      ).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("summarizes stale proof freshness with affected site ids", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-freshness-"));
    try {
      writeFileSync(
        join(dir, "adsense-external-proof-continuation-2026-06-23.json"),
        JSON.stringify({
          generatedAt: "2026-06-23T00:00:00.000Z",
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T00:05:08.480Z",
          candidates: [
            {
              siteId: "richyou",
              url: "https://richyou.kr/",
              host: "richyou.kr",
              externalHomepageProof: "pass",
              externalHomepageEvidence: "old proof",
              externalAdsTxtProof: "pass",
              externalLoaderProof: "pass",
              currentDecision: "strongest_console_check_candidate",
              nextGate: "console check",
            },
          ],
        }),
      );

      const freshness = loadAdsenseProofFreshness(
        dir,
        "2026-06-23T12:49:49.029Z",
      );

      expect(freshness).toMatchObject({
        status: "stale",
        candidateSiteIds: ["richyou"],
        candidateCount: 1,
        remediationCommand: "pnpm adsense:proof:refresh-snapshot",
      });
      expect(freshness.reason).toContain("does not match current stats");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("summarizes current proof freshness when collector snapshots match", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-current-"));
    try {
      writeFileSync(
        join(dir, "adsense-external-proof-continuation-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T12:49:49.029Z",
          candidates: [{ siteId: "richyou" }],
        }),
      );

      const freshness = loadAdsenseProofFreshness(
        dir,
        "2026-06-23T12:49:49.029Z",
      );

      expect(freshness.status).toBe("current");
      expect(freshness.candidateSiteIds).toEqual(["richyou"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("summarizes stale proof as resolved when current proof lanes are empty", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-resolved-"));
    try {
      writeFileSync(
        join(dir, "adsense-external-proof-continuation-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-28T19:27:32.760Z",
          candidates: [{ siteId: "ezfunnel" }],
        }),
      );
      writeFileSync(
        join(dir, "adsense-remediation-queue-2026-07-05.json"),
        JSON.stringify({
          generatedAt: "2026-07-05T12:45:00.000Z",
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-07-05T12:44:46.344Z",
          productionMutationPerformed: false,
          adsenseConsoleChecked: false,
          summary: {
            totalRows: 1,
            reviewedRows: 1,
            adsenseOkRows: 1,
            problemRows: 0,
            ordinaryAdsenseProof: 0,
            approvedRootSubdomainScope: 0,
            gscAuthTelemetry: 0,
            ga4ConfigTelemetry: 0,
          },
          lanes: {
            ordinary_adsense_proof: [],
            approved_root_subdomain_scope: [],
            gsc_auth_telemetry: [],
            ga4_config_telemetry: [],
          },
        }),
      );

      const freshness = loadAdsenseProofFreshness(
        dir,
        "2026-07-05T12:44:46.344Z",
      );

      expect(freshness.status).toBe("resolved");
      expect(freshness.candidateSiteIds).toEqual(["ezfunnel"]);
      expect(freshness.reason).toContain("resolved");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("applies matching local source supplement decisions to external proof", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-supplement-"));
    try {
      writeFileSync(
        join(dir, "adsense-external-proof-continuation-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T13:33:24.000Z",
          candidates: [
            {
              siteId: "esgyo",
              url: "https://esgyo.kr/",
              host: "esgyo.kr",
              externalHomepageProof: "not_proven_in_this_pass",
              externalHomepageEvidence: "fresh proof missing",
              externalAdsTxtProof: "not_proven_in_this_pass",
              externalLoaderProof: "not_proven_in_this_pass",
              currentDecision: "hold_for_fresh_external_proof",
              nextGate: "Get fresh proof.",
            },
            {
              siteId: "ezfunnel",
              url: "https://ezfunnel.kr/",
              host: "ezfunnel.kr",
              externalHomepageProof: "not_proven_in_this_pass",
              externalHomepageEvidence: "fresh proof missing",
              externalAdsTxtProof: "not_proven_in_this_pass",
              externalLoaderProof: "not_proven_in_this_pass",
              currentDecision: "hold_for_fresh_external_proof",
              nextGate: "Get fresh proof.",
            },
          ],
        }),
      );
      writeFileSync(
        join(dir, "adsense-local-source-proof-supplement-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T13:33:24.000Z",
          sites: [
            {
              siteId: "esgyo",
              host: "esgyo.kr",
              localSourceStatus: "source_missing_for_adsense_setup",
              evidence: ["Available folder lacks AdSense setup files."],
              nextGate: "Recover the actual production source.",
            },
            {
              siteId: "ezfunnel",
              host: "ezfunnel.kr",
              localSourceStatus:
                "local_hardening_package_ready_not_live_verified",
              evidence: ["Local hardening package exists."],
              nextGate: "Confirm live WP root apply state.",
            },
          ],
        }),
      );

      const proof = loadAdsenseExternalProof(
        dir,
        "2026-06-23T13:33:24.000Z",
      );

      expect(proof.get("esgyo")?.currentDecision).toBe(
        "source_recovery_needed",
      );
      expect(proof.get("esgyo")?.nextGate).toBe(
        "Recover the actual production source.",
      );
      expect(proof.get("ezfunnel")?.currentDecision).toBe(
        "live_apply_state_needed",
      );
      expect(proof.get("ezfunnel")?.externalHomepageEvidence).toContain(
        "Local hardening package",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores local source supplement decisions when their snapshot is stale", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-stale-supplement-"));
    try {
      writeFileSync(
        join(dir, "adsense-external-proof-continuation-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T13:33:24.000Z",
          candidates: [
            {
              siteId: "esgyo",
              url: "https://esgyo.kr/",
              host: "esgyo.kr",
              externalHomepageProof: "not_proven_in_this_pass",
              externalHomepageEvidence: "fresh proof missing",
              externalAdsTxtProof: "not_proven_in_this_pass",
              externalLoaderProof: "not_proven_in_this_pass",
              currentDecision: "hold_for_fresh_external_proof",
              nextGate: "Get fresh proof.",
            },
          ],
        }),
      );
      writeFileSync(
        join(dir, "adsense-local-source-proof-supplement-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T00:05:08.480Z",
          sites: [
            {
              siteId: "esgyo",
              host: "esgyo.kr",
              localSourceStatus: "source_missing_for_adsense_setup",
              evidence: ["Stale source evidence."],
              nextGate: "Recover source.",
            },
          ],
        }),
      );

      const proof = loadAdsenseExternalProof(
        dir,
        "2026-06-23T13:33:24.000Z",
      );

      expect(proof.get("esgyo")?.currentDecision).toBe(
        "hold_for_fresh_external_proof",
      );
      expect(proof.get("esgyo")?.nextGate).toBe("Get fresh proof.");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("applies matching endpoint, loader, and network retry summaries to external proof", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-retry-summary-"));
    try {
      writeFileSync(
        join(dir, "adsense-external-proof-continuation-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T13:33:24.000Z",
          candidates: [
            {
              siteId: "richyou",
              url: "https://richyou.kr/",
              host: "richyou.kr",
              externalHomepageProof: "pass",
              externalHomepageEvidence: "current proof",
              externalAdsTxtProof: "not_proven_in_this_pass",
              externalLoaderProof: "prior live HTML proof documented",
              currentDecision: "strongest_console_check_candidate",
              nextGate: "console check",
            },
          ],
        }),
      );
      writeFileSync(
        join(dir, "adsense-proof-endpoint-retry-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T13:33:24.000Z",
          results: [
            {
              siteId: "richyou",
              endpoint: "robots.txt",
              result: "network_error",
            },
            {
              siteId: "richyou",
              endpoint: "ads.txt",
              result: "pass",
            },
            {
              siteId: "unknown",
              endpoint: "ads.txt",
              result: "pass",
            },
          ],
        }),
      );
      writeFileSync(
        join(dir, "adsense-loader-proof-retry-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T13:33:24.000Z",
          results: [
            {
              siteId: "richyou",
              result: "network_error",
            },
            {
              siteId: "unknown",
              result: "pass",
            },
          ],
        }),
      );
      writeFileSync(
        join(dir, "adsense-network-vantage-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T13:33:24.000Z",
          results: [
            {
              siteId: "richyou",
              host: "richyou.kr",
              addresses: ["158.247.212.123"],
              tcp80: "timeout",
              tcp443: "timeout",
            },
            {
              siteId: "unknown",
              addresses: ["203.0.113.1"],
              tcp80: "pass",
              tcp443: "pass",
            },
          ],
          summary: {
            sharedOrigins: [
              {
                address: "158.247.212.123",
                hostCount: 6,
                tcp80Pass: 0,
                tcp443Pass: 0,
                fullTcpBlocked: 6,
              },
            ],
          },
        }),
      );

      const proof = loadAdsenseExternalProof(
        dir,
        "2026-06-23T13:33:24.000Z",
      ).get("richyou");

      expect(proof?.endpointRetrySummary).toBe(
        "Latest endpoint retry: ads.txt=pass, robots.txt=network_error.",
      );
      expect(proof?.loaderRetrySummary).toBe(
        "Latest raw loader retry: network_error.",
      );
      expect(proof?.networkVantageSummary).toBe(
        "Latest network vantage: dns=158.247.212.123, tcp80=timeout, tcp443=timeout. sharedOrigin=158.247.212.123/6, originTcp80Pass=0, originTcp443Pass=0, originFullTcpBlocked=6.",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores endpoint and loader retry summaries when their snapshot is stale", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-stale-retry-"));
    try {
      writeFileSync(
        join(dir, "adsense-external-proof-continuation-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T13:33:24.000Z",
          candidates: [
            {
              siteId: "richyou",
              url: "https://richyou.kr/",
              host: "richyou.kr",
              externalHomepageProof: "pass",
              externalHomepageEvidence: "current proof",
              externalAdsTxtProof: "not_proven_in_this_pass",
              externalLoaderProof: "prior live HTML proof documented",
              currentDecision: "strongest_console_check_candidate",
              nextGate: "console check",
            },
          ],
        }),
      );
      writeFileSync(
        join(dir, "adsense-proof-endpoint-retry-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T00:05:08.480Z",
          results: [
            {
              siteId: "richyou",
              endpoint: "ads.txt",
              result: "pass",
            },
          ],
        }),
      );
      writeFileSync(
        join(dir, "adsense-loader-proof-retry-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T00:05:08.480Z",
          results: [
            {
              siteId: "richyou",
              result: "pass",
            },
          ],
        }),
      );
      writeFileSync(
        join(dir, "adsense-network-vantage-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T00:05:08.480Z",
          results: [
            {
              siteId: "richyou",
              addresses: ["158.247.212.123"],
              tcp80: "pass",
              tcp443: "pass",
            },
          ],
        }),
      );

      const proof = loadAdsenseExternalProof(
        dir,
        "2026-06-23T13:33:24.000Z",
      ).get("richyou");

      expect(proof?.endpointRetrySummary).toBeUndefined();
      expect(proof?.loaderRetrySummary).toBeUndefined();
      expect(proof?.networkVantageSummary).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps loading proof without a stats snapshot expectation for compatibility", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-compatible-"));
    try {
      writeFileSync(
        join(dir, "adsense-external-proof-continuation-2026-06-23.json"),
        JSON.stringify({
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-23T00:05:08.480Z",
          candidates: [
            {
              siteId: "richyou",
              url: "https://richyou.kr/",
              host: "richyou.kr",
              externalHomepageProof: "pass",
              externalHomepageEvidence: "old proof",
              externalAdsTxtProof: "pass",
              externalLoaderProof: "pass",
              currentDecision: "strongest_console_check_candidate",
              nextGate: "console check",
            },
          ],
        }),
      );

      expect(loadAdsenseExternalProof(dir).get("richyou")?.nextGate).toBe(
        "console check",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns an empty map when no proof artifacts exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-empty-"));
    try {
      expect(loadAdsenseExternalProof(dir).size).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores malformed proof candidates and unknown decisions", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-invalid-"));
    try {
      writeFileSync(
        join(dir, "adsense-external-proof-continuation-2026-06-23.json"),
        JSON.stringify({
          candidates: [
            {
              siteId: "bad-decision",
              url: "https://bad.example/",
              host: "bad.example",
              externalHomepageProof: "pass",
              externalHomepageEvidence: "bad proof",
              externalAdsTxtProof: "pass",
              externalLoaderProof: "pass",
              currentDecision: "submit_now",
              nextGate: "bad gate",
            },
            {
              siteId: "missing-fields",
              currentDecision: "manual_external_review_needed",
            },
          ],
        }),
      );

      expect(loadAdsenseExternalProof(dir).size).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("loadAdsenseRemediationQueue", () => {
  it("loads the latest matching remediation queue artifact", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-queue-"));
    try {
      writeFileSync(
        join(dir, "adsense-remediation-queue-2026-06-23.json"),
        JSON.stringify(
          makeRemediationQueueArtifact({
            collectorSnapshot:
              "data/site-stats.json generatedAt=2026-06-23T13:33:24.000Z",
            siteId: "old",
            problemRows: 1,
          }),
        ),
      );
      writeFileSync(
        join(dir, "adsense-remediation-queue-2026-06-24.json"),
        JSON.stringify(
          makeRemediationQueueArtifact({
            collectorSnapshot:
              "data/site-stats.json generatedAt=2026-06-24T01:02:03.000Z",
            siteId: "richyou",
            problemRows: 15,
          }),
        ),
      );

      const queue = loadAdsenseRemediationQueue(
        dir,
        "2026-06-24T01:02:03.000Z",
      );

      expect(queue?.problemRows).toBe(15);
      expect(queue?.ordinaryAdsenseProof).toBe(1);
      expect(queue?.lanes.ordinary_adsense_proof[0]?.siteId).toBe("richyou");
      expect(queue?.productionMutationPerformed).toBe(false);
      expect(queue?.adsenseConsoleChecked).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores remediation queue artifacts from stale stats snapshots", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-queue-stale-"));
    try {
      writeFileSync(
        join(dir, "adsense-remediation-queue-2026-06-24.json"),
        JSON.stringify(
          makeRemediationQueueArtifact({
            collectorSnapshot:
              "data/site-stats.json generatedAt=2026-06-23T13:33:24.000Z",
            siteId: "richyou",
            problemRows: 15,
          }),
        ),
      );

      expect(
        loadAdsenseRemediationQueue(dir, "2026-06-24T01:02:03.000Z"),
      ).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects remediation queue artifacts with polluted collector snapshots", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-queue-polluted-"));
    try {
      writeFileSync(
        join(dir, "adsense-remediation-queue-2026-06-24.json"),
        JSON.stringify(
          makeRemediationQueueArtifact({
            collectorSnapshot:
              "data/site-stats.json generatedAt=2026-06-24T01:02:03.000Z stale",
            siteId: "richyou",
            problemRows: 15,
          }),
        ),
      );

      expect(
        loadAdsenseRemediationQueue(dir, "2026-06-24T01:02:03.000Z"),
      ).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores malformed remediation queue artifacts", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-queue-bad-"));
    try {
      writeFileSync(
        join(dir, "adsense-remediation-queue-2026-06-24.json"),
        JSON.stringify({
          generatedAt: "2026-06-24T01:00:00.000Z",
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-24T01:02:03.000Z",
          productionMutationPerformed: true,
          adsenseConsoleChecked: false,
          summary: {},
          lanes: {},
        }),
      );

      expect(
        loadAdsenseRemediationQueue(dir, "2026-06-24T01:02:03.000Z"),
      ).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("getDashboardData insight copy", () => {
  it("keeps the shared mojibake detector narrow enough for Korean question copy", () => {
    expect(looksGarbledText("Search Console 권한을 확인했나요?")).toBe(false);
    expect(looksGarbledText("Search Console \u6C85\uB69C\uBE10 recovery")).toBe(true);
    expect(looksGarbledText("Search Console ì‹¤í–‰ ë³´ë¥˜")).toBe(true);
    expect(looksGarbledText("Search Console Ã¬Â‹Â¤Ã­â€“â€°")).toBe(true);
  });

  it("does not expose garbled text in current insight card fields", () => {
    const data = getDashboardData();
    const fields = [
      "reason",
      "recommendedAction",
      "operatorPrompt",
      "verification",
      "reviewNote",
      "gscDiagnosis",
    ] as const;

    const badFields = data.insights.flatMap((insight) =>
      fields
        .filter((field) => looksGarbledText(String(insight[field] ?? "")))
        .map((field) => `${insight.siteId}:${insight.kind}:${field}`),
    );

    expect(badFields).toEqual([]);
  });

  it("does not label GSC-zero sites with healthy collection as permission errors", () => {
    const data = getDashboardData();
    const statsById = new Map(data.stats.map((stat) => [stat.id, stat]));
    const misleadingInsights = data.insights
      .filter((insight) => insight.kind === "indexingOrPermissionIssue")
      .filter((insight) => {
        const stat = statsById.get(insight.siteId);
        return stat?.gscStatus === "ok" && insight.reason.includes("권한 오류");
      })
      .map((insight) => `${insight.siteId}:${insight.reason}`);

    expect(misleadingInsights).toEqual([]);
  });

  it("adds cause, confidence, and sample-size labels to every insight", () => {
    const data = getDashboardData();
    const missingFields = data.insights
      .filter(
        (insight) =>
          !insight.cause || !insight.confidence || !insight.sampleSize,
      )
      .map((insight) => `${insight.siteId}:${insight.kind}`);

    expect(missingFields).toEqual([]);
  });

  it("distinguishes GA4 decline from search-click decline", () => {
    const data = getDashboardData();
    const declineInsights = data.insights.filter(
      (insight) => insight.kind === "decline",
    );

    expect(
      declineInsights.every((insight) =>
        [
          "ga4_drop",
          "ga4_low_sample_channel_unknown",
          "gsc_drop",
          "mixed_decline",
        ].includes(insight.cause),
      ),
    ).toBe(true);
  });
});

describe("getDashboardData health and collection copy", () => {
  it("does not expose garbled text in health or collection reliability fields", () => {
    const data = getDashboardData();
    const badFields: string[] = [];

    for (const stat of data.stats) {
      for (const [field, value] of Object.entries({
        grade: stat.health.grade,
        reason: stat.health.reason,
        statusLabel: stat.statusLabel,
        statusReason: stat.statusReason,
      })) {
        if (looksGarbledText(String(value ?? ""))) {
          badFields.push(`${stat.id}:health:${field}`);
        }
      }
      for (const source of stat.collectionSources) {
        for (const [field, value] of Object.entries({
          label: source.label,
          reason: source.reason,
        })) {
          if (looksGarbledText(String(value ?? ""))) {
            badFields.push(`${stat.id}:collection:${source.key}:${field}`);
          }
        }
      }
    }

    for (const summary of data.collectionSummary) {
      if (looksGarbledText(summary.label)) {
        badFields.push(`collectionSummary:${summary.key}:label`);
      }
    }

    for (const segment of data.segments) {
      for (const [field, value] of Object.entries({
        label: segment.label,
        description: segment.description,
      })) {
        if (looksGarbledText(String(value ?? ""))) {
          badFields.push(`segment:${segment.key}:${field}`);
        }
      }
    }

    expect(badFields).toEqual([]);
  });
});

describe("getDashboardData runtime file fallback", () => {
  it("keeps showing snapshot sites when scripts/setup/sites.yaml is unavailable", () => {
    const originalCwd = process.cwd();
    const dir = mkdtempSync(join(tmpdir(), "dashboard-data-fallback-"));
    try {
      mkdirSync(join(dir, "data"), { recursive: true });
      writeFileSync(
        join(dir, "data", "site-stats.json"),
        JSON.stringify({
          generatedAt: "2026-07-06T07:19:52.125Z",
          rangeDays: 7,
          previousRangeDays: 7,
          longRangeDays: 30,
          dateRanges: {
            timezone: "Asia/Seoul",
            basis: "completed_days",
            last1Days: { startDate: "2026-07-05", endDate: "2026-07-05" },
            last7Days: { startDate: "2026-06-29", endDate: "2026-07-05" },
            previous7Days: { startDate: "2026-06-22", endDate: "2026-06-28" },
            last30Days: { startDate: "2026-06-06", endDate: "2026-07-05" },
          },
          stats: [
            {
              id: "fallback-site",
              name: "fallback-site.com",
              url: "https://fallback-site.com/",
              ga4PropertyId: "123",
              gscSiteUrl: "https://fallback-site.com/",
              last7Days: emptyMetrics(),
              previous7Days: emptyMetrics(),
              last30Days: emptyMetrics(),
              gscLast7Days: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
              gscPrevious7Days: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
              gscLast30Days: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
              ga4Status: "ok",
              gscStatus: "ok",
            },
          ],
        }),
      );

      process.chdir(dir);
      const data = getDashboardData();

      expect(data.siteCount).toBe(1);
      expect(data.stats).toHaveLength(1);
      expect(data.stats[0]?.id).toBe("fallback-site");
      expect(data.segments.find((segment) => segment.key === "growth")?.count).toBe(0);
    } finally {
      process.chdir(originalCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("loadAdsenseProofGate", () => {
  it("loads the latest matching proof gate artifact", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-gate-"));
    try {
      writeFileSync(
        join(dir, "adsense-proof-gate-2026-06-23.json"),
        JSON.stringify(
          makeProofGateArtifact({
            collectorSnapshot:
              "data/site-stats.json generatedAt=2026-06-23T13:33:24.000Z",
            verdict: "do_not_submit",
            blockers: 1,
          }),
        ),
      );
      writeFileSync(
        join(dir, "adsense-proof-gate-2026-06-24.json"),
        JSON.stringify(
          makeProofGateArtifact({
            collectorSnapshot:
              "data/site-stats.json generatedAt=2026-06-24T01:02:03.000Z",
            verdict: "ready_for_console_review",
            blockers: 0,
          }),
        ),
      );

      const gate = loadAdsenseProofGate(dir, "2026-06-24T01:02:03.000Z");

      expect(gate?.verdict).toBe("ready_for_console_review");
      expect(gate?.blockers).toHaveLength(0);
      expect(gate?.summary.endpointRetryResultCount).toBe(12);
      expect(gate?.productionMutationPerformed).toBe(false);
      expect(gate?.adsenseConsoleChecked).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores proof gate artifacts from stale stats snapshots", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-gate-stale-"));
    try {
      writeFileSync(
        join(dir, "adsense-proof-gate-2026-06-24.json"),
        JSON.stringify(
          makeProofGateArtifact({
            collectorSnapshot:
              "data/site-stats.json generatedAt=2026-06-23T13:33:24.000Z",
            verdict: "do_not_submit",
            blockers: 1,
          }),
        ),
      );

      expect(loadAdsenseProofGate(dir, "2026-06-24T01:02:03.000Z")).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores malformed proof gate artifacts", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-gate-bad-"));
    try {
      writeFileSync(
        join(dir, "adsense-proof-gate-2026-06-24.json"),
        JSON.stringify({
          generatedAt: "2026-06-24T01:00:00.000Z",
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-06-24T01:02:03.000Z",
          productionMutationPerformed: true,
          adsenseConsoleChecked: false,
          verdict: "ready_for_console_review",
          readiness: {},
          blockers: [],
          summary: {},
          stopCondition: "bad",
        }),
      );

      expect(loadAdsenseProofGate(dir, "2026-06-24T01:02:03.000Z")).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects proof gate artifacts with polluted collector snapshots", () => {
    const dir = mkdtempSync(join(tmpdir(), "adsense-proof-gate-polluted-"));
    try {
      writeFileSync(
        join(dir, "adsense-proof-gate-2026-06-24.json"),
        JSON.stringify(
          makeProofGateArtifact({
            collectorSnapshot:
              "data/site-stats.json generatedAt=2026-06-24T01:02:03.000Z stale",
            verdict: "ready_for_console_review",
            blockers: 0,
          }),
        ),
      );

      expect(loadAdsenseProofGate(dir, "2026-06-24T01:02:03.000Z")).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("loadFleetOptimizationChain", () => {
  it("loads the latest matching fleet chain artifact", () => {
    const dir = mkdtempSync(join(tmpdir(), "fleet-chain-"));
    try {
      writeFileSync(
        join(dir, "fleet-optimization-chain-2026-07-04.json"),
        JSON.stringify(makeFleetChainArtifact({ snapshot: "2026-07-04T01:00:00.000Z", sites: 3 })),
      );
      writeFileSync(
        join(dir, "fleet-optimization-chain-2026-07-05.json"),
        JSON.stringify(makeFleetChainArtifact({ snapshot: "2026-07-05T01:00:00.000Z", sites: 13 })),
      );

      const chain = loadFleetOptimizationChain(dir, "2026-07-05T01:00:00.000Z");

      expect(chain?.artifactPath).toBe(`${dir}/fleet-optimization-chain-2026-07-05.json`);
      expect(chain?.workOrderPath).toBe("docs/work-orders/fleet-optimization-chain-2026-07-05.md");
      expect(chain?.handoffSiteCount).toBe(13);
      expect(chain?.planMatchesStats).toBe(true);
      expect(chain?.handoffMatchesStats).toBe(true);
      expect(chain?.refreshFailureCount).toBe(0);
      expect(chain?.refreshFailuresBlockReadiness).toBe(false);
      expect(chain?.readinessBlockingRefreshFailedSources).toEqual([]);
      expect(chain?.maintenanceRefreshFailedSources).toEqual([]);
      expect(chain?.handoffMutationFlagsFalse).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects mutating fleet chain artifacts", () => {
    const dir = mkdtempSync(join(tmpdir(), "fleet-chain-mutating-"));
    try {
      writeFileSync(
        join(dir, "fleet-optimization-chain-2026-07-05.json"),
        JSON.stringify({
          ...makeFleetChainArtifact({ snapshot: "2026-07-05T01:00:00.000Z", sites: 13 }),
          productionMutationPerformed: true,
        }),
      );

      const chain = loadFleetOptimizationChain(dir, "2026-07-05T01:00:00.000Z");

      expect(chain).toBeNull();
      expect(loadFleetOptimizationChainStatus(dir, "2026-07-05T01:00:00.000Z", chain)).toMatchObject({
        state: "invalid",
        artifactPath: `${dir}/fleet-optimization-chain-2026-07-05.json`,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("separates telemetry maintenance from readiness-blocking refresh failures", () => {
    const dir = mkdtempSync(join(tmpdir(), "fleet-chain-sources-"));
    try {
      writeFileSync(
        join(dir, "fleet-optimization-chain-2026-07-05.json"),
        JSON.stringify(
          makeFleetChainArtifact({
            snapshot: "2026-07-05T01:00:00.000Z",
            sites: 13,
            refreshFailedSources: [
              "skipped_refresh_failed:ga4:missing_config:1",
              "skipped_refresh_failed:adsense_collector:transient_error:1",
              "skipped_refresh_failed:ads_txt_collector:transient_error:1",
              "skipped_refresh_failed:gsc:auth_error:1",
            ],
            refreshFailuresBlockReadiness: true,
          }),
        ),
      );

      const chain = loadFleetOptimizationChain(dir, "2026-07-05T01:00:00.000Z");

      expect(chain?.maintenanceRefreshFailedSources).toEqual([
        "skipped_refresh_failed:ga4:missing_config:1",
        "skipped_refresh_failed:adsense_collector:transient_error:1",
        "skipped_refresh_failed:ads_txt_collector:transient_error:1",
      ]);
      expect(chain?.readinessBlockingRefreshFailedSources).toEqual([
        "skipped_refresh_failed:gsc:auth_error:1",
      ]);
      expect(chain?.refreshFailuresBlockReadiness).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not turn legacy AdSense API errors into blockers when the paired collector error is transient", () => {
    const dir = mkdtempSync(join(tmpdir(), "fleet-chain-legacy-adsense-"));
    try {
      writeFileSync(
        join(dir, "fleet-optimization-chain-2026-07-05.json"),
        JSON.stringify(
          makeFleetChainArtifact({
            snapshot: "2026-07-05T01:00:00.000Z",
            sites: 13,
            refreshFailedSources: [
              "skipped_refresh_failed:adsense:api_error:1",
              "skipped_refresh_failed:adsense_collector:transient_error:1",
              "skipped_refresh_failed:ads_txt:api_error:1",
              "skipped_refresh_failed:ads_txt_collector:transient_error:1",
            ],
            refreshFailuresBlockReadiness: false,
          }),
        ),
      );

      const chain = loadFleetOptimizationChain(dir, "2026-07-05T01:00:00.000Z");

      expect(chain?.readinessBlockingRefreshFailedSources).toEqual([]);
      expect(chain?.maintenanceRefreshFailedSources).toEqual([
        "skipped_refresh_failed:adsense_collector:transient_error:1",
        "skipped_refresh_failed:ads_txt_collector:transient_error:1",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores stale or malformed fleet chain artifacts", () => {
    const dir = mkdtempSync(join(tmpdir(), "fleet-chain-stale-"));
    try {
      writeFileSync(
        join(dir, "fleet-optimization-chain-2026-07-05.json"),
        JSON.stringify(makeFleetChainArtifact({ snapshot: "2026-07-04T01:00:00.000Z", sites: 13 })),
      );

      expect(loadFleetOptimizationChain(dir, "2026-07-05T01:00:00.000Z")).toBeNull();

      writeFileSync(
        join(dir, "fleet-optimization-chain-2026-07-06.json"),
        JSON.stringify({ generatedAt: "2026-07-06T01:00:00.000Z", verification: {} }),
      );

      expect(loadFleetOptimizationChain(dir, "2026-07-06T01:00:00.000Z")).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails closed instead of falling back when the newest fleet chain is invalid", () => {
    const dir = mkdtempSync(join(tmpdir(), "fleet-chain-shadow-"));
    try {
      writeFileSync(
        join(dir, "fleet-optimization-chain-2026-07-05.json"),
        JSON.stringify(makeFleetChainArtifact({ snapshot: "2026-07-05T01:00:00.000Z", sites: 13 })),
      );
      writeFileSync(
        join(dir, "fleet-optimization-chain-2026-07-06.json"),
        JSON.stringify({ generatedAt: "2026-07-06T01:00:00.000Z", verification: {} }),
      );

      const chain = loadFleetOptimizationChain(dir, "2026-07-05T01:00:00.000Z");

      expect(chain).toBeNull();
      expect(loadFleetOptimizationChainStatus(dir, "2026-07-05T01:00:00.000Z", chain)).toMatchObject({
        state: "invalid",
        artifactPath: `${dir}/fleet-optimization-chain-2026-07-06.json`,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("loadFleetOptimizationChainStatus", () => {
  it("reports current when a strict matching chain is loaded", () => {
    const dir = mkdtempSync(join(tmpdir(), "fleet-chain-status-current-"));
    try {
      writeFileSync(
        join(dir, "fleet-optimization-chain-2026-07-05.json"),
        JSON.stringify(makeFleetChainArtifact({ snapshot: "2026-07-05T01:00:00.000Z", sites: 13 })),
      );

      const chain = loadFleetOptimizationChain(dir, "2026-07-05T01:00:00.000Z");
      const status = loadFleetOptimizationChainStatus(
        dir,
        "2026-07-05T01:00:00.000Z",
        chain,
      );

      expect(status).toMatchObject({
        state: "current",
        expectedStatsGeneratedAt: "2026-07-05T01:00:00.000Z",
        statsSnapshot: "2026-07-05T01:00:00.000Z",
      });
      expect(status.artifactPath).toBe(`${dir}/fleet-optimization-chain-2026-07-05.json`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports snapshot mismatch when the newest chain targets an older snapshot", () => {
    const dir = mkdtempSync(join(tmpdir(), "fleet-chain-status-stale-"));
    try {
      writeFileSync(
        join(dir, "fleet-optimization-chain-2026-07-05.json"),
        JSON.stringify(makeFleetChainArtifact({ snapshot: "2026-07-04T01:00:00.000Z", sites: 13 })),
      );

      const status = loadFleetOptimizationChainStatus(
        dir,
        "2026-07-05T01:00:00.000Z",
        null,
      );

      expect(status).toMatchObject({
        state: "snapshot_mismatch",
        expectedStatsGeneratedAt: "2026-07-05T01:00:00.000Z",
        statsSnapshot: "2026-07-04T01:00:00.000Z",
        artifactPath: `${dir}/fleet-optimization-chain-2026-07-05.json`,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports missing or invalid chain status distinctly", () => {
    const dir = mkdtempSync(join(tmpdir(), "fleet-chain-status-invalid-"));
    try {
      expect(loadFleetOptimizationChainStatus(dir, "2026-07-05T01:00:00.000Z")).toMatchObject({
        state: "missing",
      });

      writeFileSync(
        join(dir, "fleet-optimization-chain-2026-07-05.json"),
        JSON.stringify({ generatedAt: "2026-07-05T01:00:00.000Z", verification: {} }),
      );

      expect(loadFleetOptimizationChainStatus(dir, "2026-07-05T01:00:00.000Z")).toMatchObject({
        state: "invalid",
        artifactPath: `${dir}/fleet-optimization-chain-2026-07-05.json`,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("loadDashboardPostRecoveryChain", () => {
  it("loads only the current post-recovery chain artifact", () => {
    const dir = mkdtempSync(join(tmpdir(), "dashboard-post-recovery-"));
    try {
      writeFileSync(
        join(dir, "dashboard-post-recovery-chain-2026-07-05.json"),
        JSON.stringify(
          makeDashboardPostRecoveryChainArtifact({
            snapshot: "2026-07-05T01:00:00.000Z",
          }),
        ),
      );

      expect(loadDashboardPostRecoveryChain(dir, "2026-07-05T01:00:00.000Z")).toMatchObject({
        artifactPath: `${dir}/dashboard-post-recovery-chain-2026-07-05.json`,
        workOrderPath: "docs/work-orders/dashboard-post-recovery-chain-2026-07-05.md",
        statsSnapshot: "2026-07-05T01:00:00.000Z",
        readiness: "ready_to_act",
        artifactIntegrityStatus: "pass",
        commands: 3,
        pass: 3,
        fail: 0,
        skipped: 0,
        postRecoveryAcceptanceSatisfied: true,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails closed for stale, malformed, or mutating post-recovery artifacts", () => {
    const dir = mkdtempSync(join(tmpdir(), "dashboard-post-recovery-stale-"));
    try {
      writeFileSync(
        join(dir, "dashboard-post-recovery-chain-2026-07-05.json"),
        JSON.stringify(
          makeDashboardPostRecoveryChainArtifact({
            snapshot: "2026-07-04T01:00:00.000Z",
          }),
        ),
      );
      expect(loadDashboardPostRecoveryChain(dir, "2026-07-05T01:00:00.000Z")).toBeNull();

      writeFileSync(
        join(dir, "dashboard-post-recovery-chain-2026-07-06.json"),
        JSON.stringify({ generatedAt: "2026-07-06T01:00:00.000Z" }),
      );
      expect(loadDashboardPostRecoveryChain(dir, "2026-07-05T01:00:00.000Z")).toBeNull();

      writeFileSync(
        join(dir, "dashboard-post-recovery-chain-2026-07-07.json"),
        JSON.stringify({
          ...makeDashboardPostRecoveryChainArtifact({
            snapshot: "2026-07-05T01:00:00.000Z",
          }),
          titleOrBodyMutationPerformed: true,
        }),
      );
      expect(loadDashboardPostRecoveryChain(dir, "2026-07-05T01:00:00.000Z")).toBeNull();

      writeFileSync(
        join(dir, "dashboard-post-recovery-chain-2026-07-08.json"),
        JSON.stringify({
          ...makeDashboardPostRecoveryChainArtifact({
            snapshot: "2026-07-05T01:00:00.000Z",
          }),
          dashboardVerification: {
            ...makeDashboardPostRecoveryChainArtifact({
              snapshot: "2026-07-05T01:00:00.000Z",
            }).dashboardVerification,
            postRecoveryAcceptance: ["external_gsc_access_restored=satisfied"],
          },
        }),
      );
      expect(loadDashboardPostRecoveryChain(dir, "2026-07-05T01:00:00.000Z")).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("loadGscPermissionAudit", () => {
  it("loads the latest matching non-mutating GSC permission audit artifact", () => {
    const dir = mkdtempSync(join(tmpdir(), "gsc-permission-audit-"));
    try {
      writeFileSync(
        join(dir, "gsc-permission-audit-2026-07-04.json"),
        JSON.stringify(makeGscPermissionAuditArtifact({ snapshot: "2026-07-04T01:00:00.000Z" })),
      );
      writeFileSync(
        join(dir, "gsc-permission-audit-2026-07-05.json"),
        JSON.stringify(makeGscPermissionAuditArtifact({ snapshot: "2026-07-05T01:00:00.000Z" })),
      );

      const audit = loadGscPermissionAudit(dir, "2026-07-05T01:00:00.000Z");

      expect(audit?.artifactPath).toBe(`${dir}/gsc-permission-audit-2026-07-05.json`);
      expect(audit?.workOrderPath).toBe("docs/work-orders/gsc-permission-audit-2026-07-05.md");
    expect(audit?.productionMutationPerformed).toBe(false);
    expect(audit?.gscMutationPerformed).toBe(false);
    expect(audit?.handoffStatus).toBe("pending_external");
    expect(audit?.auditedRows).toBe(1);
      expect(audit?.unverified).toBe(1);
      expect(audit?.results[0]).toMatchObject({
        host: "yesa.kr",
        permissionLevel: "siteUnverifiedUser",
        accessState: "unverified",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores stale, malformed, or mutating GSC permission audit artifacts", () => {
    const dir = mkdtempSync(join(tmpdir(), "gsc-permission-audit-stale-"));
    try {
      writeFileSync(
        join(dir, "gsc-permission-audit-2026-07-05.json"),
        JSON.stringify(makeGscPermissionAuditArtifact({ snapshot: "2026-07-04T01:00:00.000Z" })),
      );

      expect(loadGscPermissionAudit(dir, "2026-07-05T01:00:00.000Z")).toBeNull();

      writeFileSync(
        join(dir, "gsc-permission-audit-2026-07-06.json"),
        JSON.stringify({
          ...makeGscPermissionAuditArtifact({ snapshot: "2026-07-06T01:00:00.000Z" }),
          gscMutationPerformed: true,
        }),
      );

      expect(loadGscPermissionAudit(dir, "2026-07-06T01:00:00.000Z")).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects GSC permission audits with polluted collector snapshots", () => {
    const dir = mkdtempSync(join(tmpdir(), "gsc-permission-audit-polluted-"));
    try {
      writeFileSync(
        join(dir, "gsc-permission-audit-2026-07-05.json"),
        JSON.stringify({
          ...makeGscPermissionAuditArtifact({ snapshot: "2026-07-05T01:00:00.000Z" }),
          collectorSnapshot:
            "data/site-stats.json generatedAt=2026-07-05T01:00:00.000Z stale",
        }),
      );

      expect(loadGscPermissionAudit(dir, "2026-07-05T01:00:00.000Z")).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects GSC permission audits with missing or inconsistent handoff status", () => {
    const dir = mkdtempSync(join(tmpdir(), "gsc-permission-audit-status-"));
    try {
      const base = makeGscPermissionAuditArtifact({ snapshot: "2026-07-05T01:00:00.000Z" });
      writeFileSync(
        join(dir, "gsc-permission-audit-2026-07-05.json"),
        JSON.stringify({
          ...base,
          handoffStatus: undefined,
        }),
      );

      expect(loadGscPermissionAudit(dir, "2026-07-05T01:00:00.000Z")).toBeNull();

      writeFileSync(
        join(dir, "gsc-permission-audit-2026-07-06.json"),
        JSON.stringify({
          ...base,
          handoffStatus: "resolved",
        }),
      );

      expect(loadGscPermissionAudit(dir, "2026-07-05T01:00:00.000Z")).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails closed instead of falling back when the newest GSC audit is mutating", () => {
    const dir = mkdtempSync(join(tmpdir(), "gsc-permission-audit-shadow-"));
    try {
      writeFileSync(
        join(dir, "gsc-permission-audit-2026-07-05.json"),
        JSON.stringify(makeGscPermissionAuditArtifact({ snapshot: "2026-07-05T01:00:00.000Z" })),
      );
      writeFileSync(
        join(dir, "gsc-permission-audit-2026-07-06.json"),
        JSON.stringify({
          ...makeGscPermissionAuditArtifact({ snapshot: "2026-07-05T01:00:00.000Z" }),
          gscMutationPerformed: true,
        }),
      );

      const audit = loadGscPermissionAudit(dir, "2026-07-05T01:00:00.000Z");

      expect(audit).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("loadT3TitleContentHandoff", () => {
  it("loads the latest matching non-mutating T3 handoff artifact", () => {
    const dir = mkdtempSync(join(tmpdir(), "t3-handoff-"));
    try {
      writeFileSync(
        join(dir, "t3-title-content-handoff-2026-07-04.json"),
        JSON.stringify(makeT3HandoffArtifact({ snapshot: "2026-07-04T01:00:00.000Z", sites: 3 })),
      );
      writeFileSync(
        join(dir, "t3-title-content-handoff-2026-07-05.json"),
        JSON.stringify(makeT3HandoffArtifact({ snapshot: "2026-07-05T01:00:00.000Z", sites: 13 })),
      );

      const handoff = loadT3TitleContentHandoff(dir, "2026-07-05T01:00:00.000Z");

      expect(handoff?.artifactPath).toBe(`${dir}/t3-title-content-handoff-2026-07-05.json`);
      expect(handoff?.workOrderPath).toBe("docs/work-orders/t3-title-content-handoff-2026-07-05.md");
      expect(handoff?.siteCount).toBe(13);
      expect(handoff?.titleHandoffCount).toBe(10);
      expect(handoff?.contentHandoffCount).toBe(8);
      expect(handoff?.refreshFailedSources).toEqual([]);
      expect(handoff?.sites).toHaveLength(6);
      expect(handoff?.hiddenSiteCount).toBe(7);
      expect(handoff?.sites[0]).toMatchObject({
        host: "site-1.example",
        actions: ["title_handoff"],
        topQuery: "query 1",
        recommendedNextAction: "Title workflow only; do not directly edit live titles from this handoff.",
        sitemapWarnings: 0,
        adsenseStatus: "approved",
      });
      expect(handoff?.titleOrBodyMutationPerformed).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores stale, malformed, or mutating T3 handoff artifacts", () => {
    const dir = mkdtempSync(join(tmpdir(), "t3-handoff-stale-"));
    try {
      writeFileSync(
        join(dir, "t3-title-content-handoff-2026-07-05.json"),
        JSON.stringify(makeT3HandoffArtifact({ snapshot: "2026-07-04T01:00:00.000Z", sites: 13 })),
      );

      expect(loadT3TitleContentHandoff(dir, "2026-07-05T01:00:00.000Z")).toBeNull();

      writeFileSync(
        join(dir, "t3-title-content-handoff-2026-07-06.json"),
        JSON.stringify({
          ...makeT3HandoffArtifact({ snapshot: "2026-07-06T01:00:00.000Z", sites: 13 }),
          mutationStatus: {
            cmsMutationPerformed: true,
          },
        }),
      );

      expect(loadT3TitleContentHandoff(dir, "2026-07-06T01:00:00.000Z")).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails closed instead of falling back when the newest T3 handoff is stale", () => {
    const dir = mkdtempSync(join(tmpdir(), "t3-handoff-shadow-"));
    try {
      writeFileSync(
        join(dir, "t3-title-content-handoff-2026-07-05.json"),
        JSON.stringify(makeT3HandoffArtifact({ snapshot: "2026-07-05T01:00:00.000Z", sites: 13 })),
      );
      writeFileSync(
        join(dir, "t3-title-content-handoff-2026-07-06.json"),
        JSON.stringify(makeT3HandoffArtifact({ snapshot: "2026-07-06T01:00:00.000Z", sites: 2 })),
      );

      const handoff = loadT3TitleContentHandoff(dir, "2026-07-05T01:00:00.000Z");

      expect(handoff).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

function emptyMetrics(): MetricSet {
  return { activeUsers: 0, sessions: 0, screenPageViews: 0, eventCount: 0 };
}

function makeSite(overrides: Partial<Site> = {}): Site {
  return {
    id: "site",
    name: "site",
    enabled: true,
    platform: "nextjs",
    url: "https://site.example/",
    ...overrides,
  };
}

function makeRemediationQueueArtifact({
  collectorSnapshot,
  siteId,
  problemRows,
}: {
  collectorSnapshot: string;
  siteId: string;
  problemRows: number;
}) {
  return {
    generatedAt: "2026-06-24T01:00:00.000Z",
    collectorSnapshot,
    scope: "test",
    productionMutationPerformed: false,
    adsenseConsoleChecked: false,
    approvedExactDomainsExcluded: [],
    nonMonetizedExactDomainsExcluded: [],
    summary: {
      totalRows: 87,
      reviewedRows: 73,
      adsenseOkRows: 63,
      problemRows,
      ordinaryAdsenseProof: 1,
      approvedRootSubdomainScope: 0,
      gscAuthTelemetry: 0,
      ga4ConfigTelemetry: 0,
    },
    lanes: {
      ordinary_adsense_proof: [
        {
          siteId,
          host: `${siteId}.example`,
          name: siteId,
          lane: "ordinary_adsense_proof",
          priority: 1,
          statuses: {
            adsenseStatus: "api_error",
            adsenseCollectorStatus: "transient_error",
            adsTxtStatus: "api_error",
            adsTxtCollectorStatus: "transient_error",
            gscStatus: "ok",
            ga4Status: "ok",
          },
          requiredEvidence: ["fresh ads.txt proof"],
          stopCondition: "do not submit yet",
          notes: ["test"],
        },
      ],
      approved_root_subdomain_scope: [],
      gsc_auth_telemetry: [],
      ga4_config_telemetry: [],
    },
  };
}

function makeProofGateArtifact({
  collectorSnapshot,
  verdict,
  blockers,
}: {
  collectorSnapshot: string;
  verdict: string;
  blockers: number;
}) {
  return {
    generatedAt: "2026-06-24T01:00:00.000Z",
    collectorSnapshot,
    scope: "test",
    productionMutationPerformed: false,
    adsenseConsoleChecked: false,
    verdict,
    readiness: {
      technicalReadiness: blockers > 0 ? "proof_blocked" : "technical_ready",
      consoleReadiness: "console_unknown",
      scopeReadiness: "scope_review_required",
      telemetryReadiness: "telemetry_repair_required",
    },
    blockers:
      blockers > 0
        ? [
            {
              code: "endpoint_proof_missing",
              severity: "blocking",
              count: blockers,
              siteIds: ["richyou"],
              requiredAction: "Collect endpoint proof.",
            },
          ]
        : [],
    summary: {
      ordinaryAdsenseProof: 6,
      approvedRootSubdomainScope: 4,
      gscAuthTelemetry: 2,
      ga4ConfigTelemetry: 0,
      endpointRetryResultCount: 12,
      freshAdsTxtProofPass: 0,
      freshRobotsProofPass: 0,
      hostingLoaderResultCount: 0,
      freshHostingLoaderProofPass: 0,
    },
    stopCondition: "Do not submit yet.",
  };
}

function makeFleetChainArtifact({
  snapshot,
  sites,
  refreshFailedSources = [],
  refreshFailuresBlockReadiness = false,
}: {
  snapshot: string;
  sites: number;
  refreshFailedSources?: string[];
  refreshFailuresBlockReadiness?: boolean;
}) {
  return {
    generatedAt: "2026-07-05T01:05:00.000Z",
    date: "2026-07-05",
    productionMutationPerformed: false,
    cmsMutationPerformed: false,
    searchConsoleMutationPerformed: false,
    adsenseMutationPerformed: false,
    titleOrBodyMutationPerformed: false,
    summary: {
      commands: 5,
      pass: 5,
      fail: 0,
      skipped: 0,
    },
      verification: {
        statsSnapshot: snapshot,
        planSnapshot: snapshot,
        handoffSnapshot: snapshot,
        refreshFailedSources,
        refreshFailureCount: refreshFailedSources.length,
        refreshFailuresBlockReadiness,
        planMatchesStats: true,
      handoffMatchesStats: true,
      handoffMutationFlagsFalse: true,
      handoffSiteCount: sites,
      titleHandoffCount: 10,
      contentHandoffCount: 8,
    },
  };
}

function makeDashboardPostRecoveryChainArtifact({ snapshot }: { snapshot: string }) {
  return {
    generatedAt: "2026-07-05T01:10:00.000Z",
    date: "2026-07-05",
    dryRun: false,
    productionMutationPerformed: false,
    cmsMutationPerformed: false,
    searchConsoleMutationPerformed: false,
    adsenseMutationPerformed: false,
    titleOrBodyMutationPerformed: false,
    commands: [
      { id: "gsc-permission-audit", args: ["gsc:permissions:audit"] },
      { id: "dashboard-verify", args: ["dashboard:verify"] },
      {
        id: "dashboard-acceptance",
        args: ["dashboard:acceptance", "data/dashboard-verification-2026-07-05.json"],
      },
    ],
    dashboardVerification: {
      path: "data/dashboard-verification-2026-07-05.json",
      exists: true,
      statsSnapshot: snapshot,
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
    },
    results: [
      { id: "gsc-permission-audit", status: "pass", exitCode: 0, stdoutTail: "", stderrTail: "" },
      { id: "dashboard-verify", status: "pass", exitCode: 0, stdoutTail: "", stderrTail: "" },
      { id: "dashboard-acceptance", status: "pass", exitCode: 0, stdoutTail: "", stderrTail: "" },
    ],
    artifactIntegrity: {
      id: "dashboard-artifact-integrity",
      status: "pass",
      exitCode: 0,
      stdoutTail: "",
      stderrTail: "",
    },
    summary: {
      commands: 3,
      pass: 3,
      fail: 0,
      skipped: 0,
    },
    readiness: "ready_to_act",
    stopCondition: "Dashboard recommendations are executable only when readiness is ready_to_act.",
  };
}

function makeGscPermissionAuditArtifact({ snapshot }: { snapshot: string }) {
  return {
    generatedAt: "2026-07-05T01:05:00.000Z",
    collectorSnapshot: `data/site-stats.json generatedAt=${snapshot}`,
    handoffStatus: "pending_external",
    productionMutationPerformed: false,
    gscMutationPerformed: false,
    serviceAccountEmail: "dashboard@example.iam.gserviceaccount.com",
    summary: {
      auditedRows: 1,
      ownerAccess: 0,
      restrictedAccess: 0,
      unverified: 1,
      notListed: 0,
    },
    results: [
      {
        siteId: "yesa",
        host: "yesa.kr",
        configuredGscSiteUrl: "https://yesa.kr/",
        gscStatus: "auth_error",
        listedSiteUrl: "https://yesa.kr/",
        permissionLevel: "siteUnverifiedUser",
        accessState: "unverified",
        requiredAction:
          "Verify the Search Console property or grant owner-level access to the dashboard service account, then re-run stats collection.",
      },
    ],
  };
}

function makeGscPermissionAuditSummary(snapshot: string) {
  const artifact = makeGscPermissionAuditArtifact({ snapshot });
  return {
    artifactPath: "data/gsc-permission-audit-2026-07-05.json",
    workOrderPath: "docs/work-orders/gsc-permission-audit-2026-07-05.md",
    generatedAt: artifact.generatedAt,
    collectorSnapshot: artifact.collectorSnapshot,
    handoffStatus: artifact.handoffStatus,
    productionMutationPerformed: artifact.productionMutationPerformed,
    gscMutationPerformed: artifact.gscMutationPerformed,
    serviceAccountEmail: artifact.serviceAccountEmail,
    auditedRows: artifact.summary.auditedRows,
    ownerAccess: artifact.summary.ownerAccess,
    restrictedAccess: artifact.summary.restrictedAccess,
    unverified: artifact.summary.unverified,
    notListed: artifact.summary.notListed,
    results: artifact.results,
  };
}

function makeT3HandoffArtifact({
  snapshot,
  sites,
}: {
  snapshot: string;
  sites: number;
}) {
  return {
    generatedAt: "2026-07-05T01:05:00.000Z",
    mutationStatus: {
      cmsMutationPerformed: false,
      productionDeploymentPerformed: false,
      searchConsoleMutationPerformed: false,
      adsenseMutationPerformed: false,
      titleOrBodyMutationPerformed: false,
    },
    dashboardEvidence: {
      snapshotTimestamp: snapshot,
      refreshFailedSources: [],
      statsPath: "data/site-stats.json",
      planPath: "data/fleet-optimization-plan-2026-07-05.json",
    },
    summary: {
      siteCount: sites,
      titleHandoffCount: 10,
      contentHandoffCount: 8,
    },
    sites: Array.from({ length: sites }, (_, index) => ({
      host: `site-${index + 1}.example`,
      url: `https://site-${index + 1}.example/`,
      localPath: `D:\\web\\site-${index + 1}`,
      actions: index % 2 === 0 ? ["title_handoff"] : ["content_handoff"],
      planRanks: [index + 1],
      metrics: {
        gscImpressions30d: 100 + index,
        gscClicks30d: 10 + index,
        gscCtr30d: 0.01,
        gscPosition30d: 8 + index,
      },
      topQueries: [{ query: `query ${index + 1}` }],
      technicalStatus: {
        sitemapWarnings: index,
        sitemapErrors: 0,
        adsenseStatus: "approved",
        adsTxtStatus: "ok",
      },
      recommendedNextAction: "Title workflow only; do not directly edit live titles from this handoff.",
    })),
  };
}

function makeRemediationQueueItem({
  siteId,
  host,
  lane,
  requiredEvidence = ["fresh queue evidence"],
  stopCondition = "do not submit yet",
}: {
  siteId: string;
  host: string;
  lane:
    | "ordinary_adsense_proof"
    | "approved_root_subdomain_scope"
    | "gsc_auth_telemetry"
    | "ga4_config_telemetry";
  requiredEvidence?: string[];
  stopCondition?: string;
}) {
  return {
    siteId,
    host,
    name: siteId,
    lane,
    priority: 1,
    requiredEvidence,
    stopCondition,
    notes: ["test"],
  };
}

function emptyGsc(): GscMetricSet {
  return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
}

function makeEnriched(overrides: Partial<EnrichedSiteStat>): EnrichedSiteStat {
  const trend: SiteTrend = {
    activeUsersChange: 0,
    sessionsChange: 0,
    gscClicksChange: 0,
  };
  return {
    id: "x",
    name: "x",
    url: "https://x.example",
    ga4PropertyId: "1",
    last1Days: emptyMetrics(),
    last7Days: emptyMetrics(),
    previous7Days: emptyMetrics(),
    last30Days: emptyMetrics(),
    gscPrevious7Days: emptyGsc(),
    gscLast30Days: emptyGsc(),
    trend,
    operationalStatus: "normal",
    statusLabel: "정상",
    statusReason: "",
    isStale: false,
    health: { score: 100, grade: "좋음", reason: "" },
    collectionSources: [],
    sparkline: [],
    ...overrides,
  };
}
