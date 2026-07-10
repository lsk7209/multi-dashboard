"use client";

import { useMemo, useState } from "react";
import type { SiteInsight } from "../lib/dashboard-data";

type InsightKindFilter = "all" | SiteInsight["kind"];
type InsightCauseFilter = "all" | SiteInsight["cause"];
type InsightSeverityFilter = "all" | SiteInsight["severity"];
type InsightSampleSizeFilter = "all" | SiteInsight["sampleSize"];

type InsightRollup = {
  siteId: string;
  siteName: string;
  url: string;
  insights: SiteInsight[];
  highCount: number;
  primary: SiteInsight;
  causes: string[];
  nextGate: string;
};

export function InsightExplorer({
  allInsights,
  seoInsights,
  growthInsights,
  declineInsights,
  priorityInsights,
  isReadOnlyBlocked,
}: {
  allInsights: SiteInsight[];
  seoInsights: SiteInsight[];
  growthInsights: SiteInsight[];
  declineInsights: SiteInsight[];
  priorityInsights: SiteInsight[];
  isReadOnlyBlocked: boolean;
}) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<InsightSeverityFilter>("all");
  const [kind, setKind] = useState<InsightKindFilter>("all");
  const [cause, setCause] = useState<InsightCauseFilter>("all");
  const [sampleSize, setSampleSize] = useState<InsightSampleSizeFilter>("all");

  const filters = useMemo(
    () => ({ query, severity, kind, cause, sampleSize }),
    [cause, kind, query, sampleSize, severity],
  );
  const filteredAllInsights = useMemo(
    () => filterInsights(allInsights, filters),
    [allInsights, filters],
  );
  const siteRollups = useMemo(
    () => buildSiteRollups(filteredAllInsights).slice(0, 8),
    [filteredAllInsights],
  );

  const visibleSeoInsights = useMemo(
    () => filterInsights(seoInsights, filters),
    [filters, seoInsights],
  );
  const visibleGrowthInsights = useMemo(
    () => filterInsights(growthInsights, filters),
    [filters, growthInsights],
  );
  const visibleDeclineInsights = useMemo(
    () => filterInsights(declineInsights, filters),
    [declineInsights, filters],
  );
  const visiblePriorityInsights = useMemo(
    () => filterInsights(priorityInsights, filters),
    [filters, priorityInsights],
  );

  return (
    <section className="insight-explorer" aria-label="인사이트 탐색">
      <article className="panel insight-control-panel">
        <div className="panel-heading">
          <div>
            <h2>인사이트 필터</h2>
            <p>원인, 심각도, 표본 규모, 사이트명으로 실행 후보를 좁힙니다.</p>
          </div>
          <span>
            {formatNumber(filteredAllInsights.length)}/{formatNumber(allInsights.length)}
          </span>
        </div>
        <div className="insight-filter-grid">
          <label>
            <span>검색</span>
            <input
              aria-label="사이트나 이유 검색"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="사이트, 원인, 쿼리"
              type="search"
              value={query}
            />
          </label>
          <label>
            <span>심각도</span>
            <select
              aria-label="심각도 필터"
              onChange={(event) =>
                setSeverity(event.target.value as InsightSeverityFilter)
              }
              value={severity}
            >
              <option value="all">전체</option>
              <option value="high">높음</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>
          </label>
          <label>
            <span>종류</span>
            <select
              aria-label="인사이트 종류 필터"
              onChange={(event) => setKind(event.target.value as InsightKindFilter)}
              value={kind}
            >
              <option value="all">전체</option>
              <option value="indexingOrPermissionIssue">GSC 0/색인</option>
              <option value="decline">하락</option>
              <option value="seoOpportunity">CTR</option>
              <option value="rankingOpportunity">순위</option>
              <option value="growth">성장</option>
              <option value="trafficMismatch">유입 불일치</option>
              <option value="duplicateProperty">중복</option>
            </select>
          </label>
          <label>
            <span>원인</span>
            <select
              aria-label="원인 필터"
              onChange={(event) => setCause(event.target.value as InsightCauseFilter)}
              value={cause}
            >
              <option value="all">전체</option>
              <option value="gsc_zero">GSC 0</option>
              <option value="ga4_drop">GA4 하락</option>
              <option value="gsc_drop">GSC 하락</option>
              <option value="mixed_decline">복합 하락</option>
              <option value="ctr">CTR</option>
              <option value="ranking">순위</option>
              <option value="growth">성장</option>
              <option value="traffic_mismatch">유입 불일치</option>
              <option value="duplicate">중복</option>
              <option value="gsc_error">GSC 오류</option>
            </select>
          </label>
          <label>
            <span>표본</span>
            <select
              aria-label="표본 규모 필터"
              onChange={(event) =>
                setSampleSize(event.target.value as InsightSampleSizeFilter)
              }
              value={sampleSize}
            >
              <option value="all">전체</option>
              <option value="high">큼</option>
              <option value="medium">보통</option>
              <option value="low">작음</option>
            </select>
          </label>
        </div>
      </article>

      <article className="panel insight-rollup-panel">
        <div className="panel-heading">
          <div>
            <h2>사이트별 롤업</h2>
            <p>여러 신호가 겹친 사이트를 먼저 볼 수 있게 묶었습니다.</p>
          </div>
          <span>{formatNumber(siteRollups.length)}개</span>
        </div>
        {siteRollups.length === 0 ? (
          <p className="muted-text">현재 필터에 맞는 사이트가 없습니다.</p>
        ) : (
          <div className="insight-rollup-list">
            {siteRollups.map((rollup) => (
              <article className="insight-rollup-card" key={rollup.siteId}>
                <div>
                  <strong>{rollup.siteName}</strong>
                  <a href={rollup.url}>{formatHost(rollup.url)}</a>
                </div>
                <span>{formatNumber(rollup.insights.length)}개 신호</span>
                <p>{rollup.primary.reason}</p>
                <div className="insight-chip-list">
                  {rollup.causes.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <em>{rollup.nextGate}</em>
              </article>
            ))}
          </div>
        )}
      </article>

      <div
        className="insight-grid"
        data-actionability={isReadOnlyBlocked ? "read-only-blocked" : "safe-to-act"}
      >
        <InsightPanel
          title="SEO 기회"
          description={
            isReadOnlyBlocked
              ? "노출 대비 CTR 또는 순위 개선 여지가 큰 읽기 전용 검토 후보입니다."
              : "노출 대비 CTR 또는 순위 개선 여지가 큰 사이트입니다."
          }
          insights={visibleSeoInsights}
          totalCount={seoInsights.length}
          unfilteredCount={allInsights.length}
          isReadOnlyBlocked={isReadOnlyBlocked}
        />
        <InsightPanel
          title="성장 신호"
          description={
            isReadOnlyBlocked
              ? "최근 7일 사용자 증가가 두드러진 읽기 전용 검토 후보입니다."
              : "최근 7일 사용자 증가가 두드러진 사이트입니다."
          }
          insights={visibleGrowthInsights}
          totalCount={growthInsights.length}
          unfilteredCount={allInsights.length}
          isReadOnlyBlocked={isReadOnlyBlocked}
        />
        <InsightPanel
          title="하락 신호"
          description={
            isReadOnlyBlocked
              ? "사용자나 검색 클릭이 감소한 읽기 전용 검토 후보입니다."
              : "사용자나 검색 클릭이 감소한 사이트입니다."
          }
          insights={visibleDeclineInsights}
          totalCount={declineInsights.length}
          unfilteredCount={allInsights.length}
          isReadOnlyBlocked={isReadOnlyBlocked}
        />
        <InsightPanel
          title="우선 확인"
          description={
            isReadOnlyBlocked
              ? "권한, 급락, 색인 의심 신호를 읽기 전용으로 모았습니다."
              : "권한, 급락, 색인 의심 신호를 모았습니다."
          }
          insights={visiblePriorityInsights}
          totalCount={priorityInsights.length}
          unfilteredCount={allInsights.length}
          isReadOnlyBlocked={isReadOnlyBlocked}
        />
      </div>
    </section>
  );
}

function InsightPanel({
  title,
  description,
  insights,
  totalCount,
  unfilteredCount,
  isReadOnlyBlocked,
}: {
  title: string;
  description: string;
  insights: SiteInsight[];
  totalCount: number;
  unfilteredCount: number;
  isReadOnlyBlocked: boolean;
}) {
  const hiddenCount = Math.max(totalCount - insights.length, 0);

  return (
    <article className="panel insight-panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span>
          {formatNumber(insights.length)}/{formatNumber(totalCount)}
        </span>
      </div>
      <div className="insight-panel-meta" aria-label={`${title} 표시 상태`}>
        <span>{hiddenCount > 0 ? `필터 숨김 ${formatNumber(hiddenCount)}개` : "전체 표시"}</span>
        <span>전체 인사이트 {formatNumber(unfilteredCount)}개</span>
        <span>{isReadOnlyBlocked ? "read-only" : "actionable"}</span>
      </div>
      {insights.length === 0 ? (
        <p className="muted-text">현재 조건에 맞는 항목이 없습니다.</p>
      ) : (
        <div className="insight-list">
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              isReadOnlyBlocked={isReadOnlyBlocked}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function InsightCard({
  insight,
  isReadOnlyBlocked,
}: {
  insight: SiteInsight;
  isReadOnlyBlocked: boolean;
}) {
  return (
    <div className={`insight-card severity-${insight.severity}`}>
      <div className="insight-card-title">
        <strong>{insight.siteName}</strong>
        <a href={insight.url}>{formatHost(insight.url)}</a>
      </div>
      <span className="insight-value">{insight.primaryValue}</span>
      <div className="insight-meta-row">
        <span>{getInsightCauseLabel(insight.cause)}</span>
        <span>{getInsightConfidenceLabel(insight.confidence)}</span>
        <span>{getInsightSampleSizeLabel(insight.sampleSize)}</span>
        <span>{getInsightSeverityLabel(insight.severity)}</span>
      </div>
      <p className="insight-reason">{insight.reason}</p>
      <em className="insight-action">
        {isReadOnlyBlocked ? "읽기 전용 권고 검토" : insight.recommendedAction}
      </em>
      <div className="insight-detail">
        <strong>작업 근거</strong>
        <ul>
          {insight.evidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      {insight.relatedSignals.length > 0 ? (
        <div className="insight-detail">
          <strong>같이 걸린 신호</strong>
          <div className="insight-chip-list">
            {insight.relatedSignals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="insight-detail">
        <strong>GSC 진단</strong>
        <p>{insight.gscDiagnosis}</p>
      </div>
      {insight.topQueries.length > 0 ? (
        <div className="insight-detail">
          <strong>상위 쿼리 후보</strong>
          <ul className="insight-query-list">
            {insight.topQueries.map((query) => (
              <li key={query.query}>
                <b>{query.query}</b>
                <span>
                  클릭 {formatNumber(query.clicks)} · 노출{" "}
                  {formatNumber(query.impressions)} · CTR{" "}
                  {formatPercent(query.ctr)} · {formatDecimal(query.position)}위
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="insight-detail">
        <strong>
          {isReadOnlyBlocked ? "읽기 전용 검토 메모" : "Codex/Claude 작업 지시"}
        </strong>
        <p className="insight-prompt">
          {isReadOnlyBlocked
            ? "post-recovery 통과 전 실행 금지. 원인과 근거만 검토하고 작업 지시는 표시하지 않습니다."
            : insight.operatorPrompt}
        </p>
      </div>
      <div className="insight-detail">
        <strong>검증 기준</strong>
        <p>{insight.verification}</p>
      </div>
      <div className="insight-detail insight-review">
        <strong>검토 메모</strong>
        <p>{insight.reviewNote}</p>
      </div>
    </div>
  );
}

function buildSiteRollups(insights: SiteInsight[]): InsightRollup[] {
  const bySite = new Map<string, SiteInsight[]>();
  for (const insight of insights) {
    bySite.set(insight.siteId, [...(bySite.get(insight.siteId) ?? []), insight]);
  }

  return [...bySite.entries()]
    .flatMap(([siteId, siteInsights]) => {
      const sorted = [...siteInsights].sort(compareInsights);
      const primary = sorted[0];
      if (!primary) {
        return [];
      }
      const causes = [
        ...new Set(sorted.map((insight) => getInsightCauseLabel(insight.cause))),
      ].slice(0, 4);
      return [{
        siteId,
        siteName: primary.siteName,
        url: primary.url,
        insights: sorted,
        highCount: sorted.filter((insight) => insight.severity === "high").length,
        primary,
        causes,
        nextGate: getRollupNextGate(sorted),
      }];
    })
    .sort((a, b) => {
      if (b.highCount !== a.highCount) return b.highCount - a.highCount;
      if (b.insights.length !== a.insights.length) return b.insights.length - a.insights.length;
      return compareInsights(a.primary, b.primary);
    });
}

function filterInsights(
  insights: SiteInsight[],
  filters: {
    query: string;
    severity: InsightSeverityFilter;
    kind: InsightKindFilter;
    cause: InsightCauseFilter;
    sampleSize: InsightSampleSizeFilter;
  },
): SiteInsight[] {
  const normalizedQuery = filters.query.trim().toLowerCase();
  return insights.filter((insight) => {
    if (filters.severity !== "all" && insight.severity !== filters.severity) {
      return false;
    }
    if (filters.kind !== "all" && insight.kind !== filters.kind) {
      return false;
    }
    if (filters.cause !== "all" && insight.cause !== filters.cause) {
      return false;
    }
    if (filters.sampleSize !== "all" && insight.sampleSize !== filters.sampleSize) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    return [
      insight.siteId,
      insight.siteName,
      insight.url,
      insight.reason,
      insight.recommendedAction,
      insight.primaryValue,
      insight.gscDiagnosis,
      ...insight.evidence,
      ...insight.relatedSignals,
      ...insight.topQueries.map((query) => query.query),
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function compareInsights(a: SiteInsight, b: SiteInsight): number {
  const severityDiff = severityRank(b.severity) - severityRank(a.severity);
  if (severityDiff !== 0) return severityDiff;
  const sampleDiff = sampleRank(b.sampleSize) - sampleRank(a.sampleSize);
  if (sampleDiff !== 0) return sampleDiff;
  return confidenceRank(b.confidence) - confidenceRank(a.confidence);
}

function getRollupNextGate(insights: SiteInsight[]): string {
  if (insights.some((insight) => insight.cause === "gsc_zero")) {
    return "먼저 GSC property, sitemap, canonical, robots를 확인";
  }
  if (insights.some((insight) => insight.cause === "mixed_decline")) {
    return "GA4 채널과 GSC 쿼리 하락을 같이 분해";
  }
  if (insights.some((insight) => insight.cause === "gsc_drop")) {
    return "상위 쿼리와 페이지 CTR/순위 하락 확인";
  }
  if (insights.some((insight) => insight.cause === "ga4_drop")) {
    return "최근 발행/수집/API/채널 변동 확인";
  }
  if (insights.some((insight) => insight.cause === "ctr")) {
    return "상위 쿼리 기준 title/meta 개선 후보";
  }
  if (insights.some((insight) => insight.cause === "ranking")) {
    return "FAQ/내부링크/최신성 보강 후보";
  }
  return "관련 신호를 묶어 원인부터 확인";
}

function getInsightCauseLabel(cause: SiteInsight["cause"]): string {
  switch (cause) {
    case "ga4_drop":
      return "GA4 하락";
    case "gsc_drop":
      return "GSC 하락";
    case "mixed_decline":
      return "복합 하락";
    case "gsc_zero":
      return "GSC 0";
    case "gsc_error":
      return "GSC 오류";
    case "ctr":
      return "CTR";
    case "ranking":
      return "순위";
    case "growth":
      return "성장";
    case "traffic_mismatch":
      return "유입 불일치";
    case "duplicate":
      return "중복";
  }
}

function getInsightConfidenceLabel(confidence: SiteInsight["confidence"]): string {
  return `신뢰도 ${confidence === "high" ? "높음" : confidence === "medium" ? "보통" : "낮음"}`;
}

function getInsightSampleSizeLabel(sampleSize: SiteInsight["sampleSize"]): string {
  return `표본 ${sampleSize === "high" ? "큼" : sampleSize === "medium" ? "보통" : "작음"}`;
}

function getInsightSeverityLabel(severity: SiteInsight["severity"]): string {
  return severity === "high" ? "우선" : severity === "medium" ? "검토" : "관찰";
}

function severityRank(severity: SiteInsight["severity"]): number {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function sampleRank(sampleSize: SiteInsight["sampleSize"]): number {
  if (sampleSize === "high") return 3;
  if (sampleSize === "medium") return 2;
  return 1;
}

function confidenceRank(confidence: SiteInsight["confidence"]): number {
  if (confidence === "high") return 3;
  if (confidence === "medium") return 2;
  return 1;
}

function formatHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDecimal(value: number): string {
  return value.toFixed(1);
}
