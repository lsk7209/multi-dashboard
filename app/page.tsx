import {
  DashboardTabs,
  type DashboardTabItem,
} from "./components/dashboard-tabs.js";
import { SiteStatsTable } from "./components/site-stats-table.js";
import {
  getDashboardData,
  type DashboardActionItem,
  type SiteInsight,
} from "./lib/dashboard-data.js";

export const dynamic = "force-static";

export default function DashboardPage() {
  const data = getDashboardData();
  const updatedAt = data.generatedAt
    ? new Date(data.generatedAt).toLocaleString("ko-KR")
    : "아직 수집 전";
  const tabs: DashboardTabItem[] = [
    {
      id: "overview",
      label: "오늘",
      panelLabel: "오늘",
      count: formatNumber(
        data.failedCount +
          data.trafficDropStats.length +
          data.monetizationIssueCount,
      ),
      content: <TodaySection data={data} />,
    },
    {
      id: "sites",
      label: "사이트",
      panelLabel: "사이트",
      count: formatNumber(data.siteCount),
      content: (
        <SiteStatsTable
          stats={data.stats}
          failedCount={data.failedCount}
          segments={data.segments}
        />
      ),
    },
    {
      id: "insights",
      label: "인사이트",
      panelLabel: "인사이트",
      count: formatNumber(data.insights.length),
      content: <InsightsSection data={data} />,
    },
    {
      id: "settings",
      label: "설정",
      panelLabel: "설정",
      content: <SupportPanel data={data} />,
    },
  ];

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">GA4 + GSC + AdSense Multi-Site Dashboard</p>
          <h1>사이트별 인사이트 대시보드</h1>
        </div>
        <div className="status-pill" aria-label="통계 스냅샷 생성 시각">
          {updatedAt}
        </div>
      </header>

      <DashboardTabs items={tabs} />
    </main>
  );
}

function TodaySection({
  data,
}: {
  data: ReturnType<typeof getDashboardData>;
}) {
  return (
    <>
      <div className="summary-grid priority-summary" aria-label="오늘 확인 요약">
        <StatusCard
          label="확인 필요"
          value={formatNumber(data.failedCount)}
          hint={`수집 지연 ${formatNumber(data.collectionStaleCount)}개`}
        />
        <StatusCard
          label="수익화 이슈"
          value={formatNumber(data.monetizationIssueCount)}
          hint={`코드 ${formatNumber(data.adsenseConnectedCount)}/${formatNumber(data.siteCount)} · ads.txt ${formatNumber(data.adsTxtConnectedCount)}/${formatNumber(data.siteCount)}`}
        />
        <StatusCard
          label="트래픽 급감"
          value={formatNumber(data.trafficDropStats.length)}
          hint="직전 7일 대비 -30% 이상"
        />
        <StatusCard
          label="GSC 연결"
          value={`${formatNumber(data.gscConnectedCount)}/${formatNumber(data.siteCount)}`}
          hint={`권한 확인 ${data.gscIssueStats.length}개`}
        />
        <StatusCard
          label="7일 사용자"
          value={formatNumber(data.totalLast7Days.activeUsers)}
          hint={formatChange(data.totalActiveUsersChange)}
        />
        <StatusCard
          label="최종 갱신"
          value={formatShortDateTime(data.generatedAt)}
          hint={`UTC 완료일 ${formatDateRange(data.dateRanges.last7Days)}`}
        />
      </div>
      <div className="operation-grid" aria-label="운영 우선순위">
        <ActionQueue actions={data.actions} />
        <HealthPanel data={data.healthSummary} />
      </div>
      <div className="issue-layout today-issue-layout" aria-label="오늘 문제 목록">
        <DailyIssuePanel
          stats={data.dailyIssueStats}
          staleCount={data.staleCount}
        />
        <MonetizationIssuePanel stats={data.monetizationIssueStats} />
        <GscIssuePanel stats={data.gscIssueStats} />
        <TrafficDropPanel stats={data.trafficDropStats} />
      </div>
    </>
  );
}

function InsightsSection({
  data,
}: {
  data: ReturnType<typeof getDashboardData>;
}) {
  return (
    <div className="insight-grid">
      <InsightPanel
        title="SEO 기회"
        description="노출 대비 CTR 또는 순위 개선 여지가 큰 사이트입니다."
        insights={data.seoInsights}
      />
      <InsightPanel
        title="성장 신호"
        description="최근 7일 사용자 증가가 두드러진 사이트입니다."
        insights={data.growthInsights}
      />
      <InsightPanel
        title="하락 신호"
        description="사용자나 검색 클릭이 감소한 사이트입니다."
        insights={data.declineInsights}
      />
      <InsightPanel
        title="우선 확인"
        description="권한, 급락, 색인 의심 신호를 모았습니다."
        insights={data.priorityInsights}
      />
    </div>
  );
}

function ActionQueue({ actions }: { actions: DashboardActionItem[] }) {
  return (
    <article className="panel action-panel">
      <div className="panel-heading">
        <div>
          <h2>오늘의 액션</h2>
          <p>
            권한, 급락, 수익화, CTR, 순위 개선 순서로 실제 조치 항목을 정렬했습니다.
          </p>
        </div>
        <span>{formatNumber(actions.length)}개</span>
      </div>
      {actions.length === 0 ? (
        <p className="muted-text">오늘 우선 조치할 항목이 없습니다.</p>
      ) : (
        <div className="action-list">
          {actions.map((action) => (
            <div className={`action-row action-${action.kind}`} key={action.id}>
              <span>{action.label}</span>
              <div>
                <strong>{action.siteName}</strong>
                <a href={action.url}>{formatHost(action.url)}</a>
                <p>{action.reason}</p>
                <em>{action.nextStep}</em>
              </div>
              <b>{action.value}</b>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function HealthPanel({
  data,
}: {
  data: ReturnType<typeof getDashboardData>["healthSummary"];
}) {
  return (
    <article className="panel health-panel">
      <div className="panel-heading">
        <div>
          <h2>운영 상태</h2>
          <p>수집 상태, 급락, 검색 품질을 합산한 사이트 건강도입니다.</p>
        </div>
      </div>
      <div
        className="health-ring"
        aria-label={`평균 운영 점수 ${data.averageScore}점`}
      >
        <strong>{data.averageScore}</strong>
        <span>평균 점수</span>
      </div>
      <div className="health-breakdown">
        <MiniMetric label="좋음" value={data.healthyCount} />
        <MiniMetric label="주의" value={data.warningCount} />
        <MiniMetric label="위험" value={data.criticalCount} />
      </div>
    </article>
  );
}

function GscIssuePanel({
  stats,
}: {
  stats: ReturnType<typeof getDashboardData>["gscIssueStats"];
}) {
  return (
    <article className="panel">
      <div className="panel-heading">
        <div>
          <h2>GSC 권한 확인 대상</h2>
          <p>
            Search Console에서 서비스 계정 권한을 추가해야 실제 GSC 지표가
            잡힙니다.
          </p>
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

function MonetizationIssuePanel({
  stats,
}: {
  stats: ReturnType<typeof getDashboardData>["monetizationIssueStats"];
}) {
  return (
    <article className="panel">
      <div className="panel-heading">
        <div>
          <h2>수익화 이슈</h2>
          <p>AdSense 코드와 ads.txt 상태를 분리해서 확인합니다.</p>
        </div>
        <span>{formatNumber(stats.length)}개</span>
      </div>
      {stats.length === 0 ? (
        <p className="muted-text">현재 수익화 상태 이슈가 없습니다.</p>
      ) : (
        <div className="issue-grid">
          {stats.map((stat) => (
            <div
              className="issue-row"
              key={`${stat.id}-${stat.ga4PropertyId}-monetization`}
            >
              <div>
                <strong>{stat.name}</strong>
                <a href={stat.url}>{formatHost(stat.url)}</a>
                <p>
                  {`AdSense ${getMonetizationLabel(stat.adsenseStatus)} · ads.txt ${getMonetizationLabel(stat.adsTxtStatus)}`}
                </p>
              </div>
              <span>{getMonetizationIssueLabel(stat)}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function TrafficDropPanel({
  stats,
}: {
  stats: ReturnType<typeof getDashboardData>["trafficDropStats"];
}) {
  return (
    <article className="panel">
      <div className="panel-heading">
        <div>
          <h2>트래픽 급감</h2>
          <p>직전 7일 대비 사용자가 30% 이상 감소한 사이트입니다.</p>
        </div>
        <span>{formatNumber(stats.length)}개</span>
      </div>
      {stats.length === 0 ? (
        <p className="muted-text">현재 급감 사이트가 없습니다.</p>
      ) : (
        <div className="issue-grid">
          {stats.map((stat) => (
            <div
              className="issue-row"
              key={`${stat.id}-${stat.ga4PropertyId}-drop`}
            >
              <div>
                <strong>{stat.name}</strong>
                <a href={stat.url}>{formatHost(stat.url)}</a>
                <p>{`GA4 사용자 ${formatChange(stat.trend.activeUsersChange)} · GSC 클릭 ${formatChange(stat.trend.gscClicksChange)}`}</p>
                <em>{getTrafficCauseDetail(stat)}</em>
              </div>
              <span>{getTrafficCauseLabel(stat)}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function DailyIssuePanel({
  stats,
  staleCount,
}: {
  stats: ReturnType<typeof getDashboardData>["dailyIssueStats"];
  staleCount: number;
}) {
  return (
    <article className="panel">
      <div className="panel-heading">
        <div>
          <h2>운영 문제</h2>
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
            <div
              className="issue-row"
              key={`${stat.id}-${stat.ga4PropertyId}-daily`}
            >
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

function SupportPanel({ data }: { data: ReturnType<typeof getDashboardData> }) {
  return (
    <section className="support-grid" aria-label="보조 정보">
      <article className="panel">
        <div className="panel-heading">
          <h2>전체 30일</h2>
          <span>{formatDateRange(data.dateRanges.last30Days)}</span>
        </div>
        <div className="metric-grid">
          <MiniMetric label="사용자" value={data.totalLast30Days.activeUsers} />
          <MiniMetric label="세션" value={data.totalLast30Days.sessions} />
          <MiniMetric
            label="조회수"
            value={data.totalLast30Days.screenPageViews}
          />
          <MiniMetric label="이벤트" value={data.totalLast30Days.eventCount} />
          <MiniMetric label="GSC 클릭" value={data.totalGscLast30Days.clicks} />
          <MiniMetric
            label="GSC 노출"
            value={data.totalGscLast30Days.impressions}
          />
        </div>
      </article>

      <article className="panel">
        <div className="panel-heading">
          <div>
            <h2>데이터 기준</h2>
            <p>모든 수치는 UTC 완료일 기준이며 오늘 데이터는 제외합니다.</p>
          </div>
        </div>
        <div className="command-list">
          <div className="command-row">
            <span>1일</span>
            <code>{formatDateRange(data.dateRanges.last1Days)}</code>
          </div>
          <div className="command-row">
            <span>7일</span>
            <code>{formatDateRange(data.dateRanges.last7Days)}</code>
          </div>
          <div className="command-row">
            <span>직전 7일</span>
            <code>{formatDateRange(data.dateRanges.previous7Days)}</code>
          </div>
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
  );
}

function InsightPanel({
  title,
  description,
  insights,
}: {
  title: string;
  description: string;
  insights: SiteInsight[];
}) {
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

function StatusCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
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

function formatDateRange(range: {
  startDate: string;
  endDate: string;
}): string {
  if (range.startDate === range.endDate) {
    return range.endDate;
  }

  return `${range.startDate}~${range.endDate}`;
}

function formatShortDateTime(value: string | null): string {
  if (!value) {
    return "미수집";
  }

  return new Date(value).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getErrorKindLabel(kind: string | undefined): string {
  if (kind === "permission") return "권한 없음";
  if (kind === "not_found") return "속성 없음";
  if (kind === "quota") return "할당량";
  if (kind === "missing_config") return "설정 누락";
  return "API 확인";
}

function getMonetizationLabel(kind: string | undefined): string {
  if (kind === "ok") return "정상";
  if (kind === "missing_config") return "없음";
  if (kind === "api_error" || kind === "auth_error") return "확인 실패";
  return "미수집";
}

function getMonetizationIssueLabel(
  stat: ReturnType<typeof getDashboardData>["stats"][number],
): string {
  if (stat.adsenseStatus === "missing_config") return "코드 없음";
  if (stat.adsTxtStatus === "missing_config") return "ads.txt 없음";
  return "확인 실패";
}

function getTrafficCauseLabel(
  stat: ReturnType<typeof getDashboardData>["stats"][number],
): string {
  const ga4Drop = (stat.trend.activeUsersChange ?? 0) <= -0.3;
  const gscDrop = (stat.trend.gscClicksChange ?? 0) <= -0.3;

  if (stat.operationalStatus !== "normal") return "수집 점검";
  if (ga4Drop && gscDrop) return "검색 하락";
  if (ga4Drop) return "검색 외 유입";
  if (gscDrop) return "검색 클릭";
  return "변동";
}

function getTrafficCauseDetail(
  stat: ReturnType<typeof getDashboardData>["stats"][number],
): string {
  const ga4Drop = (stat.trend.activeUsersChange ?? 0) <= -0.3;
  const gscDrop = (stat.trend.gscClicksChange ?? 0) <= -0.3;

  if (stat.operationalStatus !== "normal") {
    return "GA4/GSC 수집 상태가 정상인지 먼저 확인하세요.";
  }
  if (ga4Drop && gscDrop) {
    return "검색 유입 자체가 줄었을 가능성이 큽니다. 상위 쿼리와 색인 상태를 확인하세요.";
  }
  if (ga4Drop) {
    return "검색 클릭 하락은 크지 않습니다. 직접/추천/SNS 등 검색 외 채널을 확인하세요.";
  }
  if (gscDrop) {
    return "GA4 전체 사용자는 버티지만 검색 클릭이 줄었습니다. CTR과 평균순위를 확인하세요.";
  }
  return "단기 변동입니다. 7일 추세가 이어지는지 확인하세요.";
}
