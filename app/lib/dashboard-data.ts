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
  sitemapUrls?: string[];
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

export interface GscQueryMetric extends GscMetricSet {
  query: string;
}

export interface TrafficKeywordMetric {
  keyword: string;
  source: string;
  medium: string;
  sourceMedium: string;
  activeUsers: number;
  sessions: number;
  clicks?: number;
  impressions?: number;
  sourceType?: "ga4" | "gsc" | "external";
}

export interface SitemapDetail {
  path: string;
  lastDownloaded?: string;
  lastSubmitted?: string;
  warnings?: number;
  errors?: number;
  isPending?: boolean;
}

export type CollectionStatus =
  | "ok"
  | "auth_error"
  | "api_error"
  | "missing_config";
export type ErrorKind =
  | "permission"
  | "not_found"
  | "quota"
  | "missing_config"
  | "api_error";
export type OperationalStatus =
  | "normal"
  | "needsPermission"
  | "apiError"
  | "processing"
  | "stale";
export type ActionKind =
  | "permission"
  | "processing"
  | "decline"
  | "monetization"
  | "sitemap"
  | "seo"
  | "ranking"
  | "data";
export type SegmentKey = "growth" | "decline" | "seo" | "gsc" | "sitemap";
export type CollectionSourceKey =
  | "ga4"
  | "gsc"
  | "sitemap"
  | "adsense"
  | "adsTxt";
export type CollectionSourceState =
  | "ok"
  | "stale"
  | "error"
  | "missing"
  | "processing";

const SITEMAP_COLLECTION_LAG_DAYS = 5;
const CTR_OPPORTUNITY_MIN_IMPRESSIONS = 20;
const CTR_OPPORTUNITY_MAX_CTR = 0.03;
const CTR_OPPORTUNITY_MIN_POSITION = 1;
const CTR_OPPORTUNITY_MAX_POSITION = 10;
const RANKING_OPPORTUNITY_MIN_IMPRESSIONS = 50;
const RANKING_OPPORTUNITY_MIN_POSITION = 4;
const RANKING_OPPORTUNITY_MAX_POSITION = 20;

// 급락 판정 임계 — 절대규모가 작으면 변동률(%)이 통계적 노이즈가 되므로
// 직전 기간 규모가 이 값 이상일 때만 "급락"으로 본다.
const SIGNIFICANT_DROP_RATE = -0.3;
const MIN_USERS_FOR_DROP = 50;
const MIN_CLICKS_FOR_DROP = 10;

// GA4 사용자 급락 여부 (변동률 + 절대규모 게이트). 호출부 전체가 이 기준을 공유한다.
// 술어가 참이면 change는 반드시 number이므로 `change is number`로 narrow한다.
function isSignificantUserDrop(
  change: number | null | undefined,
  previousUsers: number | undefined,
): change is number {
  return (
    (change ?? 0) <= SIGNIFICANT_DROP_RATE &&
    (previousUsers ?? 0) >= MIN_USERS_FOR_DROP
  );
}

// GSC 클릭 급락 여부 (변동률 + 절대규모 게이트).
function isSignificantClickDrop(
  change: number | null | undefined,
  previousClicks: number | undefined,
): change is number {
  return (
    (change ?? 0) <= SIGNIFICANT_DROP_RATE &&
    (previousClicks ?? 0) >= MIN_CLICKS_FOR_DROP
  );
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
  gscTopQueries?: GscQueryMetric[];
  trafficKeywords?: TrafficKeywordMetric[];
  ga4Status?: CollectionStatus;
  gscStatus?: CollectionStatus;
  adsenseStatus?: CollectionStatus;
  adsTxtStatus?: CollectionStatus;
  monetization?: boolean;
  ga4LastSuccessfulFetchAt?: string;
  gscLastSuccessfulFetchAt?: string;
  adsenseLastSuccessfulFetchAt?: string;
  adsTxtLastSuccessfulFetchAt?: string;
  sitemapLastDownloadedAt?: string;
  sitemapLastSubmittedAt?: string;
  sitemapPath?: string;
  sitemapWarnings?: number;
  sitemapErrors?: number;
  sitemapIsPending?: boolean;
  sitemapCount?: number;
  sitemapDetails?: SitemapDetail[];
  ga4ErrorKind?: ErrorKind;
  gscErrorKind?: ErrorKind;
  adsenseErrorKind?: ErrorKind;
  adsTxtErrorKind?: ErrorKind;
  sitemapErrorKind?: ErrorKind;
  error?: string;
  gscError?: string;
  adsenseError?: string;
  adsTxtError?: string;
  sitemapError?: string;
  lastPublishedAt?: string;
  lastScheduledAt?: string;
}

interface StatsSnapshot {
  generatedAt: string | null;
  rangeDays: number;
  previousRangeDays: number;
  longRangeDays?: number;
  dateRanges?: DateRangeSummary;
  stats: SiteStat[];
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface DateRangeSummary {
  timezone: "Asia/Seoul";
  basis: "completed_days";
  last1Days: DateRange;
  last7Days: DateRange;
  previous7Days: DateRange;
  last30Days: DateRange;
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

export interface DuplicateSiteSummary {
  id: string;
  name: string;
  ga4PropertyId: string;
  activeUsers: number;
  healthScore: number;
  operationalStatus: OperationalStatus;
}

export interface SiteHealthScore {
  score: number;
  grade: "좋음" | "주의" | "위험";
  reason: string;
}

export interface EnrichedSiteStat extends Omit<
  SiteStat,
  | "last1Days"
  | "previous7Days"
  | "last30Days"
  | "gscPrevious7Days"
  | "gscLast30Days"
> {
  last1Days: MetricSet;
  previous7Days: MetricSet;
  last30Days: MetricSet;
  gscPrevious7Days: GscMetricSet;
  gscLast30Days: GscMetricSet;
  trend: SiteTrend;
  operationalStatus: OperationalStatus;
  statusLabel: string;
  statusReason: string;
  isStale: boolean;
  health: SiteHealthScore;
  seoOpportunityScore?: number;
  collectionSources: CollectionSourceStatus[];
  sparkline: number[];
  duplicateCount?: number;
  duplicateStats?: DuplicateSiteSummary[];
  lastPublishedAt?: string;
  lastScheduledAt?: string;
  daysSincePublished?: number;
}

export interface DashboardActionItem {
  id: string;
  siteId: string;
  siteName: string;
  url: string;
  kind: ActionKind;
  priority: number;
  label: string;
  value: string;
  reason: string;
  nextStep: string;
}

export interface DashboardSegment {
  key: SegmentKey;
  label: string;
  description: string;
  count: number;
  stats: EnrichedSiteStat[];
}

export interface HealthSummary {
  averageScore: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
}

export interface CollectionSourceStatus {
  key: CollectionSourceKey;
  label: string;
  state: CollectionSourceState;
  reason: string;
  checkedAt?: string;
}

export interface CollectionSourceSummary {
  key: CollectionSourceKey;
  label: string;
  ok: number;
  stale: number;
  error: number;
  missing: number;
  processing: number;
  total: number;
}

export interface DashboardData {
  generatedAt: string | null;
  dateRanges: DateRangeSummary;
  sites: Site[];
  stats: EnrichedSiteStat[];
  insights: SiteInsight[];
  priorityInsights: SiteInsight[];
  seoInsights: SiteInsight[];
  growthInsights: SiteInsight[];
  declineInsights: SiteInsight[];
  actions: DashboardActionItem[];
  segments: DashboardSegment[];
  healthSummary: HealthSummary;
  collectionSummary: CollectionSourceSummary[];
  gscIssueStats: EnrichedSiteStat[];
  dailyIssueStats: EnrichedSiteStat[];
  trafficDropStats: EnrichedSiteStat[];
  monetizationIssueStats: EnrichedSiteStat[];
  monetizationIssueCount: number;
  wpStaleStats: EnrichedSiteStat[];
  siteCount: number;
  trackedCount: number;
  gscConnectedCount: number;
  adsenseConnectedCount: number;
  adsenseCheckedCount: number;
  adsTxtConnectedCount: number;
  adsTxtCheckedCount: number;
  failedCount: number;
  staleCount: number;
  collectionStaleCount: number;
  duplicateHostCount: number;
  hiddenDuplicateCount: number;
  processingCount: number;
  totalLast1Days: MetricSet;
  totalLast7Days: MetricSet;
  totalPrevious7Days: MetricSet;
  totalLast30Days: MetricSet;
  totalGscLast7Days: GscMetricSet;
  totalGscPrevious7Days: GscMetricSet;
  totalGscLast30Days: GscMetricSet;
  totalActiveUsersChange: number | null;
}

interface DedupeStatsResult {
  stats: EnrichedSiteStat[];
  duplicateHostCount: number;
  hiddenDuplicateCount: number;
}

export function getDashboardData(): DashboardData {
  const sites = readSites("scripts/setup/sites.yaml").filter(
    (site) => site.enabled !== false,
  );
  const snapshot = readStats("data/site-stats.json");
  const statsById = new Map(snapshot.stats.map((stat) => [stat.id, stat]));
  const sparklines = loadSparklines(sites.map((s) => s.id));
  const stats = sites.map((site) =>
    enrichSiteStat(
      statsById.get(site.id) ?? emptySiteStat(site),
      sparklines.get(site.id) ?? [],
    ),
  );
  const dedupeResult = dedupeStatsByHost(stats);
  const displayStats = dedupeResult.stats;
  const insights = buildInsights(displayStats);
  const actions = buildActionItems(displayStats).slice(0, 12);
  const collectionSummary = buildCollectionSummary(displayStats);
  const totalLast1Days = sumMetrics(displayStats.map((stat) => stat.last1Days));
  const totalLast7Days = sumMetrics(displayStats.map((stat) => stat.last7Days));
  const totalPrevious7Days = sumMetrics(
    displayStats.map((stat) => stat.previous7Days),
  );
  const gscConnectedStats = displayStats.filter(
    (stat) => stat.gscStatus === "ok",
  );
  const adsenseCheckedStats = displayStats.filter((stat) => stat.adsenseStatus);
  const adsenseConnectedStats = displayStats.filter(
    (stat) => stat.adsenseStatus === "ok",
  );
  const adsTxtCheckedStats = displayStats.filter((stat) => stat.adsTxtStatus);
  const adsTxtConnectedStats = displayStats.filter(
    (stat) => stat.adsTxtStatus === "ok",
  );
  const monetizationIssueStats = displayStats
    .filter(hasMonetizationIssue)
    .sort((a, b) => b.last7Days.activeUsers - a.last7Days.activeUsers)
    .slice(0, 20);

  return {
    generatedAt: snapshot.generatedAt,
    dateRanges: snapshot.dateRanges ?? fallbackDateRanges(),
    sites,
    stats: displayStats,
    insights,
    priorityInsights: groupInsightsByDomain(
      insights.filter((insight) => insight.severity === "high"),
    ).slice(0, 10),
    seoInsights: groupInsightsByDomain(
      insights.filter(
        (insight) =>
          insight.kind === "seoOpportunity" ||
          insight.kind === "rankingOpportunity",
      ),
    ).slice(0, 10),
    growthInsights: groupInsightsByDomain(
      insights.filter((insight) => insight.kind === "growth"),
    ).slice(0, 8),
    declineInsights: groupInsightsByDomain(
      insights.filter((insight) => insight.kind === "decline"),
    ).slice(0, 8),
    actions,
    segments: buildSegments(displayStats),
    healthSummary: buildHealthSummary(displayStats),
    collectionSummary,
    gscIssueStats: displayStats.filter((stat) => Boolean(stat.gscError)),
    dailyIssueStats: displayStats
      .filter((stat) => stat.operationalStatus !== "normal")
      .slice(0, 20),
    trafficDropStats: displayStats
      .filter((s) =>
        isSignificantUserDrop(
          s.trend.activeUsersChange,
          s.previous7Days.activeUsers,
        ),
      )
      .sort(
        (a, b) =>
          (a.trend.activeUsersChange ?? 0) - (b.trend.activeUsersChange ?? 0),
      )
      .slice(0, 20),
    monetizationIssueStats,
    monetizationIssueCount: displayStats.filter(hasMonetizationIssue).length,
    wpStaleStats: displayStats
      .filter(
        (s) => s.daysSincePublished !== undefined && s.daysSincePublished >= 7,
      )
      .sort((a, b) => (b.daysSincePublished ?? 0) - (a.daysSincePublished ?? 0))
      .slice(0, 20),
    siteCount: displayStats.length,
    trackedCount: displayStats.filter(
      (stat) => !stat.error && stat.ga4PropertyId,
    ).length,
    gscConnectedCount: gscConnectedStats.length,
    adsenseConnectedCount: adsenseConnectedStats.length,
    adsenseCheckedCount: adsenseCheckedStats.length,
    adsTxtConnectedCount: adsTxtConnectedStats.length,
    adsTxtCheckedCount: adsTxtCheckedStats.length,
    failedCount: displayStats.filter(
      (stat) => stat.operationalStatus !== "normal",
    ).length,
    staleCount: displayStats.filter((stat) => stat.isStale).length,
    collectionStaleCount: displayStats.filter(
      (stat) => hasCollectionLag(stat) || hasSitemapCollectionLag(stat),
    ).length,
    duplicateHostCount: dedupeResult.duplicateHostCount,
    hiddenDuplicateCount: dedupeResult.hiddenDuplicateCount,
    processingCount: displayStats.filter(
      (stat) => stat.operationalStatus === "processing",
    ).length,
    totalLast1Days,
    totalLast7Days,
    totalPrevious7Days,
    totalLast30Days: sumMetrics(displayStats.map((stat) => stat.last30Days)),
    totalGscLast7Days: sumGscMetrics(
      gscConnectedStats.map((stat) => stat.gscLast7Days ?? emptyGscMetrics()),
    ),
    totalGscPrevious7Days: sumGscMetrics(
      gscConnectedStats.map((stat) => stat.gscPrevious7Days),
    ),
    totalGscLast30Days: sumGscMetrics(
      gscConnectedStats.map((stat) => stat.gscLast30Days),
    ),
    totalActiveUsersChange: changeRate(
      totalLast7Days.activeUsers,
      totalPrevious7Days.activeUsers,
    ),
  };
}

function dedupeStatsByHost(stats: EnrichedSiteStat[]): DedupeStatsResult {
  const groups = new Map<string, EnrichedSiteStat[]>();

  for (const stat of stats) {
    const key = normalizeHost(stat.url);
    groups.set(key, [...(groups.get(key) ?? []), stat]);
  }

  let duplicateHostCount = 0;
  let hiddenDuplicateCount = 0;
  const representatives = [...groups.values()].map((group) => {
    const sorted = [...group].sort((a, b) => compareRepresentative(b, a));
    const representative = sorted[0];
    if (!representative) {
      return undefined;
    }

    const duplicates = sorted.slice(1);
    if (duplicates.length === 0) {
      return representative;
    }

    duplicateHostCount += 1;
    hiddenDuplicateCount += duplicates.length;

    return {
      ...representative,
      duplicateCount: duplicates.length,
      duplicateStats: duplicates.map(toDuplicateSiteSummary),
    };
  });

  return {
    stats: representatives.filter((stat): stat is EnrichedSiteStat =>
      Boolean(stat),
    ),
    duplicateHostCount,
    hiddenDuplicateCount,
  };
}

function toDuplicateSiteSummary(stat: EnrichedSiteStat): DuplicateSiteSummary {
  return {
    id: stat.id,
    name: stat.name,
    ga4PropertyId: stat.ga4PropertyId,
    activeUsers: stat.last7Days.activeUsers,
    healthScore: stat.health.score,
    operationalStatus: stat.operationalStatus,
  };
}

function compareRepresentative(
  candidate: EnrichedSiteStat,
  current: EnrichedSiteStat,
): number {
  const candidateStatusScore = candidate.operationalStatus === "normal" ? 1 : 0;
  const currentStatusScore = current.operationalStatus === "normal" ? 1 : 0;
  if (candidateStatusScore !== currentStatusScore) {
    return candidateStatusScore - currentStatusScore;
  }

  const candidateTraffic = candidate.last7Days.activeUsers;
  const currentTraffic = current.last7Days.activeUsers;
  if (candidateTraffic !== currentTraffic) {
    return candidateTraffic - currentTraffic;
  }

  if (candidate.health.score !== current.health.score) {
    return candidate.health.score - current.health.score;
  }

  return (
    getNamePreferenceScore(candidate.name) -
    getNamePreferenceScore(current.name)
  );
}

function getNamePreferenceScore(name: string): number {
  const normalized = name.toLowerCase();
  if (normalized.includes(" - ga4") || normalized.startsWith("http")) {
    return 0;
  }

  return 1;
}

function normalizeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .replace(/^www\./, "")
      .toLowerCase();
  }
}

function enrichSiteStat(
  stat: SiteStat,
  sparkline: number[] = [],
): EnrichedSiteStat {
  const last1Days = stat.last1Days ?? emptyMetrics();
  const previous7Days = stat.previous7Days ?? emptyMetrics();
  const last30Days = stat.last30Days ?? stat.last28Days ?? emptyMetrics();
  const gscPrevious7Days = stat.gscPrevious7Days ?? emptyGscMetrics();
  const gscLast7Days = stat.gscLast7Days ?? emptyGscMetrics();
  const gscLast30Days =
    stat.gscLast30Days ?? stat.gscLast28Days ?? emptyGscMetrics();
  const ga4Status = stat.ga4Status ?? (stat.error ? "api_error" : "ok");
  const gscStatus = stat.gscStatus ?? (stat.gscError ? "auth_error" : "ok");
  const operationalStatus = getOperationalStatus({
    ...stat,
    ga4Status,
    gscStatus,
  });
  const collectionSources = getCollectionSources({
    ...stat,
    ga4Status,
    gscStatus,
  });
  const isStale = operationalStatus === "stale";
  const trend = {
    activeUsersChange: changeRate(
      stat.last7Days.activeUsers,
      previous7Days.activeUsers,
    ),
    sessionsChange: changeRate(stat.last7Days.sessions, previous7Days.sessions),
    gscClicksChange: changeRate(gscLast7Days.clicks, gscPrevious7Days.clicks),
  };
  const normalizedStat = {
    ...stat,
    ga4Status,
    gscStatus,
    gscLast7Days,
    last30Days,
    previous7Days,
    trend,
  };

  const enriched: EnrichedSiteStat = {
    ...stat,
    ga4Status,
    gscStatus,
    last1Days,
    previous7Days,
    last30Days,
    gscPrevious7Days,
    gscLast30Days,
    operationalStatus,
    statusLabel: getStatusLabel(operationalStatus),
    statusReason: getStatusReason(
      { ...stat, ga4Status, gscStatus },
      operationalStatus,
    ),
    isStale,
    trend,
    health: getHealthScore(normalizedStat, operationalStatus),
    seoOpportunityScore: getSeoOpportunityScore(normalizedStat),
    collectionSources,
    sparkline,
  };

  if (stat.lastPublishedAt) {
    enriched.lastPublishedAt = stat.lastPublishedAt;
    enriched.daysSincePublished = Math.floor(
      (Date.now() - Date.parse(stat.lastPublishedAt)) / 86400000,
    );
  }
  if (stat.lastScheduledAt) {
    enriched.lastScheduledAt = stat.lastScheduledAt;
  }

  return enriched;
}

function buildActionItems(stats: EnrichedSiteStat[]): DashboardActionItem[] {
  return stats.flatMap(getActionItems).sort((a, b) => b.priority - a.priority);
}

function getActionItems(stat: EnrichedSiteStat): DashboardActionItem[] {
  const items: DashboardActionItem[] = [];
  const activeChange = stat.trend.activeUsersChange;
  const gscChange = stat.trend.gscClicksChange;
  const gsc = stat.gscLast7Days ?? emptyGscMetrics();

  if (stat.operationalStatus === "needsPermission") {
    items.push(
      makeAction(
        stat,
        "permission",
        100,
        stat.statusLabel,
        stat.statusReason,
        "GSC/GA4 권한과 서비스 계정 접근을 먼저 복구하세요.",
      ),
    );
  }

  if (isSignificantUserDrop(activeChange, stat.previous7Days.activeUsers)) {
    items.push(
      makeAction(
        stat,
        "decline",
        90,
        formatSignedPercent(activeChange),
        "GA4 사용자가 직전 7일 대비 크게 감소했습니다.",
        "최근 발행, 색인, 유입 채널 변경 여부를 확인하세요.",
      ),
    );
  }

  if (isSignificantClickDrop(gscChange, stat.gscPrevious7Days.clicks)) {
    items.push(
      makeAction(
        stat,
        "decline",
        85,
        formatSignedPercent(gscChange),
        "GSC 클릭이 직전 7일 대비 크게 감소했습니다.",
        "상위 쿼리와 CTR 하락 페이지를 점검하세요.",
      ),
    );
  }

  if (stat.adsenseStatus === "missing_config") {
    items.push(
      makeAction(
        stat,
        "monetization",
        80,
        "코드 미탐지",
        "홈페이지 HTML에서 AdSense 코드가 감지되지 않았습니다.",
        "홈페이지, 글 상세, 조건부 광고 삽입, 캐시 반영 여부를 확인하세요.",
      ),
    );
  }

  if (stat.adsTxtStatus === "missing_config") {
    items.push(
      makeAction(
        stat,
        "monetization",
        78,
        "ads.txt 없음",
        "ads.txt에서 Google publisher 항목이 확인되지 않았습니다.",
        "/ads.txt에 google.com, pub-... 항목이 있는지 확인하세요.",
      ),
    );
  }

  if (stat.adsenseStatus === "api_error" || stat.adsTxtStatus === "api_error") {
    items.push(
      makeAction(
        stat,
        "monetization",
        76,
        "상태 확인 실패",
        "AdSense 코드 또는 ads.txt 상태 확인에 실패했습니다.",
        "홈페이지와 /ads.txt 접근 상태, 리다이렉트, 방화벽을 확인하세요.",
      ),
    );
  }

  if (stat.operationalStatus === "apiError") {
    items.push(
      makeAction(
        stat,
        "data",
        98,
        stat.statusLabel,
        stat.statusReason,
        "API 응답, 속성 ID, 서비스 계정 권한을 확인하세요.",
      ),
    );
  }

  if (stat.operationalStatus === "stale" && !hasSitemapCollectionLag(stat)) {
    items.push(
      makeAction(
        stat,
        "data",
        95,
        stat.statusLabel,
        stat.statusReason,
        "수집 스케줄과 최근 성공 수집 시각을 확인하세요.",
      ),
    );
  }

  if (stat.operationalStatus === "processing") {
    items.push(
      makeAction(
        stat,
        "processing",
        72,
        stat.statusLabel,
        stat.statusReason,
        "Google 재다운로드가 끝난 뒤 상태를 다시 확인하세요.",
      ),
    );
  }

  if (hasSitemapCollectionLag(stat)) {
    items.push(
      makeAction(
        stat,
        "sitemap",
        hasCurrentSitemapIssue(stat) ? 96 : 74,
        getSitemapCollectionLabel(stat),
        getSitemapCollectionReason(stat),
        "Search Console에 sitemap을 재제출하고 sitemap lastmod와 robots.txt Sitemap 라인을 확인하세요.",
      ),
    );
  }

  if (hasCtrOpportunity(stat)) {
    items.push(
      makeAction(
        stat,
        "seo",
        70 + Math.min(12, Math.floor(getSeoOpportunityScore(stat) / 20)),
        formatPercent(gsc.ctr),
        formatSeoOpportunityReason(stat),
        "SEO title과 meta description을 상위 쿼리 기준으로 점검하세요.",
      ),
    );
  }

  if (hasRankingOpportunity(stat)) {
    items.push(
      makeAction(
        stat,
        "ranking",
        65,
        `${formatDecimal(gsc.position)}위`,
        "평균순위가 4~20위 구간입니다.",
        "상위 문서 보강과 내부링크 추가로 1페이지 진입을 노리세요.",
      ),
    );
  }

  return items;
}

function makeAction(
  stat: EnrichedSiteStat,
  kind: ActionKind,
  priority: number,
  value: string,
  reason: string,
  nextStep: string,
): DashboardActionItem {
  return {
    id: `${stat.id}-${stat.ga4PropertyId}-${kind}-${reason}`,
    siteId: stat.id,
    siteName: stat.name,
    url: stat.url,
    kind,
    priority,
    label: getActionLabel(kind),
    value,
    reason,
    nextStep,
  };
}

function getActionLabel(kind: ActionKind): string {
  if (kind === "permission") return "권한";
  if (kind === "processing") return "재처리";
  if (kind === "decline") return "급락";
  if (kind === "monetization") return "수익화";
  if (kind === "sitemap") return "사이트맵";
  if (kind === "seo") return "CTR";
  if (kind === "ranking") return "순위";
  return "데이터";
}

function hasMonetizationIssue(stat: EnrichedSiteStat): boolean {
  return (
    stat.adsenseStatus === "missing_config" ||
    stat.adsTxtStatus === "missing_config" ||
    stat.adsenseStatus === "api_error" ||
    stat.adsTxtStatus === "api_error"
  );
}

function hasCtrOpportunity(stat: Pick<SiteStat, "gscLast7Days">): boolean {
  const gsc = stat.gscLast7Days ?? emptyGscMetrics();
  return (
    gsc.impressions >= CTR_OPPORTUNITY_MIN_IMPRESSIONS &&
    gsc.position >= CTR_OPPORTUNITY_MIN_POSITION &&
    gsc.position <= CTR_OPPORTUNITY_MAX_POSITION &&
    gsc.ctr < CTR_OPPORTUNITY_MAX_CTR
  );
}

function hasRankingOpportunity(stat: Pick<SiteStat, "gscLast7Days">): boolean {
  const gsc = stat.gscLast7Days ?? emptyGscMetrics();
  return (
    gsc.impressions >= RANKING_OPPORTUNITY_MIN_IMPRESSIONS &&
    gsc.position >= RANKING_OPPORTUNITY_MIN_POSITION &&
    gsc.position <= RANKING_OPPORTUNITY_MAX_POSITION
  );
}

function hasSeoOpportunity(stat: Pick<SiteStat, "gscLast7Days">): boolean {
  return hasCtrOpportunity(stat) || hasRankingOpportunity(stat);
}

function getSeoOpportunityScore(stat: Pick<SiteStat, "gscLast7Days">): number {
  if (!hasSeoOpportunity(stat)) {
    return 0;
  }

  const gsc = stat.gscLast7Days ?? emptyGscMetrics();
  const impressionScore = Math.min(60, Math.log10(gsc.impressions + 1) * 24);
  const ctrGapScore = hasCtrOpportunity(stat)
    ? (Math.max(0, CTR_OPPORTUNITY_MAX_CTR - gsc.ctr) /
        CTR_OPPORTUNITY_MAX_CTR) *
      40
    : 0;
  const positionScore =
    gsc.position <= CTR_OPPORTUNITY_MAX_POSITION
      ? Math.max(0, CTR_OPPORTUNITY_MAX_POSITION + 1 - gsc.position) * 3
      : Math.max(0, RANKING_OPPORTUNITY_MAX_POSITION + 1 - gsc.position) * 1.5;

  return Math.round(impressionScore + ctrGapScore + positionScore);
}

function formatSeoOpportunityReason(
  stat: Pick<SiteStat, "gscLast7Days">,
): string {
  const gsc = stat.gscLast7Days ?? emptyGscMetrics();
  return `최근 7일 GSC 노출 ${formatNumber(gsc.impressions)}, 평균순위 ${formatDecimal(
    gsc.position,
  )}, CTR ${formatPercent(gsc.ctr)}입니다.`;
}

function hasCollectionLag(stat: EnrichedSiteStat): boolean {
  return (
    isOlderThanHours(stat.ga4LastSuccessfulFetchAt, 48) ||
    isOlderThanHours(stat.gscLastSuccessfulFetchAt, 48) ||
    isOlderThanHours(stat.adsenseLastSuccessfulFetchAt, 48) ||
    isOlderThanHours(stat.adsTxtLastSuccessfulFetchAt, 48)
  );
}

function hasSitemapCollectionLag(stat: SiteStat): boolean {
  if (hasSitemapProcessing(stat)) {
    return false;
  }

  if (hasCleanPendingSitemap(stat)) {
    return false;
  }

  return (
    !stat.sitemapLastDownloadedAt ||
    isOlderThanDays(
      stat.sitemapLastDownloadedAt,
      SITEMAP_COLLECTION_LAG_DAYS,
    ) ||
    hasCurrentSitemapIssue(stat)
  );
}

function hasSitemapProcessing(stat: SiteStat): boolean {
  if (!hasCurrentSitemapIssue(stat)) {
    return false;
  }

  return hasUnprocessedSitemapSubmission(stat);
}

function hasCleanPendingSitemap(stat: SiteStat): boolean {
  return !hasCurrentSitemapIssue(stat) && hasUnprocessedSitemapSubmission(stat);
}

function hasCurrentSitemapIssue(stat: SiteStat): boolean {
  return (stat.sitemapErrors ?? 0) > 0 || (stat.sitemapWarnings ?? 0) > 0;
}

function hasUnprocessedSitemapSubmission(stat: SiteStat): boolean {
  if (stat.sitemapIsPending) {
    return true;
  }

  if (!stat.sitemapLastSubmittedAt) {
    return false;
  }

  const submittedAt = Date.parse(stat.sitemapLastSubmittedAt);
  const downloadedAt = stat.sitemapLastDownloadedAt
    ? Date.parse(stat.sitemapLastDownloadedAt)
    : Number.NEGATIVE_INFINITY;

  if (Number.isNaN(submittedAt) || Number.isNaN(downloadedAt)) {
    return false;
  }

  return submittedAt > downloadedAt;
}

function getSitemapCollectionAgeDays(stat: SiteStat): number {
  if (!stat.sitemapLastDownloadedAt) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = Date.parse(stat.sitemapLastDownloadedAt);
  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((Date.now() - timestamp) / 86400000);
}

function getSitemapCollectionLabel(stat: SiteStat): string {
  const ageDays = getSitemapCollectionAgeDays(stat);
  if (!Number.isFinite(ageDays)) {
    return "수집일 없음";
  }

  return `${formatNumber(ageDays)}일 전`;
}

function getSitemapCollectionReason(stat: SiteStat): string {
  const parts: string[] = [];
  if (!stat.sitemapLastDownloadedAt) {
    parts.push("GSC sitemap 마지막 수집일이 없습니다.");
  } else {
    parts.push(
      `GSC sitemap 마지막 수집일이 ${getSitemapCollectionLabel(stat)}입니다.`,
    );
  }
  if ((stat.sitemapErrors ?? 0) > 0) {
    parts.push(`오류 ${formatNumber(stat.sitemapErrors ?? 0)}개`);
  }
  if ((stat.sitemapWarnings ?? 0) > 0) {
    parts.push(`경고 ${formatNumber(stat.sitemapWarnings ?? 0)}개`);
  }

  return parts.join(" ");
}

function buildCollectionSummary(
  stats: EnrichedSiteStat[],
): CollectionSourceSummary[] {
  const summaries = COLLECTION_SOURCE_DEFINITIONS.map((source) => ({
    key: source.key,
    label: source.label,
    ok: 0,
    stale: 0,
    error: 0,
    missing: 0,
    processing: 0,
    total: stats.length,
  }));
  const byKey = new Map(summaries.map((summary) => [summary.key, summary]));

  for (const stat of stats) {
    for (const source of stat.collectionSources) {
      const summary = byKey.get(source.key);
      if (summary) {
        summary[source.state] += 1;
      }
    }
  }

  return summaries.sort(
    (a, b) =>
      getCollectionIssueCount(b) - getCollectionIssueCount(a) ||
      a.label.localeCompare(b.label, "ko-KR"),
  );
}

const COLLECTION_SOURCE_DEFINITIONS: Array<{
  key: CollectionSourceKey;
  label: string;
}> = [
  { key: "ga4", label: "GA4" },
  { key: "gsc", label: "GSC" },
  { key: "sitemap", label: "GSC sitemap" },
  { key: "adsense", label: "AdSense" },
  { key: "adsTxt", label: "ads.txt" },
];

function getCollectionIssueCount(summary: CollectionSourceSummary): number {
  return summary.stale + summary.error + summary.missing + summary.processing;
}

function getCollectionSources(stat: SiteStat): CollectionSourceStatus[] {
  const sources = [
    getApiCollectionSource(
      "ga4",
      "GA4",
      stat.ga4Status,
      stat.ga4LastSuccessfulFetchAt,
      stat.error,
    ),
    getApiCollectionSource(
      "gsc",
      "GSC",
      stat.gscStatus,
      stat.gscLastSuccessfulFetchAt,
      stat.gscError,
    ),
    getSitemapCollectionSource(stat),
  ];

  // AdSense 미적용 사이트(monetization=false, 예: 쇼핑몰)는 수익화 수집 항목에서 제외한다.
  if (stat.monetization !== false) {
    sources.push(
      getApiCollectionSource(
        "adsense",
        "AdSense",
        stat.adsenseStatus,
        stat.adsenseLastSuccessfulFetchAt,
        stat.adsenseError,
      ),
      getApiCollectionSource(
        "adsTxt",
        "ads.txt",
        stat.adsTxtStatus,
        stat.adsTxtLastSuccessfulFetchAt,
        stat.adsTxtError,
      ),
    );
  }

  return sources;
}

function getApiCollectionSource(
  key: CollectionSourceKey,
  label: string,
  status: CollectionStatus | undefined,
  checkedAt: string | undefined,
  error: string | undefined,
): CollectionSourceStatus {
  if (!status || status === "missing_config") {
    return {
      key,
      label,
      state: "missing",
      reason: `${label} 설정 또는 탐지 결과가 없습니다.`,
      ...(checkedAt ? { checkedAt } : {}),
    };
  }

  if (status === "auth_error" || status === "api_error") {
    return {
      key,
      label,
      state: "error",
      reason: error || `${label} 수집 또는 상태 확인에 실패했습니다.`,
      ...(checkedAt ? { checkedAt } : {}),
    };
  }

  if (!checkedAt || isOlderThanHours(checkedAt, 48)) {
    return {
      key,
      label,
      state: "stale",
      reason: checkedAt
        ? `${label} 마지막 성공 수집이 48시간을 넘었습니다.`
        : `${label} 마지막 성공 수집일이 없습니다.`,
      ...(checkedAt ? { checkedAt } : {}),
    };
  }

  return {
    key,
    label,
    state: "ok",
    reason: `${label} 수집 정상`,
    checkedAt,
  };
}

function getSitemapCollectionSource(stat: SiteStat): CollectionSourceStatus {
  if (stat.sitemapError) {
    return {
      key: "sitemap",
      label: "GSC sitemap",
      state: "error",
      reason: stat.sitemapError,
      ...(stat.sitemapLastDownloadedAt
        ? { checkedAt: stat.sitemapLastDownloadedAt }
        : {}),
    };
  }

  if (hasSitemapProcessing(stat) || hasCleanPendingSitemap(stat)) {
    return {
      key: "sitemap",
      label: "GSC sitemap",
      state: "processing",
      reason:
        "Search Console에 제출됐고 Google 재다운로드를 기다리는 중입니다.",
      ...(stat.sitemapLastSubmittedAt
        ? { checkedAt: stat.sitemapLastSubmittedAt }
        : {}),
    };
  }

  if (hasCurrentSitemapIssue(stat)) {
    return {
      key: "sitemap",
      label: "GSC sitemap",
      state: "error",
      reason: getSitemapCollectionReason(stat),
      ...(stat.sitemapLastDownloadedAt
        ? { checkedAt: stat.sitemapLastDownloadedAt }
        : {}),
    };
  }

  if (!stat.sitemapLastDownloadedAt && !stat.sitemapLastSubmittedAt) {
    return {
      key: "sitemap",
      label: "GSC sitemap",
      state: "missing",
      reason: "GSC sitemap 수집 또는 제출 이력이 없습니다.",
    };
  }

  if (hasSitemapCollectionLag(stat)) {
    return {
      key: "sitemap",
      label: "GSC sitemap",
      state: "stale",
      reason: getSitemapCollectionReason(stat),
      ...(stat.sitemapLastDownloadedAt
        ? { checkedAt: stat.sitemapLastDownloadedAt }
        : {}),
    };
  }

  return {
    key: "sitemap",
    label: "GSC sitemap",
    state: "ok",
    reason: "GSC sitemap 수집 정상",
    ...(stat.sitemapLastDownloadedAt
      ? { checkedAt: stat.sitemapLastDownloadedAt }
      : {}),
  };
}

function buildSegments(stats: EnrichedSiteStat[]): DashboardSegment[] {
  const segments: DashboardSegment[] = [
    {
      key: "growth",
      label: "성장",
      description: "7일 사용자가 직전 기간보다 30% 이상 증가한 사이트",
      count: 0,
      stats: stats
        .filter((stat) => (stat.trend.activeUsersChange ?? 0) >= 0.3)
        .sort((a, b) => b.last7Days.activeUsers - a.last7Days.activeUsers),
    },
    {
      key: "decline",
      label: "하락",
      description: "7일 사용자 또는 GSC 클릭이 30% 이상 감소한 사이트",
      count: 0,
      stats: stats.filter(
        (stat) =>
          (stat.trend.activeUsersChange ?? 0) <= -0.3 ||
          (stat.trend.gscClicksChange ?? 0) <= -0.3,
      ),
    },
    {
      key: "seo",
      label: "SEO 기회",
      description: "CTR 또는 평균순위 개선 여지가 큰 사이트",
      count: 0,
      stats: stats
        .filter(hasSeoOpportunity)
        .sort(
          (a, b) => (b.seoOpportunityScore ?? 0) - (a.seoOpportunityScore ?? 0),
        ),
    },
    {
      key: "gsc",
      label: "GSC 문제",
      description: "권한 오류 또는 검색 데이터 확인이 필요한 사이트",
      count: 0,
      stats: stats.filter(
        (stat) => stat.gscStatus !== "ok" || Boolean(stat.gscError),
      ),
    },
    {
      key: "sitemap",
      label: "사이트맵 지연",
      description: `GSC의 sitemap 마지막 수집일이 ${SITEMAP_COLLECTION_LAG_DAYS}일 이상 지난 사이트`,
      count: 0,
      stats: stats
        .filter(hasSitemapCollectionLag)
        .sort(
          (a, b) =>
            getSitemapCollectionAgeDays(b) - getSitemapCollectionAgeDays(a),
        ),
    },
  ];

  return segments.map((segment) => ({
    ...segment,
    count: segment.stats.length,
    stats: segment.stats.slice(0, 8),
  }));
}

function buildHealthSummary(stats: EnrichedSiteStat[]): HealthSummary {
  const total = stats.reduce((sum, stat) => sum + stat.health.score, 0);

  return {
    averageScore: stats.length === 0 ? 0 : Math.round(total / stats.length),
    healthyCount: stats.filter((stat) => stat.health.grade === "좋음").length,
    warningCount: stats.filter((stat) => stat.health.grade === "주의").length,
    criticalCount: stats.filter((stat) => stat.health.grade === "위험").length,
  };
}

function getHealthScore(
  stat: SiteStat & {
    last30Days: MetricSet;
    gscLast7Days: GscMetricSet;
    trend: SiteTrend;
  },
  operationalStatus: OperationalStatus,
): SiteHealthScore {
  let score = 100;
  const reasons: string[] = [];

  if (operationalStatus !== "normal") {
    score -= operationalStatus === "needsPermission" ? 35 : 25;
    reasons.push("수집 상태 확인 필요");
  }

  if (
    isSignificantUserDrop(
      stat.trend.activeUsersChange,
      stat.previous7Days?.activeUsers,
    )
  ) {
    score -= 25;
    reasons.push("사용자 급락");
  }

  if (
    isSignificantClickDrop(
      stat.trend.gscClicksChange,
      stat.gscPrevious7Days?.clicks,
    )
  ) {
    score -= 15;
    reasons.push("검색 클릭 감소");
  }

  if (stat.gscStatus === "ok" && hasCtrOpportunity(stat)) {
    score -= 10;
    reasons.push("CTR 낮음");
  }

  if (hasCleanPendingSitemap(stat)) {
    score -= 8;
    reasons.push("GSC sitemap 처리 대기");
  } else if (hasSitemapCollectionLag(stat)) {
    score -= 12;
    reasons.push("GSC sitemap 수집 지연");
  }

  if (stat.last30Days.activeUsers === 0) {
    score -= 10;
    reasons.push("30일 사용자 없음");
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  const grade =
    normalizedScore >= 80 ? "좋음" : normalizedScore >= 55 ? "주의" : "위험";

  return {
    score: normalizedScore,
    grade,
    reason: reasons.length > 0 ? reasons.join(", ") : "핵심 지표 정상",
  };
}

function groupInsightsByDomain(insights: SiteInsight[]): SiteInsight[] {
  const byDomain = new Map<string, SiteInsight[]>();
  for (const insight of insights) {
    const domain = normalizeUrl(insight.url);
    const existing = byDomain.get(domain) ?? [];
    byDomain.set(domain, [...existing, insight]);
  }
  const merged: SiteInsight[] = [];
  for (const group of byDomain.values()) {
    const primary = group[0];
    if (!primary) {
      continue;
    }
    if (group.length === 1) {
      merged.push(primary);
      continue;
    }
    const allReasons = group.map((i) => i.reason).join(" · ");
    const allValues = [...new Set(group.map((i) => i.primaryValue))].join(
      " / ",
    );
    merged.push({ ...primary, reason: allReasons, primaryValue: allValues });
  }
  return merged;
}

function buildInsights(stats: EnrichedSiteStat[]): SiteInsight[] {
  const insights: SiteInsight[] = [];
  const urlCounts = countBy(stats.map((stat) => normalizeUrl(stat.url)));

  for (const stat of stats) {
    const gsc = stat.gscLast7Days ?? emptyGscMetrics();
    const activeUsersChange = stat.trend.activeUsersChange;
    const gscClicksChange = stat.trend.gscClicksChange;

    if (
      stat.gscError ||
      (gsc.clicks === 0 &&
        gsc.impressions === 0 &&
        stat.last7Days.activeUsers >= 50)
    ) {
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

    if (
      isSignificantUserDrop(activeUsersChange, stat.previous7Days.activeUsers)
    ) {
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

    if (isSignificantClickDrop(gscClicksChange, stat.gscPrevious7Days.clicks)) {
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

    if (
      activeUsersChange !== null &&
      activeUsersChange >= 0.3 &&
      stat.last7Days.activeUsers >= 10
    ) {
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

    if (hasCtrOpportunity(stat)) {
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

    if (hasRankingOpportunity(stat)) {
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

  return insights.sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity),
  );
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

function loadSparklines(siteIds: string[]): Map<string, number[]> {
  const result = new Map<string, number[]>();
  const days: number[] = [6, 5, 4, 3, 2, 1, 0];

  for (const siteId of siteIds) {
    const values: number[] = [];
    for (const daysAgo of days) {
      const dateStr = seoulDateDaysAgo(daysAgo);
      const historyPath = `data/history/${dateStr}.json`;
      if (existsSync(historyPath)) {
        try {
          const snap = JSON.parse(
            readFileSync(historyPath, "utf8"),
          ) as StatsSnapshot;
          const stat = snap.stats.find((s) => s.id === siteId);
          values.push(stat?.last1Days?.activeUsers ?? 0);
        } catch {
          values.push(0);
        }
      } else {
        values.push(0);
      }
    }
    result.set(siteId, values);
  }
  return result;
}

function readStats(path: string): StatsSnapshot {
  if (!existsSync(path)) {
    return {
      generatedAt: null,
      rangeDays: 7,
      previousRangeDays: 7,
      longRangeDays: 30,
      dateRanges: fallbackDateRanges(),
      stats: [],
    };
  }

  return JSON.parse(readFileSync(path, "utf8")) as StatsSnapshot;
}

function fallbackDateRanges(): DateRangeSummary {
  return {
    timezone: "Asia/Seoul",
    basis: "completed_days",
    last1Days: { startDate: seoulDateDaysAgo(1), endDate: seoulDateDaysAgo(1) },
    last7Days: { startDate: seoulDateDaysAgo(7), endDate: seoulDateDaysAgo(1) },
    previous7Days: {
      startDate: seoulDateDaysAgo(14),
      endDate: seoulDateDaysAgo(8),
    },
    last30Days: {
      startDate: seoulDateDaysAgo(30),
      endDate: seoulDateDaysAgo(1),
    },
  };
}

function seoulDateDaysAgo(days: number): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
  const date = new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      12,
    ),
  );
  date.setUTCDate(date.getUTCDate() - days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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
    ga4Status: site.ga4PropertyId ? "api_error" : "missing_config",
    gscStatus: "api_error",
    adsenseStatus: "missing_config",
    adsTxtStatus: "missing_config",
    ga4ErrorKind: site.ga4PropertyId ? "api_error" : "missing_config",
    error: site.ga4PropertyId ? "통계 스냅샷 없음" : "GA4 속성 없음",
  };
}

function getOperationalStatus(stat: SiteStat): OperationalStatus {
  if (
    isOlderThanHours(stat.ga4LastSuccessfulFetchAt, 48) ||
    isOlderThanHours(stat.gscLastSuccessfulFetchAt, 48)
  ) {
    return "stale";
  }

  if (stat.ga4Status && stat.ga4Status !== "ok") {
    return stat.ga4Status === "auth_error" ||
      stat.ga4Status === "missing_config"
      ? "needsPermission"
      : "apiError";
  }

  if (stat.gscStatus && stat.gscStatus !== "ok") {
    return stat.gscStatus === "auth_error" ||
      stat.gscStatus === "missing_config"
      ? "needsPermission"
      : "apiError";
  }

  if (hasSitemapProcessing(stat)) {
    return "processing";
  }

  // sitemap 수집 지연(lastDownloaded)은 Google 크롤링 타이밍에 의존하므로
  // 운영자가 손쓸 수 없다. 운영 상태(stale)로 표시하면 정상 사이트가
  // 대량 오탐으로 잡힌다. 점수 감점(getHealthScore)으로만 약하게 반영한다.
  // GA4/GSC 수집(fetch) 48h+ 지연은 위에서 여전히 stale로 잡힌다.

  return "normal";
}

function getStatusLabel(status: OperationalStatus): string {
  if (status === "needsPermission") return "권한 필요";
  if (status === "apiError") return "API 실패";
  if (status === "processing") return "재처리중";
  if (status === "stale") return "오래된 데이터";
  return "정상";
}

function getStatusReason(stat: SiteStat, status: OperationalStatus): string {
  if (status === "processing") {
    return "GSC sitemap을 다시 제출했고 Google 재다운로드를 기다리는 중입니다.";
  }

  if (status === "stale") {
    const staleSources = getCollectionSources(stat)
      .filter((source) => source.state === "stale")
      .map((source) => source.label);
    return staleSources.length > 0
      ? `${staleSources.join(", ")} 수집이 지연됐습니다.`
      : "최근 성공 수집이 48시간을 넘었습니다.";
  }

  if (status === "needsPermission") {
    if (stat.gscError)
      return "GSC 권한 또는 Search Console 속성 확인이 필요합니다.";
    return "GA4 속성 또는 서비스 계정 권한 확인이 필요합니다.";
  }

  if (status === "apiError") {
    const errorSources = getCollectionSources(stat)
      .filter((source) => source.state === "error")
      .map((source) => source.label);
    return errorSources.length > 0
      ? `${errorSources.join(", ")} 상태 확인이 실패했습니다.`
      : "API 호출이 실패했습니다.";
  }

  return "GA4/GSC 수집 정상";
}

function isOlderThanHours(value: string | undefined, hours: number): boolean {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return true;
  }

  return Date.now() - timestamp > hours * 60 * 60 * 1000;
}

function isOlderThanDays(value: string | undefined, days: number): boolean {
  if (!value) {
    return true;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return true;
  }

  return Date.now() - timestamp > days * 24 * 60 * 60 * 1000;
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
      weightedPosition:
        total.weightedPosition + metric.position * metric.impressions,
    }),
    { clicks: 0, impressions: 0, weightedCtr: 0, weightedPosition: 0 },
  );

  return {
    clicks: totals.clicks,
    impressions: totals.impressions,
    ctr: totals.impressions === 0 ? 0 : totals.weightedCtr / totals.impressions,
    position:
      totals.impressions === 0
        ? 0
        : totals.weightedPosition / totals.impressions,
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
