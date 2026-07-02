import { describe, it, expect } from "vitest";
import {
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
  buildActionItems,
  loadAdsenseExternalProof,
  loadAdsenseProofGate,
  loadAdsenseRemediationQueue,
  type EnrichedSiteStat,
  type GscMetricSet,
  type MetricSet,
  type Site,
  type SiteStat,
  type SiteTrend,
} from "./dashboard-data";

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
