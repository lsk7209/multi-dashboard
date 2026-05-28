import { getDashboardData, type EnrichedSiteStat, type SiteInsight } from "./lib/dashboard-data.js";

export const dynamic = "force-static";

export default function DashboardPage() {
  const data = getDashboardData();
  const sortedStats = [...data.stats].sort((a, b) => b.last7Days.activeUsers - a.last7Days.activeUsers);
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
        <StatusCard label="등록 사이트" value={formatNumber(data.siteCount)} hint="GA4 web stream 기준" />
        <StatusCard label="7일 GA4 사용자" value={formatNumber(data.totalLast7Days.activeUsers)} hint={formatChange(data.totalActiveUsersChange)} />
        <StatusCard label="7일 GSC 클릭" value={formatNumber(data.totalGscLast7Days.clicks)} hint={`${formatNumber(data.totalGscLast7Days.impressions)} 노출`} />
        <StatusCard label="확인 필요" value={formatNumber(data.priorityInsights.length)} hint={`${formatNumber(data.insights.length)}개 인사이트`} />
      </section>

      <section className="insight-grid" aria-label="핵심 인사이트">
        <InsightPanel title="우선 확인할 사이트" description="권한, 급락, 색인 의심 신호를 먼저 봅니다." insights={data.priorityInsights} />
        <InsightPanel title="SEO 기회" description="노출 대비 CTR 또는 순위 개선 여지가 큰 사이트입니다." insights={data.seoInsights} />
        <InsightPanel title="성장 신호" description="최근 7일 사용자 증가가 두드러진 사이트입니다." insights={data.growthInsights} />
        <InsightPanel title="하락 신호" description="사용자나 검색 클릭이 감소한 사이트입니다." insights={data.declineInsights} />
      </section>

      <section className="content-grid stats-layout">
        <article className="panel wide-panel stats-panel">
          <div className="panel-heading">
            <div>
              <h2>사이트별 GA4 + GSC 상세</h2>
              <p>GA4 사용자를 기준으로 정렬했습니다. 증감률은 직전 7일 대비입니다.</p>
            </div>
            <span>{data.failedCount > 0 ? `확인 필요 ${data.failedCount}개` : "정상"}</span>
          </div>
          <div className="stats-table-wrap">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>사이트</th>
                  <th>7일 사용자</th>
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
                {sortedStats.map((stat) => (
                  <StatsRow key={`${stat.id}-${stat.ga4PropertyId}`} stat={stat} />
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="side-stack">
          <article className="panel">
            <div className="panel-heading">
              <h2>전체 28일</h2>
            </div>
            <div className="metric-stack">
              <MiniMetric label="사용자" value={data.totalLast28Days.activeUsers} />
              <MiniMetric label="세션" value={data.totalLast28Days.sessions} />
              <MiniMetric label="조회수" value={data.totalLast28Days.screenPageViews} />
              <MiniMetric label="이벤트" value={data.totalLast28Days.eventCount} />
              <MiniMetric label="GSC 클릭" value={data.totalGscLast28Days.clicks} />
              <MiniMetric label="GSC 노출" value={data.totalGscLast28Days.impressions} />
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
        </aside>
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
        <a href={insight.url}>{insight.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>
      </div>
      <span>{insight.primaryValue}</span>
      <p>{insight.reason}</p>
      <em>{insight.recommendedAction}</em>
    </div>
  );
}

function StatsRow({ stat }: { stat: EnrichedSiteStat }) {
  return (
    <tr>
      <td>
        <div className="site-cell">
          <strong>{stat.name}</strong>
          <a href={stat.url}>{stat.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>
        </div>
      </td>
      <td>{formatNumber(stat.last7Days.activeUsers)}</td>
      <td>{formatChange(stat.trend.activeUsersChange)}</td>
      <td>{formatNumber(stat.last7Days.sessions)}</td>
      <td>{formatNumber(stat.last7Days.screenPageViews)}</td>
      <td>{formatNumber(stat.gscLast7Days?.clicks ?? 0)}</td>
      <td>{formatNumber(stat.gscLast7Days?.impressions ?? 0)}</td>
      <td>{formatPercent(stat.gscLast7Days?.ctr ?? 0)}</td>
      <td>{formatDecimal(stat.gscLast7Days?.position ?? 0)}</td>
      <td>
        <span className={stat.error || stat.gscError ? "badge badge-error" : "badge"}>
          {stat.error || stat.gscError ? "확인 필요" : "정상"}
        </span>
      </td>
    </tr>
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

function formatDecimal(value: number): string {
  return value === 0 ? "-" : value.toFixed(1);
}
