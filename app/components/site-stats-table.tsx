"use client";

import { useMemo, useState } from "react";
import type { EnrichedSiteStat } from "../lib/dashboard-data.js";

type StatusFilter = "all" | "issue" | "normal";
type SortKey = "oneDayUsers" | "sevenDayUsers" | "thirtyDayUsers" | "change" | "gscClicks" | "gscImpressions" | "ctr" | "position";

const sortLabels: Record<SortKey, string> = {
  oneDayUsers: "1일 사용자",
  sevenDayUsers: "7일 사용자",
  thirtyDayUsers: "30일 사용자",
  change: "증감률",
  gscClicks: "GSC 클릭",
  gscImpressions: "GSC 노출",
  ctr: "CTR",
  position: "평균순위",
};

export function SiteStatsTable({ stats, failedCount }: { stats: EnrichedSiteStat[]; failedCount: number }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("sevenDayUsers");

  const visibleStats = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return stats
      .filter((stat) => matchesQuery(stat, normalizedQuery))
      .filter((stat) => matchesStatus(stat, statusFilter))
      .sort((a, b) => getSortValue(b, sortKey) - getSortValue(a, sortKey));
  }, [query, sortKey, stats, statusFilter]);

  return (
    <article className="panel wide-panel stats-panel">
      <div className="panel-heading stats-heading">
        <div>
          <h2>사이트별 GA4 + GSC 상세</h2>
          <p>실제 GA4 사용자 기준으로 1일, 7일, 30일 흐름을 함께 봅니다.</p>
        </div>
        <span>{failedCount > 0 ? `확인 필요 ${failedCount}개` : "정상"}</span>
      </div>

      <div className="table-controls" aria-label="사이트 통계 필터">
        <label>
          <span>사이트 검색</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="도메인 또는 사이트명" />
        </label>
        <label>
          <span>상태</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            <option value="all">전체</option>
            <option value="issue">확인 필요</option>
            <option value="normal">정상</option>
          </select>
        </label>
        <label>
          <span>정렬</span>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
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
              <th>1일 사용자</th>
              <th>7일 사용자</th>
              <th>30일 사용자</th>
              <th>증감</th>
              <th>7일 세션</th>
              <th>7일 조회수</th>
              <th>GSC 클릭</th>
              <th>GSC 노출</th>
              <th>CTR</th>
              <th>평균순위</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {visibleStats.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={12}>
                  조건에 맞는 사이트가 없습니다.
                </td>
              </tr>
            ) : (
              visibleStats.map((stat) => <StatsRow key={`${stat.id}-${stat.ga4PropertyId}`} stat={stat} />)
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function StatsRow({ stat }: { stat: EnrichedSiteStat }) {
  const hasIssue = Boolean(stat.error || stat.gscError);

  return (
    <tr>
      <td>
        <div className="site-cell">
          <strong>{stat.name}</strong>
          <a href={stat.url}>{formatHost(stat.url)}</a>
        </div>
      </td>
      <td>{formatNumber(stat.last1Days.activeUsers)}</td>
      <td>{formatNumber(stat.last7Days.activeUsers)}</td>
      <td>{formatNumber(stat.last30Days.activeUsers)}</td>
      <td>{formatChange(stat.trend.activeUsersChange)}</td>
      <td>{formatNumber(stat.last7Days.sessions)}</td>
      <td>{formatNumber(stat.last7Days.screenPageViews)}</td>
      <td>{formatNumber(stat.gscLast7Days?.clicks ?? 0)}</td>
      <td>{formatNumber(stat.gscLast7Days?.impressions ?? 0)}</td>
      <td>{formatPercent(stat.gscLast7Days?.ctr ?? 0)}</td>
      <td>{formatPosition(stat.gscLast7Days?.position ?? 0)}</td>
      <td>
        <span className={hasIssue ? "badge badge-error" : "badge"}>{hasIssue ? "확인 필요" : "정상"}</span>
      </td>
    </tr>
  );
}

function matchesQuery(stat: EnrichedSiteStat, normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return true;
  }

  return `${stat.name} ${stat.url}`.toLowerCase().includes(normalizedQuery);
}

function matchesStatus(stat: EnrichedSiteStat, statusFilter: StatusFilter): boolean {
  const hasIssue = Boolean(stat.error || stat.gscError);
  if (statusFilter === "issue") {
    return hasIssue;
  }
  if (statusFilter === "normal") {
    return !hasIssue;
  }
  return true;
}

function getSortValue(stat: EnrichedSiteStat, sortKey: SortKey): number {
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

function formatPosition(value: number): string {
  return value === 0 ? "-" : value.toFixed(1);
}
