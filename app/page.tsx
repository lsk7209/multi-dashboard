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
        <StatusCard label="1일 사용자" value={formatNumber(data.totalLast1Days.activeUsers)} hint={formatDateRange(data.dateRanges.last1Days)} />
        <StatusCard label="7일 GA4 사용자" value={formatNumber(data.totalLast7Days.activeUsers)} hint={`${formatDateRange(data.dateRanges.last7Days)} · ${formatChange(data.totalActiveUsersChange)}`} />
        <StatusCard label="30일 사용자" value={formatNumber(data.totalLast30Days.activeUsers)} hint={`${formatNumber(data.siteCount)}개 · ${formatDateRange(data.dateRanges.last30Days)}`} />
        <StatusCard label="GSC 연결" value={`${formatNumber(data.gscConnectedCount)}/${formatNumber(data.siteCount)}`} hint={`권한 확인 ${data.gscIssueStats.length}개`} />
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

      <section className="stats-layout">
        <DailyIssuePanel stats={data.dailyIssueStats} staleCount={data.staleCount} />
      </section>

      <section className="support-grid" aria-label="보조 정보">
        <article className="panel">
          <div className="panel-heading">
            <h2>전체 30일</h2>
            <span>{formatDateRange(data.dateRanges.last30Days)}</span>
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
            <div>
              <h2>갱신 명령</h2>
              <p>기준: UTC 완료일, 오늘 제외</p>
            </div>
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

      <section className="stats-layout">
        <GscIssuePanel stats={data.gscIssueStats} />
      </section>
    </main>
  );
}

function GscIssuePanel({ stats }: { stats: ReturnType<typeof getDashboardData>["gscIssueStats"] }) {
  return (
    <article className="panel">
      <div className="panel-heading">
        <div>
          <h2>GSC 권한 확인 대상</h2>
          <p>Search Console에서 서비스 계정 권한을 추가해야 실제 GSC 지표가 잡힙니다.</p>
        </div>
        <span>{formatNumber(stats.length)}개</span>
      </div>
      {stats.length === 0 ? (
        <p className="muted-text">현재 GSC 권한 오류가 없습니다.</p>
      ) : (
        <div className="issue-grid">
          {stats.map((stat) => (
            <div className="issue-row" key={`${stat.id}-${stat.ga4PropertyId}`}>
              <div>
                <strong>{stat.name}</strong>
                <a href={stat.url}>{stat.gscSiteUrl ?? stat.url}</a>
                <p>{stat.statusReason}</p>
              </div>
              <span>{getErrorKindLabel(stat.gscErrorKind)}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function DailyIssuePanel({ stats, staleCount }: { stats: ReturnType<typeof getDashboardData>["dailyIssueStats"]; staleCount: number }) {
  return (
    <article className="panel">
      <div className="panel-heading">
        <div>
          <h2>오늘 볼 문제 사이트</h2>
          <p>권한, API 실패, 48시간 이상 오래된 데이터를 먼저 확인합니다.</p>
        </div>
        <span>
          {formatNumber(stats.length)}개 · 오래됨 {formatNumber(staleCount)}개
        </span>
      </div>
      {stats.length === 0 ? (
        <p className="muted-text">현재 운영 상태 오류가 없습니다.</p>
      ) : (
        <div className="issue-grid">
          {stats.map((stat) => (
            <div className="issue-row" key={`${stat.id}-${stat.ga4PropertyId}-daily`}>
              <div>
                <strong>{stat.name}</strong>
                <a href={stat.url}>{formatHost(stat.url)}</a>
                <p>{stat.statusReason}</p>
              </div>
              <span>{stat.statusLabel}</span>
            </div>
          ))}
        </div>
      )}
    </article>
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

function formatDateRange(range: { startDate: string; endDate: string }): string {
  if (range.startDate === range.endDate) {
    return range.endDate;
  }

  return `${range.startDate}~${range.endDate}`;
}

function getErrorKindLabel(kind: string | undefined): string {
  if (kind === "permission") return "권한 없음";
  if (kind === "not_found") return "속성 없음";
  if (kind === "quota") return "할당량";
  if (kind === "missing_config") return "설정 누락";
  return "API 확인";
}
