"use client";

import { useMemo, useState } from "react";
import type { DashboardSegment, EnrichedSiteStat, OperationalStatus, SegmentKey } from "../lib/dashboard-data.js";

type StatusFilter = "all" | OperationalStatus;
type SortKey = "priority" | "oneDayUsers" | "sevenDayUsers" | "thirtyDayUsers" | "change" | "gscClicks" | "gscImpressions" | "ctr" | "position";

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
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [segmentKey, setSegmentKey] = useState<SegmentKey | "all">("all");
  const [selectedSiteId, setSelectedSiteId] = useState("");

  const visibleStats = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const segmentIds = new Set(segments.find((segment) => segment.key === segmentKey)?.stats.map((stat) => stat.id) ?? []);

    return stats
      .filter((stat) => segmentKey === "all" || segmentIds.has(stat.id))
      .filter((stat) => matchesQuery(stat, normalizedQuery))
      .filter((stat) => matchesStatus(stat, statusFilter))
      .sort((a, b) => getSortValue(b, sortKey) - getSortValue(a, sortKey));
  }, [query, segmentKey, segments, sortKey, stats, statusFilter]);

  const selectedSite = visibleStats.find((stat) => stat.id === selectedSiteId) ?? visibleStats[0] ?? stats[0];

  return (
    <article className="panel wide-panel stats-panel">
      <div className="panel-heading stats-heading">
        <div>
          <h2>사이트 탐색</h2>
          <p>세그먼트, 상태, 검색어로 좁힌 뒤 사이트별 상세 진단을 봅니다.</p>
        </div>
        <span>{failedCount > 0 ? `확인 필요 ${failedCount}개` : "정상"}</span>
      </div>

      <SegmentTabs segments={segments} activeKey={segmentKey} totalCount={stats.length} onChange={setSegmentKey} />

      <div className="table-controls" aria-label="사이트 통계 필터">
        <label>
          <span>사이트 검색</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="도메인 또는 사이트명" />
        </label>
        <label>
          <span>상태</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
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

      <div className="explorer-grid">
        <div className="stats-table-wrap">
          <table className="stats-table">
            <thead>
              <tr>
                <th>사이트</th>
                <th>점수</th>
                <th>1일</th>
                <th>7일</th>
                <th>30일</th>
                <th>증감</th>
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
                  <td className="table-empty" colSpan={11}>
                    조건에 맞는 사이트가 없습니다.
                  </td>
                </tr>
              ) : (
                visibleStats.map((stat) => (
                  <StatsRow
                    key={`${stat.id}-${stat.ga4PropertyId}`}
                    stat={stat}
                    isSelected={stat.id === selectedSite?.id}
                    onSelect={() => setSelectedSiteId(stat.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {selectedSite ? <SiteDetailPanel stat={selectedSite} /> : null}
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
      <button className={activeKey === "all" ? "active" : ""} type="button" onClick={() => onChange("all")}>
        전체{" "}
        <strong>{formatNumber(totalCount)}</strong>
      </button>
      {segments.map((segment) => (
        <button className={activeKey === segment.key ? "active" : ""} key={segment.key} type="button" onClick={() => onChange(segment.key)}>
          {segment.label}{" "}
          <strong>{formatNumber(segment.count)}</strong>
        </button>
      ))}
    </div>
  );
}

function StatsRow({
  stat,
  isSelected,
  onSelect,
}: {
  stat: EnrichedSiteStat;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <tr className={isSelected ? "selected-row" : ""} onClick={onSelect}>
      <td>
        <div className="site-cell">
          <strong>{stat.name}</strong>
          <a href={stat.url} onClick={(event) => event.stopPropagation()}>
            {formatHost(stat.url)}
          </a>
        </div>
      </td>
      <td>
        <span className={getHealthClass(stat.health.grade)}>{stat.health.score}</span>
      </td>
      <td>{formatNumber(stat.last1Days.activeUsers)}</td>
      <td>{formatNumber(stat.last7Days.activeUsers)}</td>
      <td>{formatNumber(stat.last30Days.activeUsers)}</td>
      <td>{formatChange(stat.trend.activeUsersChange)}</td>
      <td>{formatNumber(stat.gscLast7Days?.clicks ?? 0)}</td>
      <td>{formatNumber(stat.gscLast7Days?.impressions ?? 0)}</td>
      <td>{formatPercent(stat.gscLast7Days?.ctr ?? 0)}</td>
      <td>{formatPosition(stat.gscLast7Days?.position ?? 0)}</td>
      <td>
        <span className={getBadgeClass(stat.operationalStatus)} title={stat.statusReason}>
          {stat.statusLabel}
        </span>
      </td>
    </tr>
  );
}

function SiteDetailPanel({ stat }: { stat: EnrichedSiteStat }) {
  return (
    <aside className="site-detail-panel" aria-label="선택 사이트 상세">
      <div className="detail-heading">
        <div>
          <h3>{stat.name}</h3>
          <a href={stat.url}>{formatHost(stat.url)}</a>
        </div>
        <span className={getHealthClass(stat.health.grade)}>{stat.health.score}</span>
      </div>
      <p className="detail-reason">{stat.health.reason}</p>

      <div className="detail-metrics">
        <MiniMetric label="7일 사용자" value={formatNumber(stat.last7Days.activeUsers)} />
        <MiniMetric label="30일 사용자" value={formatNumber(stat.last30Days.activeUsers)} />
        <MiniMetric label="GSC 클릭" value={formatNumber(stat.gscLast7Days?.clicks ?? 0)} />
        <MiniMetric label="GSC 노출" value={formatNumber(stat.gscLast7Days?.impressions ?? 0)} />
        <MiniMetric label="CTR" value={formatPercent(stat.gscLast7Days?.ctr ?? 0)} />
        <MiniMetric label="평균순위" value={formatPosition(stat.gscLast7Days?.position ?? 0)} />
      </div>

      <div className="detail-action">
        <strong>{stat.statusLabel}</strong>
        <p>{getNextStep(stat)}</p>
      </div>
    </aside>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function matchesQuery(stat: EnrichedSiteStat, normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return true;
  }

  return `${stat.name} ${stat.url}`.toLowerCase().includes(normalizedQuery);
}

function matchesStatus(stat: EnrichedSiteStat, statusFilter: StatusFilter): boolean {
  if (statusFilter === "all") {
    return true;
  }

  return stat.operationalStatus === statusFilter;
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

function getNextStep(stat: EnrichedSiteStat): string {
  if (stat.operationalStatus !== "normal") {
    return stat.statusReason;
  }
  if ((stat.trend.activeUsersChange ?? 0) <= -0.3) {
    return "사용자 급락 원인을 최근 발행, 색인, 유입 채널 순서로 확인하세요.";
  }
  if ((stat.gscLast7Days?.ctr ?? 0) < 0.02 && (stat.gscLast7Days?.impressions ?? 0) >= 100) {
    return "제목과 메타 설명을 먼저 개선하세요.";
  }
  return "현재는 큰 조치보다 성장 원인과 상위 페이지를 기록하세요.";
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

function formatPosition(value: number): string {
  return value === 0 ? "-" : value.toFixed(1);
}
