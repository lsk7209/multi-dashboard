import {
  DashboardTabs,
  type DashboardTabItem,
} from "./components/dashboard-tabs.js";
import { AppHeader } from "./components/app-header.js";
import { BannerManagementConsole } from "./components/banner-management-console.js";
import { InsightExplorer } from "./components/insight-explorer.js";
import { SiteStatsTable } from "./components/site-stats-table.js";
import {
  getDashboardActionability,
  type DashboardActionability,
  type DashboardActionabilityOptions,
} from "./lib/dashboard-actionability.js";
import { hasValidDashboardLocalEvidenceToken } from "./lib/dashboard-local-evidence-token.js";
import {
  getDashboardData,
  type DashboardActionItem,
  type FleetOptimizationChainArtifactStatus,
  type FleetOptimizationChainSummary,
  type GscPermissionAuditSummary,
} from "./lib/dashboard-data.js";
import { describeRefreshFailureSource } from "./lib/refresh-failure-details.js";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps = {}) {
  const data = getDashboardData();
  const params = await searchParams;
  const actionabilityOptions = getActionabilityOptions(params);
  const actionability = getDashboardActionability(data, actionabilityOptions);
  const updatedAt = formatSnapshotDateTime(data.generatedAt);
  const tabs: DashboardTabItem[] = [
    {
      id: "overview",
      label: "오늘",
      panelLabel: "오늘",
      count: formatNumber(data.failedCount + data.trafficDropStats.length + data.monetizationIssueCount),
      content: <TodaySection data={data} actionabilityOptions={actionabilityOptions} />,
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
          readOnlyBlocked={
            actionability.status === "blocked_for_action_until_post_recovery_verify"
          }
        />
      ),
    },
    {
      id: "insights",
      label: "인사이트",
      panelLabel: "인사이트",
      count: formatNumber(data.insights.length),
      content: <InsightsSection data={data} actionabilityOptions={actionabilityOptions} />,
    },
    {
      id: "banners",
      label: "배너",
      panelLabel: "배너",
      content: <BannerSection data={data} actionabilityOptions={actionabilityOptions} />,
    },
    {
      id: "settings",
      label: "설정",
      panelLabel: "설정",
      content: <SupportPanel data={data} actionabilityOptions={actionabilityOptions} />,
    },
  ];

  return (
    <main className="dashboard-shell">
      <AppHeader
        active="dashboard"
        eyebrow="GA4 + GSC + AdSense 멀티 사이트 대시보드"
        status={updatedAt}
        title="멀티 사이트 운영 대시보드"
      />

      <DashboardReadinessBanner
        data={data}
        actionability={actionability}
        gscHandoffStatus={data.gscPermissionAudit?.handoffStatus ?? null}
      />

      <DashboardTabs items={tabs} />
    </main>
  );
}

function DashboardReadinessBanner({
  data,
  actionability,
  gscHandoffStatus,
}: {
  data: ReturnType<typeof getDashboardData>;
  actionability: DashboardActionability;
  gscHandoffStatus: GscPermissionAuditSummary["handoffStatus"] | null;
}) {
  const isReady = actionability.status === "safe_to_act";

  return (
    <section
      className={`readiness-banner ${isReady ? "readiness-ready" : "readiness-blocked"}`}
      data-actionability={isReady ? "safe-to-act" : "read-only-blocked"}
      aria-label="대시보드 실행 준비 상태"
    >
      <div>
        <strong>{isReady ? "실행 가능 상태" : "읽기 전용 상태"}</strong>
        <p>
          {isReady
            ? "현재 스냅샷과 post-recovery 검증이 맞아 대시보드 권고를 실행 후보로 사용할 수 있습니다."
            : "post-recovery 검증이 통과하기 전까지 권고는 원인 확인용으로만 사용합니다."}
        </p>
      </div>
      <div className="readiness-banner-meta">
        <code>{actionability.status}</code>
        <code>{`snapshot ${data.generatedAt ?? "missing"}`}</code>
        <code>{`gsc handoff ${gscHandoffStatus ?? "missing"}`}</code>
        <code>{actionability.command}</code>
      </div>
    </section>
  );
}

function TodaySection({
  data,
  actionabilityOptions,
}: {
  data: ReturnType<typeof getDashboardData>;
  actionabilityOptions: DashboardActionabilityOptions;
}) {
  const actionability = getDashboardActionability(data, actionabilityOptions);
  return (
    <>
      <div className="summary-grid priority-summary" aria-label="오늘 확인 요약">
        <StatusCard
          label="확인 필요"
          value={formatNumber(data.failedCount)}
          hint={`재처리 ${formatNumber(data.processingCount)}개 · 수집 지연 ${formatNumber(data.collectionStaleCount)}개`}
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
          hint={`권한 확인 ${data.gscIssueStats.length}개 · 중복 숨김 ${formatNumber(data.hiddenDuplicateCount)}개`}
        />
        <StatusCard
          label="7일 사용자"
          value={formatNumber(data.totalLast7Days.activeUsers)}
          hint={formatChange(data.totalActiveUsersChange)}
        />
        <StatusCard
          label="최종 갱신"
          value={formatShortDateTime(data.generatedAt)}
          hint={`한국시간 완료일 ${formatDateRange(data.dateRanges.last7Days)}`}
        />
      </div>
      <div className="operation-grid" aria-label="운영 우선순위">
        <ActionQueue
          actions={data.actions}
          actionability={actionability}
          gscHandoffStatus={data.gscPermissionAudit?.handoffStatus ?? null}
        />
        <CollectionReliabilityPanel summaries={data.collectionSummary} />
        <HealthPanel data={data.healthSummary} />
      </div>
      <FleetWorkflowPanel data={data} actionabilityOptions={actionabilityOptions} />
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
  actionabilityOptions,
}: {
  data: ReturnType<typeof getDashboardData>;
  actionabilityOptions: DashboardActionabilityOptions;
}) {
  const actionability = getDashboardActionability(data, actionabilityOptions);
  const isReadOnlyBlocked =
    actionability.status === "blocked_for_action_until_post_recovery_verify";
  return (
    <>
      <DashboardActionabilityNotice
        actionability={actionability}
        gscHandoffStatus={data.gscPermissionAudit?.handoffStatus ?? null}
      />
      <InsightExplorer
        allInsights={data.insights}
        seoInsights={data.seoInsights}
        growthInsights={data.growthInsights}
        declineInsights={data.declineInsights}
        priorityInsights={data.priorityInsights}
        isReadOnlyBlocked={isReadOnlyBlocked}
      />
    </>
  );
}

function BannerSection({
  data,
  actionabilityOptions,
}: {
  data: ReturnType<typeof getDashboardData>;
  actionabilityOptions: DashboardActionabilityOptions;
}) {
  const actionability = getDashboardActionability(data, actionabilityOptions);
  const isReadOnlyBlocked =
    actionability.status === "blocked_for_action_until_post_recovery_verify";

  if (!isReadOnlyBlocked) {
    return <BannerManagementConsole />;
  }

  return (
    <article className="panel">
      <div className="panel-heading">
        <div>
          <h2>읽기 전용 배너 점검</h2>
          <p>post-recovery 통과 전에는 배너 등록, 실제 제출, 외부 갱신 명령을 숨깁니다.</p>
        </div>
        <span>read-only</span>
      </div>
      <DashboardActionabilityNotice
        actionability={actionability}
        gscHandoffStatus={data.gscPermissionAudit?.handoffStatus ?? null}
      />
      <div className="command-list">
        <div className="command-row">
          <span>현재 상태</span>
          <code>read-only until post-recovery passes</code>
        </div>
        <div className="command-row">
          <span>필수 검증</span>
          <code>{actionability.command}</code>
        </div>
        <div className="command-row">
          <span>외부 작업</span>
          <code>read-only until post-recovery passes</code>
        </div>
      </div>
    </article>
  );
}

function FleetWorkflowPanel({
  data,
  actionabilityOptions,
}: {
  data: ReturnType<typeof getDashboardData>;
  actionabilityOptions: DashboardActionabilityOptions;
}) {
  const chain = data.fleetOptimizationChain;
  const chainStatus = data.fleetOptimizationChainStatus;
  const handoff = data.t3TitleContentHandoff;
  const gscAudit = data.gscPermissionAudit;
  const adsenseProofFreshness = data.adsenseProofFreshness;
  const proofFreshnessReady =
    adsenseProofFreshness.status === "current" ||
    adsenseProofFreshness.status === "resolved";
  const gscPermissionWorkOrderPath =
    gscAudit?.workOrderPath ??
    (chain ? `docs/work-orders/gsc-permission-audit-${chain.date}.md` : "");
  const readinessBlockingRefreshFailedSources =
    chain?.readinessBlockingRefreshFailedSources ?? [];
  const maintenanceRefreshFailedSources =
    chain?.maintenanceRefreshFailedSources ?? [];
  const actionability = getDashboardActionability(data, actionabilityOptions);
  const isReadOnlyBlocked =
    actionability.status === "blocked_for_action_until_post_recovery_verify";
  const isReady = Boolean(
    chain &&
      handoff &&
      !chain.refreshFailuresBlockReadiness &&
      actionability.status === "safe_to_act",
  );
  const chainVerdict = !chain
    ? "missing artifact"
    : chain.fail > 0 || chain.skipped > 0 || chain.pass !== chain.commands || chain.commands === 0
      ? "command failed"
      : !proofFreshnessReady
        ? "proof refresh required"
      : chain.refreshFailuresBlockReadiness
        ? "readiness blocked"
        : actionability.status === "safe_to_act"
          ? "ready"
          : "review required";

  return (
    <article className="panel fleet-workflow-panel">
      <div className="panel-heading">
        <div>
          <h2>Fleet 최적화 체인</h2>
          <p>대시보드 갱신, 문제 큐, 최적화 계획, T3 핸드오프를 한 번에 확인합니다.</p>
        </div>
        <span>{isReady ? "ready" : "check"}</span>
      </div>
      {["stale", "missing", "invalid"].includes(adsenseProofFreshness.status) ? (
        <div className="fleet-blocker">
          <strong>AdSense proof 스냅샷 점검</strong>
          <p>{adsenseProofFreshness.reason}</p>
          {adsenseProofFreshness.artifactPath ? (
            <code>{adsenseProofFreshness.artifactPath}</code>
          ) : null}
          {adsenseProofFreshness.collectorSnapshot ? (
            <code>{adsenseProofFreshness.collectorSnapshot}</code>
          ) : null}
          <code>
            {isReadOnlyBlocked
              ? "read-only AdSense proof evidence"
              : adsenseProofFreshness.remediationCommand}
          </code>
          <code>
            {isReadOnlyBlocked
              ? "post-recovery required before proof refresh"
              : "pnpm adsense:proof:verify"}
          </code>
        </div>
      ) : null}
      {!chain ? (
        <div className="fleet-blocker">
          <strong>{getFleetArtifactStatusTitle(chainStatus.state)}</strong>
          <p>{getFleetArtifactStatusMessage(chainStatus)}</p>
          {chainStatus.artifactPath ? <code>{chainStatus.artifactPath}</code> : null}
          {chainStatus.statsSnapshot ? (
            <code>{`artifact snapshot ${chainStatus.statsSnapshot}`}</code>
          ) : null}
          {chainStatus.expectedStatsGeneratedAt ? (
            <code>{`expected snapshot ${chainStatus.expectedStatsGeneratedAt}`}</code>
          ) : null}
          <code>
            {isReadOnlyBlocked ? "post-recovery required before fleet optimize" : "pnpm fleet:optimize"}
          </code>
        </div>
      ) : !handoff ? (
        <div className="fleet-blocker">
          <strong>T3 핸드오프 미생성</strong>
          <p>현재 stats 스냅샷과 일치하는 T3 제목/본문 핸드오프 산출물이 없습니다.</p>
          <code>{`expected snapshot ${data.generatedAt ?? "unknown"}`}</code>
          <code>
            {isReadOnlyBlocked ? "post-recovery required before fleet optimize" : "pnpm fleet:optimize"}
          </code>
        </div>
      ) : (
        <>
          <div className="command-list">
            <div className="command-row">
              <span>최신 실행</span>
              <code>{formatShortDateTime(chain.generatedAt)}</code>
            </div>
            <div className="command-row">
              <span>체인 결과</span>
              <code>
                {formatNumber(chain.pass)}/{formatNumber(chain.commands)} pass · fail {formatNumber(chain.fail)}
              </code>
            </div>
            <div className="command-row">
              <span>전체 판정</span>
              <code>{chainVerdict}</code>
            </div>
            <div className="command-row">
              <span>스냅샷 일치</span>
              <code>{chain.planMatchesStats && chain.handoffMatchesStats ? "plan/handoff ok" : "mismatch"}</code>
            </div>
            <div className="command-row">
              <span>T3 핸드오프</span>
              <code>
                {formatNumber(handoff.siteCount)} sites · title {formatNumber(handoff.titleHandoffCount)} · content {formatNumber(handoff.contentHandoffCount)}
              </code>
            </div>
          <div className="command-row">
            <span>안전 상태</span>
            <code>{chain.handoffMutationFlagsFalse ? "non-mutating" : "review required"}</code>
          </div>
            <div className="command-row">
              <span>수집 경고</span>
              <code>
                {`${formatNumber(readinessBlockingRefreshFailedSources.length)} blocking · ${formatNumber(maintenanceRefreshFailedSources.length)} maintenance`}
              </code>
            </div>
            <div className="command-row">
              <span>AdSense proof</span>
              <code>
                {`${adsenseProofFreshness.status} · ${formatNumber(adsenseProofFreshness.candidateCount)} candidates`}
              </code>
            </div>
            <div className="command-row">
              <span>GSC handoff</span>
              <code>{gscAudit?.handoffStatus ?? "missing"}</code>
            </div>
            <div className="command-row">
              <span>작업지시</span>
              <code>{isReadOnlyBlocked ? "read-only until post-recovery passes" : handoff.workOrderPath}</code>
            </div>
            <div className="command-row">
              <span>재실행</span>
              <code>{isReadOnlyBlocked ? "blocked until post-recovery passes" : "pnpm fleet:optimize"}</code>
            </div>
          </div>
          {chain.refreshFailuresBlockReadiness ? (
            <div className="fleet-blocker">
              <strong>최우선 차단 사유</strong>
              <p>
                {getFleetReadinessBlockerMessage(chain, gscAudit)}
              </p>
              {readinessBlockingRefreshFailedSources.map((source) => (
                <div className="refresh-source-detail" key={`fleet-refresh-source-${source}`}>
                  <code>{source}</code>
                  <p>{describeRefreshFailureSource(source).label}</p>
                  <em>
                    {isReadOnlyBlocked
                      ? "post-recovery 통과 전 실행 금지. 원인 상태만 읽기 전용으로 확인하세요."
                      : describeRefreshFailureSource(source).nextStep}
                  </em>
                </div>
              ))}
              <code>
                {isReadOnlyBlocked ? "read-only GSC blocker evidence" : gscPermissionWorkOrderPath}
              </code>
              <code>{`gsc handoff ${gscAudit?.handoffStatus ?? "missing"}`}</code>
              {gscAudit?.artifactPath ? <code>{gscAudit.artifactPath}</code> : null}
              <code>{isReadOnlyBlocked ? "post-recovery required before action" : "pnpm dashboard:post-recovery"}</code>
              {gscAudit && gscAudit.results.length > 0 ? (
                <div className="issue-grid">
                  {gscAudit.results.map((result) => (
                    <div className="issue-row" key={`fleet-gsc-audit-${result.siteId}`}>
                      <div>
                        <strong>{result.host}</strong>
                        <a href={result.configuredGscSiteUrl}>{result.configuredGscSiteUrl}</a>
                        <p>
                          {isReadOnlyBlocked
                            ? "외부 권한 상태 근거만 읽기 전용으로 표시합니다."
                            : result.requiredAction}
                        </p>
                        <em>
                          {`permission ${result.permissionLevel ?? "not_listed"} · ${result.accessState}`}
                        </em>
                      </div>
                      <span>{result.accessState}</span>
                    </div>
                  ))}
                </div>
              ) : data.gscIssueStats.length > 0 ? (
                <div className="issue-grid">
                  {data.gscIssueStats.map((stat) => (
                    <div className="issue-row" key={`fleet-gsc-${stat.id}`}>
                      <div>
                        <strong>{stat.name}</strong>
                        <a href={stat.url}>{stat.gscSiteUrl ?? stat.url}</a>
                        <p>{getGscIssueDetail(stat)}</p>
                      </div>
                      <span>{getGscIssueLabel(stat)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {maintenanceRefreshFailedSources.length > 0 ? (
            <div className="fleet-blocker fleet-maintenance">
              <strong>텔레메트리 유지보수</strong>
              <p>
                GA4 설정 누락은 최신 대시보드 판단을 막는 hard blocker가 아니지만, 수집 품질을 위해 별도 정리해야 합니다.
              </p>
              {maintenanceRefreshFailedSources.map((source) => (
                <div className="refresh-source-detail" key={`fleet-maintenance-source-${source}`}>
                  <code>{source}</code>
                  <p>{describeRefreshFailureSource(source).label}</p>
                  <em>
                    {isReadOnlyBlocked
                      ? "post-recovery 통과 전 실행 금지. 유지보수 신호만 읽기 전용으로 확인하세요."
                      : describeRefreshFailureSource(source).nextStep}
                  </em>
                </div>
              ))}
              <code>
                {isReadOnlyBlocked ? "read-only telemetry maintenance evidence" : `docs/work-orders/adsense/remediation-queue-${chain.date}.md`}
              </code>
              <code>{isReadOnlyBlocked ? "post-recovery required before action" : "confirm GA4 property/config binding, then pnpm dashboard:verify"}</code>
            </div>
          ) : null}
          <div className="issue-grid fleet-handoff-list">
            {handoff.sites.map((site) => (
              <div className="issue-row" key={site.host}>
                <div>
                  <strong>{site.host}</strong>
                  <a href={site.url}>{site.topQuery || formatHost(site.url)}</a>
                  <p>
                    {`${formatNumber(site.gscImpressions30d)} impressions · ${formatNumber(site.gscClicks30d)} clicks · CTR ${formatPercent(site.gscCtr30d)} · ${formatDecimal(site.gscPosition30d)}위`}
                  </p>
                  <p>
                    {isReadOnlyBlocked
                      ? "읽기 전용 검토 후보입니다. post-recovery 통과 전에는 제목/본문 변경이나 배포 대상으로 사용하지 않습니다."
                      : site.recommendedNextAction}
                  </p>
                  <p>
                    {`sitemap warnings ${formatNumber(site.sitemapWarnings)} · errors ${formatNumber(site.sitemapErrors)} · AdSense ${site.adsenseStatus || "unknown"} · ads.txt ${site.adsTxtStatus || "unknown"}`}
                  </p>
                  <em>{site.localPath}</em>
                </div>
                <span>{isReadOnlyBlocked ? "read-only" : site.actions.join(" + ")}</span>
              </div>
            ))}
            {handoff.hiddenSiteCount > 0 ? (
              <div className="issue-row fleet-handoff-more">
                <div>
                  <strong>{formatNumber(handoff.hiddenSiteCount)}개 추가 대상</strong>
                  <p>
                    {isReadOnlyBlocked
                      ? "전체 큐는 작업지시 문서에서 읽기 전용으로 확인합니다."
                      : "전체 큐는 작업지시 문서에서 이어서 확인합니다."}
                  </p>
                  <em>{handoff.workOrderPath}</em>
                </div>
                <span>{isReadOnlyBlocked ? "read-only" : "more"}</span>
              </div>
            ) : null}
          </div>
        </>
      )}
    </article>
  );
}

function ActionQueue({
  actions,
  actionability,
  gscHandoffStatus,
}: {
  actions: DashboardActionItem[];
  actionability: DashboardActionability;
  gscHandoffStatus: GscPermissionAuditSummary["handoffStatus"] | null;
}) {
  const isReadOnlyBlocked =
    actionability.status === "blocked_for_action_until_post_recovery_verify";
  return (
    <article className="panel action-panel">
      <div className="panel-heading">
        <div>
          <h2>{isReadOnlyBlocked ? "읽기 전용 점검 후보" : "오늘의 액션"}</h2>
          <p>
            {isReadOnlyBlocked
              ? "권한, 급락, 수익화, CTR, 순위 개선 신호를 실행 전 검토용으로 정렬했습니다."
              : "권한, 급락, 수익화, CTR, 순위 개선 순서로 실제 조치 항목을 정렬했습니다."}
          </p>
        </div>
        <span>{formatNumber(actions.length)}개</span>
      </div>
      <DashboardActionabilityNotice
        actionability={actionability}
        gscHandoffStatus={gscHandoffStatus}
      />
      {actions.length === 0 ? (
        <p className="muted-text">오늘 우선 조치할 항목이 없습니다.</p>
      ) : (
        <div
          className="action-list"
          data-actionability={
            actionability.status === "blocked_for_action_until_post_recovery_verify"
              ? "read-only-blocked"
              : "safe-to-act"
          }
        >
          {actions.map((action) => (
            <div className={`action-row action-${action.kind}`} key={action.id}>
              <span>{action.label}</span>
              <div>
                <strong>{action.siteName}</strong>
                <a href={action.url}>{formatHost(action.url)}</a>
                <p>
                  {isReadOnlyBlocked
                    ? "읽기 전용 점검 후보입니다. 원본 실행 사유는 post-recovery 통과 후 표시합니다."
                    : action.reason}
                </p>
                <em>
                  {isReadOnlyBlocked
                    ? "post-recovery 통과 전 실행 금지. 읽기 전용 점검 메모로만 사용하세요."
                    : action.nextStep}
                </em>
                {isReadOnlyBlocked ? (
                  <small className="action-readonly-note">
                    post-recovery 통과 전에는 위 근거를 점검 메모로만 사용합니다.
                  </small>
                ) : null}
              </div>
              <b>{action.value}</b>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function DashboardActionabilityNotice({
  actionability,
  gscHandoffStatus,
}: {
  actionability: DashboardActionability;
  gscHandoffStatus?: GscPermissionAuditSummary["handoffStatus"] | null;
}) {
  if (actionability.status === "safe_to_act") {
    return null;
  }
  const reason =
    gscHandoffStatus === "pending_local_refresh"
      ? `Search Console 권한은 owner access로 확인됐지만 최신 로컬 refresh/post-recovery 검증이 끝나지 않았습니다. pnpm dashboard:post-recovery가 통과할 때까지 권고는 읽기 전용 점검에만 사용하세요. 차단 대상: ${actionability.blockerHosts.join(", ") || "로컬 검증"}.`
      : `Search Console 권한 복구 후 pnpm dashboard:post-recovery가 통과할 때까지 액션/인사이트 권고는 읽기 전용 점검에만 사용하세요. 차단 대상: ${actionability.blockerHosts.join(", ") || "외부 권한"}.`;
  return (
    <div className="actionability-notice">
      <strong>실행 보류: Fleet readiness가 차단되어 이 목록은 실행 큐가 아닙니다.</strong>
      <p>{reason}</p>
      <code>{actionability.status}</code>
      <code>{`gsc handoff ${gscHandoffStatus ?? "missing"}`}</code>
      <code>{actionability.command}</code>
    </div>
  );
}

function CollectionReliabilityPanel({
  summaries,
}: {
  summaries: ReturnType<typeof getDashboardData>["collectionSummary"];
}) {
  return (
    <article className="panel collection-reliability-panel">
      <div className="panel-heading">
        <div>
          <h2>수집 신뢰도</h2>
          <p>소스별 정상, 지연, 오류, 누락, 처리중 상태입니다.</p>
        </div>
      </div>
      <div className="collection-source-list">
        {summaries.map((summary) => (
          <div className="collection-source-row" key={summary.key}>
            <strong>
              {summary.label}
              <small>대상 {formatNumber(summary.total)}개</small>
            </strong>
            <div>
              <span className="source-ok">정상 {formatNumber(summary.ok)}</span>
              <span className="source-stale">
                지연 {formatNumber(summary.stale)}
              </span>
              <span className="source-error">
                오류 {formatNumber(summary.error)}
              </span>
              <span className="source-missing">
                누락 {formatNumber(summary.missing)}
              </span>
              <span className="source-processing">
                처리중 {formatNumber(summary.processing)}
              </span>
            </div>
          </div>
        ))}
      </div>
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
                <p>{getGscIssueDetail(stat)}</p>
              </div>
              <span>{getGscIssueLabel(stat)}</span>
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

function SupportPanel({
  data,
  actionabilityOptions,
}: {
  data: ReturnType<typeof getDashboardData>;
  actionabilityOptions: DashboardActionabilityOptions;
}) {
  const actionability = getDashboardActionability(data, actionabilityOptions);
  const isReadOnlyBlocked =
    actionability.status === "blocked_for_action_until_post_recovery_verify";
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
            <p>모든 수치는 한국시간 완료일 기준이며 오늘 데이터는 제외합니다.</p>
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
            <p>
              {isReadOnlyBlocked
                ? "post-recovery 통과 전에는 외부 갱신 명령을 실행하지 않습니다."
                : "기준: 한국시간 완료일, 오늘 제외"}
            </p>
          </div>
        </div>
        <div className="command-list">
          <div className="command-row">
            <span>{isReadOnlyBlocked ? "현재 상태" : "GA4/GSC 통계 수집"}</span>
            <code>{isReadOnlyBlocked ? "read-only until post-recovery passes" : "pnpm stats:update"}</code>
          </div>
          <div className="command-row">
            <span>{isReadOnlyBlocked ? "필수 검증" : "오래된 sitemap 재제출"}</span>
            <code>{isReadOnlyBlocked ? actionability.command : "pnpm sitemaps:refresh-stale"}</code>
          </div>
          <div className="command-row">
            <span>{isReadOnlyBlocked ? "외부 갱신" : "사이트 재등록"}</span>
            <code>
              {isReadOnlyBlocked
                ? "blocked until post-recovery passes"
                : "pnpm setup:import-ga4-sites -- --account=236349432"}
            </code>
          </div>
        </div>
      </article>

    </section>
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

function MiniMetric({
  hint,
  label,
  value,
}: {
  hint?: string;
  label: string;
  value: number;
}) {
  return (
    <div className="mini-metric">
      <div>
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </div>
      <strong>{formatNumber(value)}</strong>
    </div>
  );
}

function formatHost(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getActionabilityOptions(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): DashboardActionabilityOptions {
  return {
    requirePostRecoveryChain:
      firstSearchParam(searchParams?.actionabilityMode) !== "local-evidence" ||
      !hasValidDashboardLocalEvidenceToken(firstSearchParam(searchParams?.actionabilityToken)),
  };
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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
    timeZone: "Asia/Seoul",
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

function getGscIssueDetail(
  stat: ReturnType<typeof getDashboardData>["stats"][number],
): string {
  const alert = stat.gscEmailAlerts?.[0];
  if (alert) {
    return `Gmail digest ${alert.time ? `${alert.time} ` : ""}${alert.issue}`;
  }
  return stat.statusReason;
}

function getGscIssueLabel(
  stat: ReturnType<typeof getDashboardData>["stats"][number],
): string {
  const alert = stat.gscEmailAlerts?.[0];
  if (alert) {
    return alert.severity === "high" ? "GSC alert high" : "GSC alert";
  }
  return getErrorKindLabel(stat.gscErrorKind);
}

function getFleetArtifactStatusTitle(
  state: FleetOptimizationChainArtifactStatus["state"],
): string {
  switch (state) {
    case "snapshot_mismatch":
      return "Fleet 체인 스냅샷 불일치";
    case "invalid":
      return "Fleet 체인 산출물 오류";
    case "missing":
      return "Fleet 체인 미생성";
    case "current":
      return "Fleet 체인 최신";
  }
}

function getFleetArtifactStatusMessage(
  status: FleetOptimizationChainArtifactStatus,
): string {
  switch (status.state) {
    case "snapshot_mismatch":
      return "현재 stats 스냅샷과 다른 fleet 체인 산출물만 있어, 대시보드 판단을 보류합니다.";
    case "invalid":
      return "fleet 체인 산출물이 있지만 필수 검증 필드가 없거나 JSON을 읽을 수 없습니다.";
    case "missing":
      return "현재 stats 스냅샷에 대응하는 fleet 체인 산출물이 아직 없습니다.";
    case "current":
      return status.reason;
  }
}

function getFleetReadinessBlockerMessage(
  chain: FleetOptimizationChainSummary,
  gscAudit: GscPermissionAuditSummary | null,
): string {
  const firstGscBlocker = gscAudit?.results.find(
    (result) =>
      result.accessState === "unverified" ||
      result.permissionLevel === "siteUnverifiedUser" ||
      result.gscStatus === "auth_error",
  );
  if (firstGscBlocker) {
    return `${firstGscBlocker.host} Search Console 권한이 ${firstGscBlocker.permissionLevel ?? "not listed"} / ${firstGscBlocker.accessState} 상태라 최신 검색 지표 기반 판단을 완료하지 않습니다.`;
  }
  if (chain.readinessBlockingRefreshFailedSources.length > 0) {
    return `차단 수집 실패 소스 ${formatNumber(chain.readinessBlockingRefreshFailedSources.length)}개가 남아 있어 최신 대시보드 판단을 완료하지 않습니다.`;
  }
  return "수집 실패가 남아 있어 최신 대시보드 판단을 완료하지 않습니다.";
}

function getMonetizationLabel(kind: string | undefined): string {
  if (kind === "ok") return "정상";
  if (kind === "missing_config") return "미탐지";
  if (kind === "api_error" || kind === "auth_error") return "상태 확인 실패";
  return "미수집";
}

function formatSnapshotDateTime(value: string | null): string {
  if (!value) {
    return "아직 수집 전";
  }

  return `${new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(value))} KST`;
}

function getMonetizationIssueLabel(
  stat: ReturnType<typeof getDashboardData>["stats"][number],
): string {
  if (stat.adsenseStatus === "missing_config") return "코드 미탐지";
  if (stat.adsTxtStatus === "missing_config") return "ads.txt 없음";
  return "확정 문제 확인 필요";
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


