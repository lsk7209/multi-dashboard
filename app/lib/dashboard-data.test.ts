import { describe, it, expect } from "vitest";
import {
  isSignificantUserDrop,
  isSignificantClickDrop,
  getOperationalStatus,
  changeRate,
  sumGscMetrics,
  buildSegments,
  type EnrichedSiteStat,
  type GscMetricSet,
  type MetricSet,
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

function emptyMetrics(): MetricSet {
  return { activeUsers: 0, sessions: 0, screenPageViews: 0, eventCount: 0 };
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
