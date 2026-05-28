import { SiteStatsTable } from "./components/site-stats-table.js";
import { getDashboardData, type SiteInsight } from "./lib/dashboard-data.js";

export const dynamic = "force-static";

export default function DashboardPage() {
  const data = getDashboardData();
  const updatedAt = data.generatedAt ? new Date(data.generatedAt).toLocaleString("ko-KR") : "아직 수집 전";

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">GA4 + GSC Multi-Site Dashboard</p>
          <h1>사이트별 인사이트 대시보드</h1>
        </div>
        <div className="status-pill" aria-label="통계 스냅샷 생성 시각">
          {updatedAt}
        </div>
      </header>

      <section className="summary-grid" aria-label="전체 통계 요약">
        <StatusCard label="1일 사용자" value={formatNumber(data.totalLast1Days.activeUsers)} hint="어제 기준 실제 GA4" />
        <StatusCard label="7일 GA4 사용자" value={formatNumber(data.totalLast7Days.activeUsers)} hint={formatChange(data.totalActiveUsersChange)} />
        <StatusCard label="30일 사용자" value={formatNumber(data.totalLast30Days.activeUsers)} hint={`${formatNumber(data.siteCount)}개 사이트 합산`} />
        <StatusCard label="확인 필요" value={formatNumber(data.priorityInsights.length)} hint={`GSC 확인 ${data.failedCount}개`} />
      </section>

      <section className="insight-grid" aria-label="핵심 인사이트">
        <InsightPanel title="우선 확인할 사이트" description="권한, 급락, 색인 의심 신호를 먼저 봅니다." insights={data.priorityInsights} />
        <InsightPanel title="SEO 기회" description="노출 대비 CTR 또는 순위 개선 여지가 큰 사이트입니다." insights={data.seoInsights} />
        <InsightPanel title="성장 신호" description="최근 7일 사용자 증가가 두드러진 사이트입니다." insights={data.growthInsights} />
        <InsightPanel title="하락 신호" description="사용자나 검색 클릭이 감소한 사이트입니다." insights={data.declineInsights} />
      </section>

      <section className="stats-layout">
        <SiteStatsTable stats={data.stats} failedCount={data.failedCount} />
      </section>

      <section className="support-grid" aria-label="보조 정보">
        <article className="panel">
          <div className="panel-heading">
            <h2>전체 30일</h2>
          </div>
          <div className="metric-grid">
            <MiniMetric label="사용자" value={data.totalLast30Days.activeUsers} />
            <MiniMetric label="세션" value={data.totalLast30Days.sessions} />
            <MiniMetric label="조회수" value={data.totalLast30Days.screenPageViews} />
            <MiniMetric label="이벤트" value={data.totalLast30Days.eventCount} />
            <MiniMetric label="GSC 클릭" value={data.totalGscLast30Days.clicks} />
            <MiniMetric label="GSC 노출" value={data.totalGscLast30Days.impressions} />
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>갱신 명령</h2>
          </div>
          <div className="command-list">
            <div className="command-row">
              <span>GA4/GSC 통계 수집</span>
              <code>pnpm stats:update</code>
            </div>
            <div className="command-row">
              <span>사이트 재등록</span>
              <code>pnpm setup:import-ga4-sites -- --account=236349432</code>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

function InsightPanel({ title, description, insights }: { title: string; description: string; insights: SiteInsight[] }) {
  return (
    <article className="panel insight-panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span>{formatNumber(insights.length)}</span>
      </div>
      {insights.length === 0 ? (
        <p className="muted-text">현재 조건에 맞는 항목이 없습니다.</p>
      ) : (
        <div className="insight-list">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </article>
  );
}

function InsightCard({ insight }: { insight: SiteInsight }) {
  return (
    <div className={`insight-card severity-${insight.severity}`}>
      <div>
        <strong>{insight.siteName}</strong>
        <a href={insight.url}>{formatHost(insight.url)}</a>
      </div>
      <span>{insight.primaryValue}</span>
      <p>{insight.reason}</p>
      <em>{insight.recommendedAction}</em>
    </div>
  );
}

function StatusCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="status-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="mini-metric">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  );
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
