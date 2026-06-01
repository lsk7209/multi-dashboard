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
  | "priority"
  | "oneDayUsers"
  | "sevenDayUsers"
  | "thirtyDayUsers"
  | "change"
  | "gscClicks"
  | "gscImpressions"
  | "ctr"
  | "position";

const sortLabels: Record<SortKey, string> = {
  priority: "우선순위",
  oneDayUsers: "1일 사용자",
  sevenDayUsers: "7일 사용자",
  thirtyDayUsers: "30일 사용자",
  change: "증감률",
  gscClicks: "GSC 클릭",
  gscImpressions: "GSC 노출",
  ctr: "CTR",
  position: "평균순위",
};

const statusLabels: Record<StatusFilter, string> = {
  all: "전체",
  normal: "정상",
  needsPermission: "권한 필요",
  apiError: "API 실패",
  stale: "오래된 데이터",
};

const monetizationLabels: Record<MonetizationFilter, string> = {
  all: "전체",
  adsense_ok: "코드 연동",
  adsense_missing: "코드 없음",
  ads_txt_missing: "ads.txt 없음",
  monetization_issue: "수익화 이슈",
};

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
      .sort((a, b) => getSortValue(b, sortKey) - getSortValue(a, sortKey));
  }, [
    monetizationFilter,
    query,
    segmentKey,
    segments,
    sortKey,
    stats,
    statusFilter,
  ]);

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
            onChange={(event) => setSortKey(event.target.value as SortKey)}
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

      <div className="stats-table-wrap">
        <table className="stats-table">
          <thead>
            <tr>
              <th>사이트</th>
              <th>점수</th>
              <th>추세</th>
              <th>1일</th>
              <th>7일</th>
              <th>30일</th>
              <th>증감</th>
              <th>GSC 클릭</th>
              <th>GSC 노출</th>
              <th>CTR</th>
              <th>AdSense</th>
              <th>ads.txt</th>
              <th>평균순위</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {visibleStats.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={14}>
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
        <span
          className={getBadgeClass(stat.operationalStatus)}
          title={stat.statusReason}
        >
          {stat.statusLabel}
        </span>
      </td>
    </tr>
  );
}

function matchesQuery(
  stat: EnrichedSiteStat,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) {
    return true;
  }

  return `${stat.name} ${stat.url}`.toLowerCase().includes(normalizedQuery);
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

function getSortValue(stat: EnrichedSiteStat, sortKey: SortKey): number {
  if (sortKey === "priority") {
    return 100 - stat.health.score;
  }
  if (sortKey === "oneDayUsers") {
    return stat.last1Days.activeUsers;
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
  if (sortKey === "ctr") {
    return stat.gscLast7Days?.ctr ?? 0;
  }
  if (sortKey === "position") {
    const position = stat.gscLast7Days?.position ?? 0;
    return position === 0 ? Number.NEGATIVE_INFINITY : -position;
  }
  return stat.last7Days.activeUsers;
}

function getBadgeClass(status: EnrichedSiteStat["operationalStatus"]): string {
  if (status === "needsPermission") {
    return "badge badge-error";
  }

  if (status === "apiError" || status === "stale") {
    return "badge badge-warning";
  }

  return "badge";
}

function getAdsenseStatusLabel(
  status: EnrichedSiteStat["adsenseStatus"],
): string {
  if (status === "ok") {
    return "정상";
  }
  if (status === "missing_config") {
    return "코드 없음";
  }
  if (status === "auth_error" || status === "api_error") {
    return "확인 실패";
  }
  return "미수집";
}

function getAdsenseStatusTitle(stat: EnrichedSiteStat): string {
  if (stat.adsenseStatus === "ok") {
    return "홈페이지에서 AdSense 코드가 확인됐습니다.";
  }
  if (stat.adsenseError) {
    return stat.adsenseError;
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
    return "확인 실패";
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
