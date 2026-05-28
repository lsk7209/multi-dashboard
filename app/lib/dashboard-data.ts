import { existsSync, readFileSync } from "node:fs";
import YAML from "yaml";

export interface Site {
  id: string;
  name?: string;
  enabled?: boolean;
  platform?: string;
  url: string;
  wpRestBase?: string;
  ga4PropertyId?: string;
  gscSiteUrl?: string;
}

interface SitesFile {
  sites?: Site[];
}

export interface MetricSet {
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  eventCount: number;
}

export interface GscMetricSet {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SiteStat {
  id: string;
  name: string;
  url: string;
  ga4PropertyId: string;
  gscSiteUrl?: string;
  last1Days?: MetricSet;
  last7Days: MetricSet;
  previous7Days?: MetricSet;
  last28Days?: MetricSet;
  last30Days?: MetricSet;
  gscLast7Days?: GscMetricSet;
  gscPrevious7Days?: GscMetricSet;
  gscLast28Days?: GscMetricSet;
  gscLast30Days?: GscMetricSet;
  error?: string;
  gscError?: string;
}

interface StatsSnapshot {
  generatedAt: string | null;
  rangeDays: number;
  previousRangeDays: number;
  longRangeDays?: number;
  stats: SiteStat[];
}

export type InsightKind =
  | "growth"
  | "decline"
  | "seoOpportunity"
  | "rankingOpportunity"
  | "trafficMismatch"
  | "indexingOrPermissionIssue"
  | "duplicateProperty";

export type InsightSeverity = "high" | "medium" | "low";

export interface SiteInsight {
  id: string;
  siteId: string;
  siteName: string;
  url: string;
  kind: InsightKind;
  severity: InsightSeverity;
  reason: string;
  recommendedAction: string;
  primaryValue: string;
}

export interface SiteTrend {
  activeUsersChange: number | null;
  sessionsChange: number | null;
  gscClicksChange: number | null;
}

export interface EnrichedSiteStat
  extends Omit<SiteStat, "last1Days" | "previous7Days" | "last30Days" | "gscPrevious7Days" | "gscLast30Days"> {
  last1Days: MetricSet;
  previous7Days: MetricSet;
  last30Days: MetricSet;
  gscPrevious7Days: GscMetricSet;
  gscLast30Days: GscMetricSet;
  trend: SiteTrend;
}

export interface DashboardData {
  generatedAt: string | null;
  sites: Site[];
  stats: EnrichedSiteStat[];
  insights: SiteInsight[];
  priorityInsights: SiteInsight[];
  seoInsights: SiteInsight[];
  growthInsights: SiteInsight[];
  declineInsights: SiteInsight[];
  siteCount: number;
  trackedCount: number;
  failedCount: number;
  totalLast1Days: MetricSet;
  totalLast7Days: MetricSet;
  totalPrevious7Days: MetricSet;
  totalLast30Days: MetricSet;
  totalGscLast7Days: GscMetricSet;
  totalGscPrevious7Days: GscMetricSet;
  totalGscLast30Days: GscMetricSet;
  totalActiveUsersChange: number | null;
}

export function getDashboardData(): DashboardData {
  const sites = readSites("scripts/setup/sites.yaml").filter((site) => site.enabled !== false);
  const snapshot = readStats("data/site-stats.json");
  const statsById = new Map(snapshot.stats.map((stat) => [stat.id, stat]));
  const stats = sites.map((site) => enrichSiteStat(statsById.get(site.id) ?? emptySiteStat(site)));
  const insights = buildInsights(stats);
  const totalLast1Days = sumMetrics(stats.map((stat) => stat.last1Days));
  const totalLast7Days = sumMetrics(stats.map((stat) => stat.last7Days));
  const totalPrevious7Days = sumMetrics(stats.map((stat) => stat.previous7Days));

  return {
    generatedAt: snapshot.generatedAt,
    sites,
    stats,
    insights,
    priorityInsights: insights.filter((insight) => insight.severity === "high").slice(0, 10),
    seoInsights: insights.filter((insight) => insight.kind === "seoOpportunity" || insight.kind === "rankingOpportunity").slice(0, 10),
    growthInsights: insights.filter((insight) => insight.kind === "growth").slice(0, 8),
    declineInsights: insights.filter((insight) => insight.kind === "decline").slice(0, 8),
    siteCount: sites.length,
    trackedCount: stats.filter((stat) => !stat.error && stat.ga4PropertyId).length,
    failedCount: stats.filter((stat) => stat.error || stat.gscError).length,
    totalLast1Days,
    totalLast7Days,
    totalPrevious7Days,
    totalLast30Days: sumMetrics(stats.map((stat) => stat.last30Days)),
    totalGscLast7Days: sumGscMetrics(stats.map((stat) => stat.gscLast7Days ?? emptyGscMetrics())),
    totalGscPrevious7Days: sumGscMetrics(stats.map((stat) => stat.gscPrevious7Days)),
    totalGscLast30Days: sumGscMetrics(stats.map((stat) => stat.gscLast30Days)),
    totalActiveUsersChange: changeRate(totalLast7Days.activeUsers, totalPrevious7Days.activeUsers),
  };
}

function enrichSiteStat(stat: SiteStat): EnrichedSiteStat {
  const last1Days = stat.last1Days ?? emptyMetrics();
  const previous7Days = stat.previous7Days ?? emptyMetrics();
  const last30Days = stat.last30Days ?? stat.last28Days ?? emptyMetrics();
  const gscPrevious7Days = stat.gscPrevious7Days ?? emptyGscMetrics();
  const gscLast7Days = stat.gscLast7Days ?? emptyGscMetrics();
  const gscLast30Days = stat.gscLast30Days ?? stat.gscLast28Days ?? emptyGscMetrics();

  return {
    ...stat,
    last1Days,
    previous7Days,
    last30Days,
    gscPrevious7Days,
    gscLast30Days,
    trend: {
      activeUsersChange: changeRate(stat.last7Days.activeUsers, previous7Days.activeUsers),
      sessionsChange: changeRate(stat.last7Days.sessions, previous7Days.sessions),
      gscClicksChange: changeRate(gscLast7Days.clicks, gscPrevious7Days.clicks),
    },
  };
}

function buildInsights(stats: EnrichedSiteStat[]): SiteInsight[] {
  const insights: SiteInsight[] = [];
  const urlCounts = countBy(stats.map((stat) => normalizeUrl(stat.url)));

  for (const stat of stats) {
    const gsc = stat.gscLast7Days ?? emptyGscMetrics();
    const activeUsersChange = stat.trend.activeUsersChange;
    const gscClicksChange = stat.trend.gscClicksChange;

    if (stat.gscError || (gsc.clicks === 0 && gsc.impressions === 0 && stat.last7Days.activeUsers >= 50)) {
      insights.push(
        makeInsight(
          stat,
          "indexingOrPermissionIssue",
          "high",
          "GSC 데이터가 없거나 권한 오류가 있습니다.",
          "Search Console 소유권과 서비스 계정 권한을 확인하세요.",
          "GSC 0",
        ),
      );
    }

    if (activeUsersChange !== null && activeUsersChange <= -0.3 && stat.previous7Days.activeUsers >= 10) {
      insights.push(
        makeInsight(
          stat,
          "decline",
          "high",
          `GA4 사용자가 직전 7일 대비 ${formatSignedPercent(activeUsersChange)} 변했습니다.`,
          "최근 발행, 색인, 유입 채널 변화를 먼저 확인하세요.",
          formatSignedPercent(activeUsersChange),
        ),
      );
    }

    if (gscClicksChange !== null && gscClicksChange <= -0.3 && stat.gscPrevious7Days.clicks >= 5) {
      insights.push(
        makeInsight(
          stat,
          "decline",
          "high",
          `GSC 클릭이 직전 7일 대비 ${formatSignedPercent(gscClicksChange)} 변했습니다.`,
          "상위 쿼리 순위와 CTR 하락 페이지를 점검하세요.",
          formatSignedPercent(gscClicksChange),
        ),
      );
    }

    if (activeUsersChange !== null && activeUsersChange >= 0.3 && stat.last7Days.activeUsers >= 10) {
      insights.push(
        makeInsight(
          stat,
          "growth",
          "medium",
          `GA4 사용자가 직전 7일 대비 ${formatSignedPercent(activeUsersChange)} 증가했습니다.`,
          "증가 원인을 찾고 비슷한 콘텐츠나 내부링크를 확장하세요.",
          formatSignedPercent(activeUsersChange),
        ),
      );
    }

    if (gsc.impressions >= 100 && gsc.ctr < 0.02) {
      insights.push(
        makeInsight(
          stat,
          "seoOpportunity",
          "medium",
          `노출 ${formatNumber(gsc.impressions)}회 대비 CTR이 ${formatPercent(gsc.ctr)}로 낮습니다.`,
          "제목과 메타 설명을 검색 의도에 맞춰 개선하세요.",
          formatPercent(gsc.ctr),
        ),
      );
    }

    if (gsc.position >= 4 && gsc.position <= 20 && gsc.impressions >= 50) {
      insights.push(
        makeInsight(
          stat,
          "rankingOpportunity",
          "medium",
          `평균순위 ${formatDecimal(gsc.position)}위로 추가 개선 여지가 있습니다.`,
          "상위 문서 보강, FAQ, 내부링크, 최신성 업데이트를 우선 적용하세요.",
          `${formatDecimal(gsc.position)}위`,
        ),
      );
    }

    if (stat.last7Days.activeUsers >= 50 && gsc.clicks <= 2 && !stat.gscError) {
      insights.push(
        makeInsight(
          stat,
          "trafficMismatch",
          "low",
          "GA4 유입은 있지만 GSC 검색 클릭은 낮습니다.",
          "검색 외 유입 채널 비중과 자연검색 확장 가능성을 확인하세요.",
          `GA4 ${formatNumber(stat.last7Days.activeUsers)}`,
        ),
      );
    }

    if ((urlCounts.get(normalizeUrl(stat.url)) ?? 0) > 1) {
      insights.push(
        makeInsight(
          stat,
          "duplicateProperty",
          "low",
          "같은 URL이 여러 GA4 속성 또는 스트림으로 등록되어 있습니다.",
          "중복 property가 의도된 것인지 확인하고 대시보드 그룹 기준을 정하세요.",
          "중복",
        ),
      );
    }
  }

  return insights.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function makeInsight(
  stat: EnrichedSiteStat,
  kind: InsightKind,
  severity: InsightSeverity,
  reason: string,
  recommendedAction: string,
  primaryValue: string,
): SiteInsight {
  return {
    id: `${stat.id}-${kind}-${reason}`,
    siteId: stat.id,
    siteName: stat.name,
    url: stat.url,
    kind,
    severity,
    reason,
    recommendedAction,
    primaryValue,
  };
}

function readSites(path: string): Site[] {
  if (!existsSync(path)) {
    return [];
  }

  const raw = readFileSync(path, "utf8");
  const parsed = (YAML.parse(raw) ?? {}) as SitesFile;
  return parsed.sites ?? [];
}

function readStats(path: string): StatsSnapshot {
  if (!existsSync(path)) {
    return { generatedAt: null, rangeDays: 7, previousRangeDays: 7, longRangeDays: 30, stats: [] };
  }

  return JSON.parse(readFileSync(path, "utf8")) as StatsSnapshot;
}

function emptySiteStat(site: Site): SiteStat {
  return {
    id: site.id,
    name: site.name ?? site.id,
    url: site.url,
    ga4PropertyId: site.ga4PropertyId ?? "",
    gscSiteUrl: site.gscSiteUrl ?? site.url,
    last1Days: emptyMetrics(),
    last7Days: emptyMetrics(),
    previous7Days: emptyMetrics(),
    last30Days: emptyMetrics(),
    gscLast7Days: emptyGscMetrics(),
    gscPrevious7Days: emptyGscMetrics(),
    gscLast30Days: emptyGscMetrics(),
    error: site.ga4PropertyId ? "통계 스냅샷 없음" : "GA4 속성 없음",
  };
}

function emptyMetrics(): MetricSet {
  return {
    activeUsers: 0,
    sessions: 0,
    screenPageViews: 0,
    eventCount: 0,
  };
}

function emptyGscMetrics(): GscMetricSet {
  return {
    clicks: 0,
    impressions: 0,
    ctr: 0,
    position: 0,
  };
}

function sumMetrics(metrics: MetricSet[]): MetricSet {
  return metrics.reduce(
    (total, metric) => ({
      activeUsers: total.activeUsers + metric.activeUsers,
      sessions: total.sessions + metric.sessions,
      screenPageViews: total.screenPageViews + metric.screenPageViews,
      eventCount: total.eventCount + metric.eventCount,
    }),
    emptyMetrics(),
  );
}

function sumGscMetrics(metrics: GscMetricSet[]): GscMetricSet {
  const totals = metrics.reduce(
    (total, metric) => ({
      clicks: total.clicks + metric.clicks,
      impressions: total.impressions + metric.impressions,
      weightedCtr: total.weightedCtr + metric.ctr * metric.impressions,
      weightedPosition: total.weightedPosition + metric.position * metric.impressions,
    }),
    { clicks: 0, impressions: 0, weightedCtr: 0, weightedPosition: 0 },
  );

  return {
    clicks: totals.clicks,
    impressions: totals.impressions,
    ctr: totals.impressions === 0 ? 0 : totals.weightedCtr / totals.impressions,
    position: totals.impressions === 0 ? 0 : totals.weightedPosition / totals.impressions,
  };
}

function changeRate(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return (current - previous) / previous;
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function severityRank(severity: InsightSeverity): number {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercent(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatPercent(value)}`;
}

function formatDecimal(value: number): string {
  return value.toFixed(1);
}
