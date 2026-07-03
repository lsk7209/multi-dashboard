import type {
  CoupangChannelRegistryEntry,
  CoupangChannelRegistrySnapshot,
  AffiliateInventorySnapshot,
  AffiliateItemSummary,
  AffiliateProgramSummary,
} from "../lib/monetization-workspace.js";

interface AffiliateWorkspaceProps {
  coupangRegistry: CoupangChannelRegistrySnapshot;
  data: AffiliateInventorySnapshot;
}

const PRIORITY_ORDER: Record<string, number> = {
  p0: 0,
  p1: 1,
  p2: 2,
  manual: 3,
};

const RISK_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const COUPANG_CHANNEL_STATUS_ORDER: Record<string, number> = {
  not_registered: 0,
  registered: 1,
  screenshot_submitted: 2,
  rejected: 3,
  paused: 4,
  approved: 5,
};

export function AffiliateWorkspace({
  coupangRegistry,
  data,
}: AffiliateWorkspaceProps) {
  const allAffiliateItems = [...(data.affiliateItems ?? [])].sort(
    compareAffiliateItems,
  );
  const programs = [...(data.programs ?? [])].sort(comparePrograms);
  const playbook = data.playbook ?? {
    bannerSlotStrategy: [],
    defaultRel: "sponsored nofollow",
    disclosureTemplateEn: "This page may contain affiliate links.",
    disclosureTemplateKo: "이 페이지에는 제휴 링크가 포함될 수 있습니다.",
    priorityRules: [],
  };
  const highValueCandidates =
    data.ripplealba?.highValueCandidates?.slice(0, 20) ?? [];
  const visibleAffiliateItems = allAffiliateItems.slice(0, 36);
  const bannerReadyItems = allAffiliateItems
    .filter((item) => isBannerReady(item))
    .slice(0, 24);
  const p0Items = allAffiliateItems.filter((item) => item.priority === "p0");
  const manualReviewItems = allAffiliateItems.filter((item) =>
    needsManualReview(item),
  );
  const broadFitItems = allAffiliateItems.filter(
    (item) => (item.allowedSites ?? []).length === 0,
  );

  return (
    <div className="workspace-stack affiliate-workspace">
      <article className="panel affiliate-hub-panel">
        <div className="panel-heading">
          <div>
            <h2>제휴 운영 저장소</h2>
            <p>
              국내외 제휴 프로그램을 우선순위, 배너 적합도, API/Feed/MCP/CLI
              연동 여부, 공시 문구, 다음 액션 기준으로 정리했습니다.
            </p>
          </div>
          <span>{formatNumber(allAffiliateItems.length)}개 항목</span>
        </div>
        <div className="affiliate-playbook-grid">
          <div className="affiliate-playbook-card">
            <strong>공시 문구</strong>
            <p>{playbook.disclosureTemplateKo || playbook.disclosureTemplateEn}</p>
            <code>rel="{playbook.defaultRel || "sponsored nofollow"}"</code>
          </div>
          {playbook.bannerSlotStrategy.slice(0, 4).map((slot) => (
            <div className="affiliate-playbook-card" key={slot.slot}>
              <strong>{slot.slot}</strong>
              <p>{slot.purpose}</p>
              <small>{slot.fit}</small>
            </div>
          ))}
        </div>
      </article>

      <div className="summary-grid" aria-label="제휴 운영 요약">
        <SummaryCard
          label="프로그램"
          value={formatNumber(programs.length)}
          hint={`수동 동기화 ${data.lastManualSync || "-"}`}
        />
        <SummaryCard
          label="P0 우선"
          value={formatNumber(p0Items.length)}
          hint="초기 수익 연결 후보"
        />
        <SummaryCard
          label="배너 적합"
          value={formatNumber(allAffiliateItems.filter(isBannerReady).length)}
          hint="high 또는 medium"
        />
        <SummaryCard
          label="수동 검토"
          value={formatNumber(manualReviewItems.length)}
          hint="고위험, 고승인난도, manual"
        />
        <SummaryCard
          label="전체 사이트 후보"
          value={formatNumber(broadFitItems.length)}
          hint="allowedSites 제한 없음"
        />
      </div>

      <CoupangChannelGate registry={coupangRegistry} />

      <AffiliateItemTable
        items={visibleAffiliateItems}
        title="우선순위 항목"
        description="먼저 계정 신청, 추적 링크 생성, 배너 소재 제작으로 넘길 제휴 항목입니다."
        emptyText="정규화된 제휴 항목이 아직 없습니다."
      />

      <AffiliateItemTable
        items={bannerReadyItems}
        title="배너 적용 준비"
        description="배너 회전에 바로 연결하기 좋은 후보입니다. 수수료, 콘텐츠 적합도, 제한 조건을 함께 확인합니다."
        emptyText="배너 적합도가 높은 제휴 항목이 아직 없습니다."
      />

      <div className="workspace-grid">
        <ProgramInventory programs={programs} generatedAt={data.generatedAt} />
        <OperationsSource data={data} />
      </div>

      <RulesPanel data={data} />

      <RippleAlbaCandidates candidates={highValueCandidates} />
    </div>
  );
}

function AffiliateItemTable({
  description,
  emptyText,
  items,
  title,
}: {
  description: string;
  emptyText: string;
  items: AffiliateItemSummary[];
  title: string;
}) {
  return (
    <article className="panel workspace-table-panel affiliate-item-table">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span>{formatNumber(items.length)}개 표시</span>
      </div>
      <div className="workspace-table-wrap">
        <table className="workspace-table">
          <thead>
            <tr>
              <th>항목</th>
              <th>우선순위</th>
              <th>수익 모델</th>
              <th>콘텐츠 적합</th>
              <th>배너</th>
              <th>연동</th>
              <th>검토</th>
              <th>다음 액션</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8}>{emptyText}</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <small>
                      {item.network} / {item.category} / {item.region}
                    </small>
                    <small>
                      <a href={item.applyUrl || item.sourceUrl}>신청</a>
                      {" / "}
                      <a href={item.sourceUrl || item.applyUrl}>근거</a>
                    </small>
                  </td>
                  <td>
                    <span className={`badge affiliate-priority-${item.priority}`}>
                      {item.priority}
                    </span>
                    <small>{item.status}</small>
                  </td>
                  <td>{item.payoutModel}</td>
                  <td>{formatStringList(item.contentFit, 3)}</td>
                  <td>
                    <strong>{item.bannerSuitability}</strong>
                    <small>{formatStringList(item.recommendedSlots, 2)}</small>
                  </td>
                  <td>
                    <IntegrationSupportCell item={item} />
                  </td>
                  <td>
                    <span className={`badge affiliate-risk-${item.risk}`}>
                      {item.risk}
                    </span>
                    <small>승인 {item.approvalDifficulty}</small>
                  </td>
                  <td>{item.nextAction}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function CoupangChannelGate({
  registry,
}: {
  registry: CoupangChannelRegistrySnapshot;
}) {
  const channels = [...(registry.channels ?? [])].sort(compareCoupangChannels);
  const approvedCount = channels.filter((channel) => channel.status === "approved")
    .length;
  const approvalScreenshotCount = channels.filter((channel) =>
    channel.status === "registered" || channel.status === "screenshot_submitted",
  ).length;
  const blockedCount = channels.length - approvedCount;

  return (
    <article className="panel workspace-table-panel affiliate-item-table">
      <div className="panel-heading">
        <div>
          <h2>쿠팡 채널 노출 게이트</h2>
          <p>
            쿠팡 파트너스 일반 노출은 승인 완료 상태인 사이트에만 허용합니다.
            등록/스크린샷 대기 채널은 최종 승인 증빙 목적의 제한 노출만 허용합니다.
          </p>
        </div>
        <span>
          일반 허용 {formatNumber(approvedCount)} / 승인용{" "}
          {formatNumber(approvalScreenshotCount)} / 차단 {formatNumber(blockedCount)}
        </span>
      </div>
      <div className="affiliate-playbook-grid">
        <div className="affiliate-playbook-card">
          <strong>노출 정책</strong>
          <p>{registry.policy?.exposureMode ?? "approved_only"}</p>
          <small>approved 상태만 쿠팡 홍보 가능</small>
        </div>
        <div className="affiliate-playbook-card">
          <strong>필수 공시</strong>
          <p>{registry.policy?.requiredDisclosureKo || "-"}</p>
        </div>
      </div>
      <div className="workspace-table-wrap">
        <table className="workspace-table">
          <thead>
            <tr>
              <th>사이트</th>
              <th>상태</th>
              <th>노출</th>
              <th>우선순위</th>
              <th>첫 적용</th>
              <th>등록일</th>
              <th>승인일</th>
            </tr>
          </thead>
          <tbody>
            {channels.length === 0 ? (
              <tr>
                <td colSpan={7}>등록 상태 파일에 쿠팡 채널이 없습니다.</td>
              </tr>
            ) : (
              channels.map((channel) => {
                const allowed = channel.status === "approved";

                return (
                  <tr key={`${channel.siteId}-${channel.domain}`}>
                    <td>
                      <strong>{channel.domain}</strong>
                      <small>{channel.siteId}</small>
                    </td>
                    <td>
                      <span
                        className={`badge affiliate-channel-${channel.status}`}
                      >
                        {formatCoupangChannelStatus(channel.status)}
                      </span>
                    </td>
                    <td>
                      <strong>{allowed ? "노출 허용" : "노출 차단"}</strong>
                      <small>{formatCoupangExposureHint(channel.status)}</small>
                    </td>
                    <td>{channel.priority}</td>
                    <td>{channel.firstUse || "-"}</td>
                    <td>{channel.registeredAt || "-"}</td>
                    <td>{channel.approvedAt || "-"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function IntegrationSupportCell({ item }: { item: AffiliateItemSummary }) {
  return (
    <>
      <strong>API {formatSupportValue(item.integrationSupport?.api)}</strong>
      <small>Feed {formatSupportValue(item.integrationSupport?.feed)}</small>
      <small>
        MCP {formatSupportValue(item.integrationSupport?.mcp)} / CLI{" "}
        {formatSupportValue(item.integrationSupport?.cli)}
      </small>
    </>
  );
}

function ProgramInventory({
  generatedAt,
  programs,
}: {
  generatedAt: string | null;
  programs: AffiliateProgramSummary[];
}) {
  return (
    <article className="panel">
      <div className="panel-heading">
        <div>
          <h2>프로그램 저장소</h2>
          <p>공식 신청 경로, 운영 네트워크, 승인 상태, 연동 가능성, 다음 액션입니다.</p>
        </div>
        <span>{formatShortDateTime(generatedAt)}</span>
      </div>
      <div className="workspace-card-list">
        {programs.length === 0 ? (
          <p className="muted-text">등록된 제휴 프로그램이 없습니다.</p>
        ) : (
          programs.map((program) => (
            <div className="workspace-card" key={program.id}>
              <div>
                <strong>{program.name || program.id}</strong>
                <span>{program.category || "uncategorized"}</span>
              </div>
              <b>{program.status}</b>
              <p>{program.nextAction || program.notes || "다음 액션이 없습니다."}</p>
              <small>
                {program.region || "GLOBAL"} /{" "}
                {program.bannerSuitability || "manual"} 배너 적합
              </small>
              <small>{formatIntegrationSupport(program)}</small>
              <small>
                <a href={program.applyUrl || program.homepageUrl || program.platformUrl}>
                  신청
                </a>
                {" / "}
                <a href={program.sourceUrl || program.homepageUrl || program.platformUrl}>
                  근거
                </a>
              </small>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function OperationsSource({ data }: { data: AffiliateInventorySnapshot }) {
  return (
    <article className="panel">
      <div className="panel-heading">
        <div>
          <h2>운영 소스</h2>
          <p>이 페이지와 배너 콘솔 기본값을 만드는 로컬 메타데이터입니다.</p>
        </div>
      </div>
      <div className="command-list">
        <div className="command-row">
          <span>소스 종류</span>
          <code>{data.source.sourceKind}</code>
        </div>
        <div className="command-row">
          <span>제휴 저장소</span>
          <code>{data.source.inventoryPath}</code>
        </div>
        <div className="command-row">
          <span>리플알바 가맹점</span>
          <code>{data.source.merchantsPath}</code>
        </div>
        <div className="command-row">
          <span>갱신 명령</span>
          <code>pnpm ops:monetization</code>
        </div>
      </div>
    </article>
  );
}

function RulesPanel({ data }: { data: AffiliateInventorySnapshot }) {
  const rules = [
    ...(data.playbook?.priorityRules ?? []),
    ...(data.ripplealba?.priorityRules ?? []),
  ];

  return (
    <article className="panel affiliate-rules-panel">
      <div className="panel-heading">
        <div>
          <h2>운영 규칙</h2>
          <p>제휴 링크와 배너를 배포하기 전에 확인해야 하는 우선순위와 공시 규칙입니다.</p>
        </div>
        <span>{formatNumber(rules.length)}개</span>
      </div>
      {rules.length === 0 ? (
        <p className="muted-text">등록된 운영 규칙이 없습니다.</p>
      ) : (
        <div className="affiliate-rule-grid">
          {rules.map((rule) => (
            <div className="affiliate-rule" key={rule.id}>
              <strong>{rule.id}</strong>
              <p>{rule.rule}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function RippleAlbaCandidates({
  candidates,
}: {
  candidates: AffiliateInventorySnapshot["ripplealba"]["highValueCandidates"];
}) {
  return (
    <article className="panel workspace-table-panel">
      <div className="panel-heading">
        <div>
          <h2>리플알바 고단가 후보</h2>
          <p>수수료 규모와 승인율 정보가 있는 후보를 보수적으로 검토합니다.</p>
        </div>
        <span>{formatNumber(candidates.length)}개 표시</span>
      </div>
      <div className="workspace-table-wrap">
        <table className="workspace-table">
          <thead>
            <tr>
              <th>후보</th>
              <th>분류</th>
              <th>수수료</th>
              <th>신청률</th>
              <th>승인율</th>
              <th>프로모션</th>
              <th>메모</th>
            </tr>
          </thead>
          <tbody>
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={7}>리플알바 고단가 후보가 아직 없습니다.</td>
              </tr>
            ) : (
              candidates.map((candidate) => (
                <tr key={`${candidate.category}-${candidate.name}`}>
                  <td>
                    <strong>{candidate.name}</strong>
                  </td>
                  <td>{candidate.category}</td>
                  <td>{formatCurrencyKrw(candidate.commissionKrw)}</td>
                  <td>{formatNullablePercent(candidate.previousMonthApplyRatePercent)}</td>
                  <td>
                    {formatNullablePercent(candidate.previousMonthApprovalRatePercent)}
                  </td>
                  <td>{candidate.promotion ? "진행" : "없음"}</td>
                  <td>{candidate.priorityNote || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function SummaryCard({
  hint,
  label,
  value,
}: {
  hint: string;
  label: string;
  value: string;
}) {
  return (
    <article className="status-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  );
}

function compareAffiliateItems(
  left: AffiliateItemSummary,
  right: AffiliateItemSummary,
): number {
  return (
    rank(PRIORITY_ORDER, left.priority) - rank(PRIORITY_ORDER, right.priority) ||
    rank(RISK_ORDER, left.risk) - rank(RISK_ORDER, right.risk) ||
    left.title.localeCompare(right.title)
  );
}

function comparePrograms(
  left: AffiliateProgramSummary,
  right: AffiliateProgramSummary,
): number {
  return (
    rank(PRIORITY_ORDER, left.priority ?? "manual") -
      rank(PRIORITY_ORDER, right.priority ?? "manual") ||
    (left.name || left.id).localeCompare(right.name || right.id)
  );
}

function compareCoupangChannels(
  left: CoupangChannelRegistryEntry,
  right: CoupangChannelRegistryEntry,
): number {
  return (
    rank(PRIORITY_ORDER, left.priority) - rank(PRIORITY_ORDER, right.priority) ||
    rank(COUPANG_CHANNEL_STATUS_ORDER, left.status) -
      rank(COUPANG_CHANNEL_STATUS_ORDER, right.status) ||
    left.domain.localeCompare(right.domain)
  );
}

function formatCoupangChannelStatus(status: string): string {
  const labels: Record<string, string> = {
    approved: "승인 완료",
    not_registered: "미등록",
    paused: "중지",
    registered: "등록 완료",
    rejected: "거절",
    screenshot_submitted: "스크린샷 제출",
  };

  return labels[status] ?? status;
}

function formatCoupangExposureHint(status: string): string {
  const hints: Record<string, string> = {
    approved: "일반 쿠팡 링크/배너 가능",
    registered: "승인 스크린샷용 제한 노출만 가능",
    screenshot_submitted: "승인 대기 중, 제한 노출만 유지",
  };

  return hints[status] ?? "일반/승인용 노출 금지";
}

function isBannerReady(item: AffiliateItemSummary): boolean {
  return item.bannerSuitability === "high" || item.bannerSuitability === "medium";
}

function needsManualReview(item: AffiliateItemSummary): boolean {
  return (
    item.priority === "manual" ||
    item.risk === "high" ||
    item.approvalDifficulty === "high"
  );
}

function rank(order: Record<string, number>, value: string): number {
  return order[value] ?? 99;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatCurrencyKrw(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    currency: "KRW",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatNullablePercent(value: number | null): string {
  return value == null ? "-" : `${value.toFixed(2)}%`;
}

function formatStringList(values: string[] | undefined, limit: number): string {
  if (!values || values.length === 0) return "-";
  const shown = values.slice(0, limit).join(", ");
  const hidden = values.length - limit;
  return hidden > 0 ? `${shown} +${hidden}` : shown;
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

function formatSupportValue(value: string | undefined): string {
  return value && value.trim() ? value : "미확인";
}

function formatIntegrationSupport(program: AffiliateProgramSummary): string {
  const support = program.integrationSupport;
  if (!support) {
    return "API 미확인 / Feed 미확인 / MCP 미확인 / CLI 미확인";
  }

  return `API ${formatSupportValue(support.api)} / Feed ${formatSupportValue(
    support.feed,
  )} / MCP ${formatSupportValue(support.mcp)} / CLI ${formatSupportValue(
    support.cli,
  )}`;
}
