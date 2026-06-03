"use client";

import { useMemo, useState } from "react";
import type {
  DashboardSegment,
  EnrichedSiteStat,
  OperationalStatus,
  SegmentKey,
} from "../lib/dashboard-data.js";

type StatusFilter = "all" | OperationalStatus;
type MonetizationFilter =
  | "all"
  | "adsense_ok"
  | "adsense_missing"
  | "ads_txt_missing"
  | "monetization_issue";
type SortKey =
  | "site"
  | "priority"
  | "health"
  | "oneDayUsers"
  | "sevenDayUsers"
  | "thirtyDayUsers"
  | "change"
  | "gscClicks"
  | "gscImpressions"
  | "topQueries"
  | "ctr"
  | "adsense"
  | "adsTxt"
  | "position"
  | "lastScheduledAt"
  | "sitemapCollectedAt"
  | "status";
type SortDirection = "asc" | "desc";

const SITEMAP_COLLECTION_LAG_DAYS = 5;

const sortLabels: Record<SortKey, string> = {
  site: "사이트",
  priority: "우선순위",
  health: "점수",
  oneDayUsers: "1일 사용자",
  sevenDayUsers: "7일 사용자",
  thirtyDayUsers: "30일 사용자",
  change: "증감률",
  gscClicks: "GSC 클릭",
  gscImpressions: "GSC 노출",
  topQueries: "대표 유입 키워드",
  ctr: "CTR",
  adsense: "AdSense",
  adsTxt: "ads.txt",
  position: "평균순위",
  lastScheduledAt: "예약글",
  sitemapCollectedAt: "사이트맵 수집일",
  status: "상태",
};

const statusLabels: Record<StatusFilter, string> = {
  all: "전체",
  normal: "정상",
  needsPermission: "권한 필요",
  apiError: "API 실패",
  processing: "재처리중",
  stale: "오래된 데이터",
};

const monetizationLabels: Record<MonetizationFilter, string> = {
  all: "전체",
  adsense_ok: "코드 연동",
  adsense_missing: "코드 미탐지",
  ads_txt_missing: "ads.txt 없음",
  monetization_issue: "수익화 이슈",
};

const sortableHeaders: Array<{ key: SortKey; label: string }> = [
  { key: "site", label: "사이트" },
  { key: "health", label: "점수" },
  { key: "oneDayUsers", label: "1일" },
  { key: "sevenDayUsers", label: "7일" },
  { key: "thirtyDayUsers", label: "30일" },
  { key: "change", label: "증감" },
  { key: "gscClicks", label: "GSC 클릭" },
  { key: "gscImpressions", label: "GSC 노출" },
  { key: "topQueries", label: "유입 키워드" },
  { key: "ctr", label: "CTR" },
  { key: "adsense", label: "AdSense" },
  { key: "adsTxt", label: "ads.txt" },
  { key: "position", label: "평균순위" },
  { key: "lastScheduledAt", label: "예약글" },
  { key: "sitemapCollectedAt", label: "사이트맵 수집일" },
  { key: "status", label: "상태" },
];

export function SiteStatsTable({
  stats,
  failedCount,
  segments,
}: {
  stats: EnrichedSiteStat[];
  failedCount: number;
  segments: DashboardSegment[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [monetizationFilter, setMonetizationFilter] =
    useState<MonetizationFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [segmentKey, setSegmentKey] = useState<SegmentKey | "all">("all");

  const visibleStats = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const segmentIds = new Set(
      segments
        .find((segment) => segment.key === segmentKey)
        ?.stats.map((stat) => stat.id) ?? [],
    );

    return stats
      .filter((stat) => segmentKey === "all" || segmentIds.has(stat.id))
      .filter((stat) => matchesQuery(stat, normalizedQuery))
      .filter((stat) => matchesStatus(stat, statusFilter))
      .filter((stat) => matchesMonetization(stat, monetizationFilter))
      .sort((a, b) => compareStats(a, b, sortKey, sortDirection));
  }, [
    monetizationFilter,
    query,
    segmentKey,
    segments,
    sortDirection,
    sortKey,
    stats,
    statusFilter,
  ]);

  function changeSort(nextSortKey: SortKey) {
    if (nextSortKey === sortKey) {
      setSortDirection((direction) => (direction === "desc" ? "asc" : "desc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(getDefaultSortDirection(nextSortKey));
  }

  return (
    <article className="panel wide-panel stats-panel">
      <div className="panel-heading stats-heading">
        <div>
          <h2>사이트 탐색</h2>
          <p>세그먼트, 상태, 수익화 조건으로 사이트별 지표를 비교합니다.</p>
        </div>
        <span>{failedCount > 0 ? `확인 필요 ${failedCount}개` : "정상"}</span>
      </div>

      <SegmentTabs
        segments={segments}
        activeKey={segmentKey}
        totalCount={stats.length}
        onChange={setSegmentKey}
      />

      <div className="table-controls" aria-label="사이트 통계 필터">
        <label>
          <span>사이트 검색</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="도메인 또는 사이트명"
          />
        </label>
        <label>
          <span>상태</span>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
          >
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>수익화</span>
          <select
            value={monetizationFilter}
            onChange={(event) =>
              setMonetizationFilter(event.target.value as MonetizationFilter)
            }
          >
            {Object.entries(monetizationLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>정렬</span>
          <select
            value={sortKey}
            onChange={(event) => {
              const nextSortKey = event.target.value as SortKey;
              setSortKey(nextSortKey);
              setSortDirection(getDefaultSortDirection(nextSortKey));
            }}
          >
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <strong>{formatNumber(visibleStats.length)}개 표시</strong>
      </div>

      <TrafficKeywordLegend />

      <div className="stats-table-wrap">
        <table className="stats-table">
          <thead>
            <tr>
              <SortableHeader
                activeKey={sortKey}
                direction={sortDirection}
                label="사이트"
                sortKey="site"
                onSort={changeSort}
              />
              <SortableHeader
                activeKey={sortKey}
                direction={sortDirection}
                label="점수"
                sortKey="health"
                onSort={changeSort}
              />
              <th>추세</th>
              {sortableHeaders.slice(2).map((header) => (
                <SortableHeader
                  activeKey={sortKey}
                  direction={sortDirection}
                  key={header.key}
                  label={header.label}
                  sortKey={header.key}
                  onSort={changeSort}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleStats.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={17}>
                  조건에 맞는 사이트가 없습니다.
                </td>
              </tr>
            ) : (
              visibleStats.map((stat) => (
                <StatsRow key={`${stat.id}-${stat.ga4PropertyId}`} stat={stat} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function TrafficKeywordLegend() {
  const items = [
    { className: "keyword-google", label: "G", text: "Google" },
    { className: "keyword-naver", label: "N", text: "Naver" },
    { className: "keyword-daum", label: "D/K", text: "Daum/Kakao" },
    { className: "keyword-bing", label: "B", text: "Bing" },
    { className: "keyword-youtube", label: "Y", text: "YouTube" },
  ];

  return (
    <div className="keyword-legend" aria-label="유입 키워드 소스 범례">
      {items.map((item) => (
        <span className={`keyword-legend-item ${item.className}`} key={item.text}>
          <b>{item.label}</b>
          <span>{item.text}</span>
        </span>
      ))}
    </div>
  );
}

function SortableHeader({
  activeKey,
  direction,
  label,
  sortKey,
  onSort,
}: {
  activeKey: SortKey;
  direction: SortDirection;
  label: string;
  sortKey: SortKey;
  onSort: (sortKey: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  const ariaSort: "ascending" | "descending" | "none" = active
    ? direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th aria-sort={ariaSort}>
      <button
        className={active ? "table-sort active" : "table-sort"}
        title={`${sortLabels[sortKey]} 정렬`}
        onClick={() => onSort(sortKey)}
        type="button"
      >
        <span>{label}</span>
        <span aria-hidden>{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
      </button>
    </th>
  );
}

function SegmentTabs({
  segments,
  activeKey,
  totalCount,
  onChange,
}: {
  segments: DashboardSegment[];
  activeKey: SegmentKey | "all";
  totalCount: number;
  onChange: (key: SegmentKey | "all") => void;
}) {
  return (
    <div className="segment-tabs" aria-label="사이트 세그먼트">
      <button
        className={activeKey === "all" ? "active" : ""}
        type="button"
        onClick={() => onChange("all")}
      >
        전체 <strong>{formatNumber(totalCount)}</strong>
      </button>
      {segments.map((segment) => (
        <button
          className={activeKey === segment.key ? "active" : ""}
          key={segment.key}
          type="button"
          onClick={() => onChange(segment.key)}
        >
          {segment.label} <strong>{formatNumber(segment.count)}</strong>
        </button>
      ))}
    </div>
  );
}

function StatsRow({
  stat,
}: {
  stat: EnrichedSiteStat;
}) {
  return (
    <tr>
      <td>
        <div className="site-cell">
          <strong>{stat.name}</strong>
          <a href={stat.url} onClick={(event) => event.stopPropagation()}>
            {formatHost(stat.url)}
          </a>
          {stat.duplicateCount ? (
            <span
              className="duplicate-note"
              title={formatDuplicateTitle(stat)}
            >
              중복 {stat.duplicateCount}개 숨김
            </span>
          ) : null}
        </div>
      </td>
      <td>
        <span className={getHealthClass(stat.health.grade)}>
          {stat.health.score}
        </span>
      </td>
      <td>
        <Sparkline values={stat.sparkline} />
      </td>
      <td>{formatNumber(stat.last1Days.activeUsers)}</td>
      <td>{formatNumber(stat.last7Days.activeUsers)}</td>
      <td>{formatNumber(stat.last30Days.activeUsers)}</td>
      <td>{formatChange(stat.trend.activeUsersChange)}</td>
      <td>{formatNumber(stat.gscLast7Days?.clicks ?? 0)}</td>
      <td>{formatNumber(stat.gscLast7Days?.impressions ?? 0)}</td>
      <td>
        <TopQueriesCell stat={stat} />
      </td>
      <td>{formatPercent(stat.gscLast7Days?.ctr ?? 0)}</td>
      <td>
        <span
          className={getAdsenseBadgeClass(stat.adsenseStatus)}
          title={getAdsenseStatusTitle(stat)}
        >
          {getAdsenseStatusLabel(stat.adsenseStatus)}
        </span>
      </td>
      <td>
        <span
          className={getMonetizationBadgeClass(stat.adsTxtStatus)}
          title={getAdsTxtStatusTitle(stat)}
        >
          {getAdsTxtStatusLabel(stat.adsTxtStatus)}
        </span>
      </td>
      <td>{formatPosition(stat.gscLast7Days?.position ?? 0)}</td>
      <td>
        <ScheduledPostCell stat={stat} />
      </td>
      <td>
        <SitemapCollectionCell stat={stat} />
      </td>
      <td>
        <span
          className={getBadgeClass(stat.operationalStatus)}
          title={formatOperationalStatusTitle(stat)}
        >
          {stat.statusLabel}
        </span>
      </td>
    </tr>
  );
}

function ScheduledPostCell({ stat }: { stat: EnrichedSiteStat }) {
  return (
    <span
      className={`collection-cell ${stat.lastScheduledAt ? "collection-fresh" : "collection-missing"}`}
      title={formatScheduledPostTitle(stat)}
    >
      <strong>{stat.lastScheduledAt ? "예약" : "-"}</strong>
      <small>{formatScheduledDate(stat.lastScheduledAt)}</small>
    </span>
  );
}

function SitemapCollectionCell({ stat }: { stat: EnrichedSiteStat }) {
  const collectedAt = getSitemapCollectionValue(stat);

  return (
    <span
      className={`collection-cell ${getSitemapCollectionClass(stat)}`}
      title={formatSitemapCollectionTitle(stat)}
    >
      <strong>{getSitemapCollectionStatusLabel(stat)}</strong>
      <small>{formatShortDate(collectedAt)}</small>
    </span>
  );
}

function TopQueriesCell({ stat }: { stat: EnrichedSiteStat }) {
  const keywords = getTrafficKeywords(stat);
  if (keywords.length === 0) {
    return <span className="keyword-empty">-</span>;
  }

  return (
    <div className="keyword-list" title={formatTopQueriesTitle(stat)}>
      {keywords.slice(0, 3).map((keyword) => (
        <span
          className={`keyword-chip ${getTrafficSourceClass(keyword.source)}`}
          key={`${keyword.sourceMedium}-${keyword.keyword}`}
        >
          <b>{formatTrafficSourceLabel(keyword.source)}</b>
          <span>{keyword.keyword}</span>
          <small>{formatKeywordCount(keyword)}</small>
        </span>
      ))}
    </div>
  );
}

function getTrafficKeywords(stat: EnrichedSiteStat) {
  if (stat.trafficKeywords && stat.trafficKeywords.length > 0) {
    return stat.trafficKeywords;
  }

  return (stat.gscTopQueries ?? []).slice(0, 3).map((query) => ({
    keyword: query.query,
    source: "google",
    medium: "organic",
    sourceMedium: "google / organic",
    activeUsers: query.clicks,
    sessions: query.clicks,
    clicks: query.clicks,
    impressions: query.impressions,
    sourceType: "gsc" as const,
  }));
}

function getTrafficSourceClass(source: string): string {
  const normalized = source.toLowerCase();
  if (normalized.includes("naver") || normalized.includes("네이버")) {
    return "keyword-naver";
  }
  if (
    normalized.includes("daum") ||
    normalized.includes("kakao") ||
    normalized.includes("다음") ||
    normalized.includes("카카오")
  ) {
    return "keyword-daum";
  }
  if (normalized.includes("google")) {
    return "keyword-google";
  }
  if (normalized.includes("youtube")) {
    return "keyword-youtube";
  }
  if (normalized.includes("bing")) {
    return "keyword-bing";
  }
  if (normalized === "(direct)") {
    return "keyword-direct";
  }
  return "keyword-other";
}

function formatTrafficSourceLabel(source: string): string {
  const normalized = source.toLowerCase();
  if (normalized.includes("naver") || normalized.includes("네이버")) {
    return "N";
  }
  if (normalized.includes("daum") || normalized.includes("다음")) {
    return "D";
  }
  if (normalized.includes("kakao") || normalized.includes("카카오")) {
    return "K";
  }
  if (normalized.includes("google")) {
    return "G";
  }
  if (normalized.includes("youtube")) {
    return "Y";
  }
  if (normalized.includes("bing")) {
    return "B";
  }
  if (normalized === "(direct)") {
    return "직";
  }
  return "기";
}

function formatKeywordCount(
  keyword: ReturnType<typeof getTrafficKeywords>[number],
) {
  if (keyword.sourceType === "gsc") {
    return formatNumber(keyword.impressions ?? keyword.activeUsers);
  }
  return formatNumber(keyword.activeUsers);
}

function getKeywordSortValue(stat: EnrichedSiteStat): number {
  const keyword = getTrafficKeywords(stat)[0];
  if (!keyword) {
    return 0;
  }
  return keyword.sourceType === "gsc"
    ? (keyword.impressions ?? keyword.activeUsers)
    : keyword.activeUsers;
}

function matchesQuery(
  stat: EnrichedSiteStat,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) {
    return true;
  }

  return `${stat.name} ${stat.url} ${getTrafficKeywords(stat)
    .map((keyword) => `${keyword.keyword} ${keyword.sourceMedium}`)
    .join(" ")}`
    .toLowerCase()
    .includes(normalizedQuery);
}

function matchesStatus(
  stat: EnrichedSiteStat,
  statusFilter: StatusFilter,
): boolean {
  if (statusFilter === "all") {
    return true;
  }

  return stat.operationalStatus === statusFilter;
}

function matchesMonetization(
  stat: EnrichedSiteStat,
  monetizationFilter: MonetizationFilter,
): boolean {
  if (monetizationFilter === "all") {
    return true;
  }
  if (monetizationFilter === "adsense_ok") {
    return stat.adsenseStatus === "ok";
  }
  if (monetizationFilter === "adsense_missing") {
    return stat.adsenseStatus === "missing_config";
  }
  if (monetizationFilter === "ads_txt_missing") {
    return stat.adsTxtStatus === "missing_config";
  }
  return (
    stat.adsenseStatus === "missing_config" ||
    stat.adsTxtStatus === "missing_config" ||
    stat.adsenseStatus === "api_error" ||
    stat.adsTxtStatus === "api_error"
  );
}

function compareStats(
  a: EnrichedSiteStat,
  b: EnrichedSiteStat,
  sortKey: SortKey,
  direction: SortDirection,
): number {
  const multiplier = direction === "asc" ? 1 : -1;
  const aValue = getSortValue(a, sortKey);
  const bValue = getSortValue(b, sortKey);

  if (typeof aValue === "string" || typeof bValue === "string") {
    return (
      String(aValue).localeCompare(String(bValue), "ko-KR", {
        numeric: true,
        sensitivity: "base",
      }) * multiplier
    );
  }

  return (aValue - bValue) * multiplier;
}

function getSortValue(
  stat: EnrichedSiteStat,
  sortKey: SortKey,
): number | string {
  if (sortKey === "site") {
    return `${stat.name} ${formatHost(stat.url)}`;
  }
  if (sortKey === "priority") {
    return 100 - stat.health.score;
  }
  if (sortKey === "health") {
    return stat.health.score;
  }
  if (sortKey === "oneDayUsers") {
    return stat.last1Days.activeUsers;
  }
  if (sortKey === "sevenDayUsers") {
    return stat.last7Days.activeUsers;
  }
  if (sortKey === "thirtyDayUsers") {
    return stat.last30Days.activeUsers;
  }
  if (sortKey === "change") {
    return stat.trend.activeUsersChange ?? Number.NEGATIVE_INFINITY;
  }
  if (sortKey === "gscClicks") {
    return stat.gscLast7Days?.clicks ?? 0;
  }
  if (sortKey === "gscImpressions") {
    return stat.gscLast7Days?.impressions ?? 0;
  }
  if (sortKey === "topQueries") {
    return getKeywordSortValue(stat);
  }
  if (sortKey === "ctr") {
    return stat.gscLast7Days?.ctr ?? 0;
  }
  if (sortKey === "adsense") {
    return getAdsenseStatusLabel(stat.adsenseStatus);
  }
  if (sortKey === "adsTxt") {
    return getAdsTxtStatusLabel(stat.adsTxtStatus);
  }
  if (sortKey === "position") {
    const position = stat.gscLast7Days?.position ?? 0;
    return position === 0 ? Number.POSITIVE_INFINITY : position;
  }
  if (sortKey === "lastScheduledAt") {
    return parseCollectionTime(stat.lastScheduledAt);
  }
  if (sortKey === "sitemapCollectedAt") {
    return parseCollectionTime(getSitemapCollectionValue(stat));
  }
  if (sortKey === "status") {
    return stat.statusLabel;
  }
  return stat.last7Days.activeUsers;
}

function getDefaultSortDirection(sortKey: SortKey): SortDirection {
  if (
    sortKey === "site" ||
    sortKey === "adsense" ||
    sortKey === "adsTxt" ||
    sortKey === "position" ||
    sortKey === "lastScheduledAt" ||
    sortKey === "sitemapCollectedAt" ||
    sortKey === "status"
  ) {
    return "asc";
  }

  return "desc";
}

function getBadgeClass(status: EnrichedSiteStat["operationalStatus"]): string {
  if (status === "needsPermission") {
    return "badge badge-error";
  }

  if (status === "apiError" || status === "stale" || status === "processing") {
    return "badge badge-warning";
  }

  return "badge";
}

function formatOperationalStatusTitle(stat: EnrichedSiteStat): string {
  const sourceLines = stat.collectionSources.map(
    (source) =>
      `${source.label}: ${getCollectionSourceStateLabel(source.state)} - ${source.reason}`,
  );
  return [stat.statusReason, ...sourceLines].join("\n");
}

function getCollectionSourceStateLabel(
  state: EnrichedSiteStat["collectionSources"][number]["state"],
): string {
  if (state === "ok") return "정상";
  if (state === "stale") return "지연";
  if (state === "error") return "오류";
  if (state === "missing") return "누락";
  return "처리중";
}

function getAdsenseStatusLabel(
  status: EnrichedSiteStat["adsenseStatus"],
): string {
  if (status === "ok") {
    return "정상";
  }
  if (status === "missing_config") {
    return "코드 미탐지";
  }
  if (status === "auth_error" || status === "api_error") {
    return "상태 확인 실패";
  }
  return "미수집";
}

function getAdsenseStatusTitle(stat: EnrichedSiteStat): string {
  if (stat.adsenseStatus === "ok") {
    return "홈페이지에서 AdSense 코드가 확인됐습니다.";
  }
  if (stat.adsenseError) {
    return stat.adsenseError === "Missing AdSense code" ||
      stat.adsenseError === "AdSense code not detected on homepage"
      ? "홈페이지 HTML에서 AdSense 코드가 감지되지 않았습니다. 글 상세, 조건부 삽입, 캐시 상태는 별도 확인이 필요합니다."
      : stat.adsenseError;
  }
  return "아직 AdSense 코드 상태를 수집하지 않았습니다. pnpm stats:update 실행 후 갱신됩니다.";
}

function getAdsenseBadgeClass(
  status: EnrichedSiteStat["adsenseStatus"],
): string {
  return getMonetizationBadgeClass(status);
}

function getAdsTxtStatusLabel(
  status: EnrichedSiteStat["adsTxtStatus"],
): string {
  if (status === "ok") {
    return "정상";
  }
  if (status === "missing_config") {
    return "없음";
  }
  if (status === "auth_error" || status === "api_error") {
    return "상태 확인 실패";
  }
  return "미수집";
}

function getAdsTxtStatusTitle(stat: EnrichedSiteStat): string {
  if (stat.adsTxtStatus === "ok") {
    return "ads.txt에서 Google publisher 항목이 확인됐습니다.";
  }
  if (stat.adsTxtError) {
    return stat.adsTxtError;
  }
  return "아직 ads.txt 상태를 수집하지 않았습니다. pnpm stats:update 실행 후 갱신됩니다.";
}

function getMonetizationBadgeClass(
  status: EnrichedSiteStat["adsenseStatus"] | EnrichedSiteStat["adsTxtStatus"],
): string {
  if (status === "ok") {
    return "badge";
  }
  if (status === "missing_config") {
    return "badge badge-warning";
  }
  if (status === "auth_error" || status === "api_error") {
    return "badge badge-error";
  }
  return "badge badge-muted";
}

function getHealthClass(grade: EnrichedSiteStat["health"]["grade"]): string {
  if (grade === "위험") {
    return "health-score danger";
  }
  if (grade === "주의") {
    return "health-score warning";
  }
  return "health-score";
}

function formatHost(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function formatDuplicateTitle(stat: EnrichedSiteStat): string {
  const details =
    stat.duplicateStats?.map(
      (duplicate) =>
        `${duplicate.name} (${duplicate.ga4PropertyId}) · 7일 ${formatNumber(duplicate.activeUsers)}명 · 점수 ${duplicate.healthScore} · ${duplicate.operationalStatus}`,
    ) ?? [];

  return [
    "같은 호스트의 다른 GA4 속성은 대표 항목에서 숨겼습니다.",
    ...details,
  ].join("\n");
}

function formatTopQueriesTitle(stat: EnrichedSiteStat): string {
  const keywords = getTrafficKeywords(stat);
  if (keywords.length === 0) {
    return "대표 유입 키워드 없음";
  }

  return keywords
    .map((keyword) => {
      const metricLabel =
        keyword.sourceType === "gsc"
          ? `GSC 노출 ${formatNumber(
              keyword.impressions ?? keyword.activeUsers,
            )}, 클릭 ${formatNumber(keyword.clicks ?? keyword.activeUsers)}`
          : `GA4 사용자 ${formatNumber(keyword.activeUsers)}, 세션 ${formatNumber(
              keyword.sessions,
            )}`;
      return `${keyword.keyword}: ${keyword.sourceMedium} · ${metricLabel}`;
    })
    .join("\n");
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatChange(value: number | null): string {
  if (value === null) {
    return "신규";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatPercent(value)}`;
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2 || values.every((v) => v === 0)) {
    return <span className="sparkline-empty">-</span>;
  }
  const max = Math.max(...values, 1);
  const W = 56;
  const H = 20;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - (v / max) * H;
      return `${x},${y}`;
    })
    .join(" ");
  const lastVal = values[values.length - 1] ?? 0;
  const prevVal = values[values.length - 2] ?? 0;
  const isUp = lastVal >= prevVal;
  return (
    <svg
      width={W}
      height={H}
      className={`sparkline ${isUp ? "spark-up" : "spark-down"}`}
      aria-hidden
    >
      <polyline fill="none" strokeWidth="1.5" points={pts} />
    </svg>
  );
}

function formatPosition(value: number): string {
  return value === 0 ? "-" : value.toFixed(1);
}

function getSitemapCollectionValue(
  stat: EnrichedSiteStat,
): string | undefined {
  return stat.sitemapLastDownloadedAt;
}

function parseCollectionTime(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatShortDate(value: string | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);
}

function formatScheduledDate(value: string | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const now = new Date();
  const dateYear = Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: "Asia/Seoul",
    }).format(date),
  );
  const currentYear = Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: "Asia/Seoul",
    }).format(now),
  );

  return new Intl.DateTimeFormat("ko-KR", {
    ...(dateYear === currentYear ? {} : { year: "numeric" as const }),
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);
}

function formatDateTime(value: string | undefined): string {
  if (!value) {
    return "수집 기록 없음";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "수집 기록 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function formatScheduledPostTitle(stat: EnrichedSiteStat): string {
  const lines = [
    stat.lastScheduledAt
      ? `마지막 예약글: ${formatDateTime(stat.lastScheduledAt)}`
      : "예약글 없음",
    stat.lastPublishedAt
      ? `마지막 발행글: ${formatDateTime(stat.lastPublishedAt)}`
      : "",
  ].filter(Boolean);

  return lines.join("\n");
}

function formatSitemapCollectionTitle(stat: EnrichedSiteStat): string {
  if (stat.sitemapError) {
    return `GSC 사이트맵 수집일 확인 실패: ${stat.sitemapError}`;
  }

  const downloadedAt = stat.sitemapLastDownloadedAt;
  const submittedAt = stat.sitemapLastSubmittedAt;
  const sitemapDetailLines =
    stat.sitemapDetails?.map((detail) => {
      const status = [
        detail.isPending ? "pending" : "",
        detail.errors !== undefined ? `errors=${detail.errors}` : "",
        detail.warnings !== undefined ? `warnings=${detail.warnings}` : "",
        detail.lastDownloaded
          ? `downloaded=${formatDateTime(detail.lastDownloaded)}`
          : "",
        detail.lastSubmitted
          ? `submitted=${formatDateTime(detail.lastSubmitted)}`
          : "",
      ].filter(Boolean);

      return `${detail.path}${status.length > 0 ? ` (${status.join(", ")})` : ""}`;
    }) ?? [];
  const lines = [
    stat.sitemapCount ? `sitemap count: ${stat.sitemapCount}` : "",
    ...sitemapDetailLines,
    downloadedAt
      ? `GSC 사이트맵 마지막 수집: ${formatDateTime(downloadedAt)}`
      : "GSC 사이트맵 마지막 수집 기록 없음",
    submittedAt ? `GSC 사이트맵 제출: ${formatDateTime(submittedAt)}` : "",
    stat.sitemapPath ? `사이트맵: ${stat.sitemapPath}` : "",
    stat.sitemapErrors !== undefined ? `오류: ${stat.sitemapErrors}` : "",
    stat.sitemapWarnings !== undefined ? `경고: ${stat.sitemapWarnings}` : "",
  ].filter(Boolean);

  return lines.join("\n");
}

function getSitemapCollectionClass(stat: EnrichedSiteStat): string {
  if (stat.sitemapError || !getSitemapCollectionValue(stat)) {
    return "collection-missing";
  }

  if (hasCleanPendingSitemap(stat)) {
    return "collection-processing";
  }

  if (
    stat.operationalStatus === "processing" ||
    isOlderThanDays(stat.sitemapLastDownloadedAt, SITEMAP_COLLECTION_LAG_DAYS) ||
    (stat.sitemapErrors ?? 0) > 0 ||
    (stat.sitemapWarnings ?? 0) > 0
  ) {
    return stat.operationalStatus === "processing"
      ? "collection-processing"
      : "collection-stale";
  }

  return "collection-fresh";
}

function getSitemapCollectionStatusLabel(stat: EnrichedSiteStat): string {
  if (stat.sitemapError) {
    return "오류";
  }
  if (!getSitemapCollectionValue(stat)) {
    return "미수집";
  }
  if (stat.operationalStatus === "processing") {
    return "재처리";
  }
  if (hasCleanPendingSitemap(stat)) {
    return "처리중";
  }
  if ((stat.sitemapErrors ?? 0) > 0 || (stat.sitemapWarnings ?? 0) > 0) {
    return "오류";
  }
  if (isOlderThanDays(stat.sitemapLastDownloadedAt, SITEMAP_COLLECTION_LAG_DAYS)) {
    return "오래됨";
  }

  return "정상";
}

function hasCleanPendingSitemap(stat: EnrichedSiteStat): boolean {
  if ((stat.sitemapErrors ?? 0) > 0 || (stat.sitemapWarnings ?? 0) > 0) {
    return false;
  }

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
