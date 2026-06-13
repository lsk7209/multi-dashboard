import { mkdirSync, writeFileSync } from "node:fs";
import {
  getDashboardData,
  type DashboardActionItem,
  type DateRangeSummary,
  type InsightKind,
  type InsightQueryCandidate,
  type InsightSeverity,
  type SiteInsight,
} from "../../app/lib/dashboard-data.js";

type SafetyTier = "T1" | "T2" | "T3";
type AutomationMode =
  | "monitor_only"
  | "codex_apply_after_site_checkout"
  | "content_handoff"
  | "manual_review";

interface ImprovementQueueItem {
  rank: number;
  id: string;
  siteId: string;
  siteName: string;
  url: string;
  host: string;
  kind: InsightKind;
  severity: InsightSeverity;
  safetyTier: SafetyTier;
  automationMode: AutomationMode;
  primaryValue: string;
  reason: string;
  recommendedAction: string;
  operatorPrompt: string;
  verification: string;
  evidence: string[];
  relatedSignals: string[];
  topQueries: InsightQueryCandidate[];
  gscDiagnosis: string;
  reviewNote: string;
  blockedBy: string[];
}

interface ImprovementQueue {
  version: 1;
  generatedAt: string;
  dashboardGeneratedAt: string | null;
  dateRanges: DateRangeSummary;
  stale: boolean;
  summary: {
    totalItems: number;
    highSeverity: number;
    t2Technical: number;
    t3Content: number;
    monitorOnly: number;
    openActions: number;
  };
  operatingRule: string;
  items: ImprovementQueueItem[];
  actions: DashboardActionItem[];
}

const MAX_ITEMS = Number(process.env.IMPROVEMENT_QUEUE_MAX_ITEMS ?? 20);
const MAX_ACTIONS = Number(process.env.IMPROVEMENT_QUEUE_MAX_ACTIONS ?? 12);
const MAX_DASHBOARD_AGE_HOURS = Number(
  process.env.IMPROVEMENT_QUEUE_MAX_DASHBOARD_AGE_HOURS ?? 36,
);

function main(): void {
  const data = getDashboardData();
  const generatedAt = new Date().toISOString();
  const stale = isDashboardStale(data.generatedAt);

  if (stale && !allowStale()) {
    throw new Error(
      `Dashboard snapshot is stale or missing (generatedAt=${data.generatedAt ?? "null"}). Run pnpm stats:update before generating improvement work.`,
    );
  }

  const items = data.insights
    .slice()
    .sort(compareInsights)
    .slice(0, MAX_ITEMS)
    .map(toQueueItem);
  const actions = data.actions.slice(0, MAX_ACTIONS);

  const queue: ImprovementQueue = {
    version: 1,
    generatedAt,
    dashboardGeneratedAt: data.generatedAt,
    dateRanges: data.dateRanges,
    stale,
    summary: {
      totalItems: items.length,
      highSeverity: items.filter((item) => item.severity === "high").length,
      t2Technical: items.filter((item) => item.safetyTier === "T2").length,
      t3Content: items.filter((item) => item.safetyTier === "T3").length,
      monitorOnly: items.filter((item) => item.automationMode === "monitor_only")
        .length,
      openActions: actions.length,
    },
    operatingRule:
      "Always run pnpm stats:update first, then generate this queue from the fresh dashboard snapshot before touching any individual site.",
    items,
    actions,
  };

  mkdirSync("data", { recursive: true });
  mkdirSync("docs", { recursive: true });
  writeFileSync(
    "data/site-improvement-queue.json",
    `${JSON.stringify(queue, null, 2)}\n`,
  );
  writeFileSync("data/site-improvement-issue.md", renderIssueBody(queue));
  writeFileSync("docs/seo-work-queue.md", renderFullReport(queue));

  console.log(
    `Improvement queue generated: ${items.length} items, ${actions.length} actions, dashboardGeneratedAt=${data.generatedAt ?? "null"}`,
  );
}

function toQueueItem(insight: SiteInsight, index: number): ImprovementQueueItem {
  const classification = classifyInsight(insight.kind);
  return {
    rank: index + 1,
    id: insight.id,
    siteId: insight.siteId,
    siteName: insight.siteName,
    url: insight.url,
    host: hostOf(insight.url),
    kind: insight.kind,
    severity: insight.severity,
    safetyTier: classification.safetyTier,
    automationMode: classification.automationMode,
    primaryValue: insight.primaryValue,
    reason: insight.reason,
    recommendedAction: insight.recommendedAction,
    operatorPrompt: insight.operatorPrompt,
    verification: insight.verification,
    evidence: insight.evidence,
    relatedSignals: insight.relatedSignals,
    topQueries: insight.topQueries,
    gscDiagnosis: insight.gscDiagnosis,
    reviewNote: insight.reviewNote,
    blockedBy: classification.blockedBy,
  };
}

function classifyInsight(kind: InsightKind): {
  safetyTier: SafetyTier;
  automationMode: AutomationMode;
  blockedBy: string[];
} {
  switch (kind) {
    case "indexingOrPermissionIssue":
    case "duplicateProperty":
    case "trafficMismatch":
      return {
        safetyTier: "T2",
        automationMode: "codex_apply_after_site_checkout",
        blockedBy: [
          "needs site/repo access",
          "must verify canonical, robots, sitemap, and analytics ownership before applying",
        ],
      };
    case "decline":
      return {
        safetyTier: "T2",
        automationMode: "codex_apply_after_site_checkout",
        blockedBy: [
          "must compare top pages and channels before changing templates or links",
        ],
      };
    case "seoOpportunity":
    case "rankingOpportunity":
    case "growth":
      return {
        safetyTier: "T3",
        automationMode: "content_handoff",
        blockedBy: [
          "article titles, body text, headings, and in-body links require editorial handoff",
        ],
      };
  }
}

function compareInsights(a: SiteInsight, b: SiteInsight): number {
  return (
    severityWeight(b.severity) - severityWeight(a.severity) ||
    kindWeight(b.kind) - kindWeight(a.kind) ||
    numericSignal(b.primaryValue) - numericSignal(a.primaryValue) ||
    a.siteName.localeCompare(b.siteName)
  );
}

function severityWeight(severity: InsightSeverity): number {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function kindWeight(kind: InsightKind): number {
  switch (kind) {
    case "indexingOrPermissionIssue":
      return 70;
    case "decline":
      return 60;
    case "seoOpportunity":
      return 50;
    case "rankingOpportunity":
      return 40;
    case "trafficMismatch":
      return 30;
    case "duplicateProperty":
      return 20;
    case "growth":
      return 10;
  }
}

function numericSignal(value: string): number {
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Math.abs(Number(match[0])) : 0;
}

function isDashboardStale(value: string | null): boolean {
  if (!value) {
    return true;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return true;
  }
  const ageHours = (Date.now() - timestamp) / (60 * 60 * 1000);
  return ageHours > MAX_DASHBOARD_AGE_HOURS;
}

function allowStale(): boolean {
  return (
    process.argv.includes("--allow-stale") ||
    process.env.ALLOW_STALE_IMPROVEMENT_QUEUE === "true"
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  }
}

function renderIssueBody(queue: ImprovementQueue): string {
  const lines = [
    "# 자동 사이트 개선 큐",
    "",
    `- 생성: ${queue.generatedAt}`,
    `- 대시보드 스냅샷: ${queue.dashboardGeneratedAt ?? "없음"}`,
    `- 기준 기간: ${queue.dateRanges.last7Days.startDate} ~ ${queue.dateRanges.last7Days.endDate}`,
    `- 총 후보: ${queue.summary.totalItems}개 / 우선순위 높음: ${queue.summary.highSeverity}개`,
    `- T2 기술 적용 후보: ${queue.summary.t2Technical}개 / T3 콘텐츠 handoff: ${queue.summary.t3Content}개`,
    "",
    "## 운영 규칙",
    "",
    queue.operatingRule,
    "",
    "## 오늘의 상위 후보",
    "",
    ...queue.items.slice(0, 10).flatMap((item) => renderCompactItem(item)),
    "",
    "## Codex 실행 기준",
    "",
    "- T2는 해당 사이트 repo/WordPress 접근 후 백업, diff, 검증이 가능할 때만 적용합니다.",
    "- T3는 제목/본문/헤딩/본문 내부링크를 직접 바꾸지 않고 콘텐츠 작업 지시로 넘깁니다.",
    "- 개선 전에는 항상 최신 대시보드 갱신 결과를 다시 확인합니다.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function renderFullReport(queue: ImprovementQueue): string {
  const lines = [
    "# 사이트 개선 작업 큐",
    "",
    "> 이 문서는 `pnpm improvements:queue`가 `data/site-stats.json`에서 자동 생성합니다.",
    "> 수동 편집보다 대시보드 갱신 후 재생성을 우선합니다.",
    "",
    `- 생성: ${queue.generatedAt}`,
    `- 대시보드 스냅샷: ${queue.dashboardGeneratedAt ?? "없음"}`,
    `- 기준 기간: ${queue.dateRanges.last7Days.startDate} ~ ${queue.dateRanges.last7Days.endDate}`,
    `- 후보: ${queue.summary.totalItems}개`,
    "",
    "## 자동화 경계",
    "",
    "- T1: 현재 큐에는 모니터링/기록 수준만 자동 처리합니다.",
    "- T2: canonical, robots, sitemap, analytics, template 계열은 사이트 checkout/백업/검증 후 Codex가 적용할 수 있습니다.",
    "- T3: 제목, 본문, FAQ, 최신성 보강, 본문 내부링크는 콘텐츠 handoff입니다.",
    "",
    "## 후보 목록",
    "",
    ...queue.items.flatMap((item) => renderDetailedItem(item)),
    "",
    "## 대시보드 액션",
    "",
    ...queue.actions.map(
      (action, index) =>
        `${index + 1}. ${action.label} - ${action.siteName} (${hostOf(action.url)}): ${action.reason} / ${action.nextStep}`,
    ),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function renderCompactItem(item: ImprovementQueueItem): string[] {
  return [
    `### ${item.rank}. ${item.siteName} (${item.host})`,
    "",
    `- 유형: ${formatKind(item.kind)} / ${item.severity} / ${item.safetyTier} / ${item.automationMode}`,
    `- 핵심값: ${item.primaryValue}`,
    `- 이유: ${item.reason}`,
    `- 다음 작업: ${item.recommendedAction}`,
    `- 작업 지시: ${item.operatorPrompt}`,
    "",
  ];
}

function renderDetailedItem(item: ImprovementQueueItem): string[] {
  const queries =
    item.topQueries.length === 0
      ? ["- 상위 쿼리: 없음"]
      : item.topQueries.map(
          (query) =>
            `- 쿼리: ${escapeMarkdown(query.query)} / 클릭 ${query.clicks} / 노출 ${query.impressions} / CTR ${(query.ctr * 100).toFixed(1)}% / 순위 ${query.position.toFixed(1)}`,
        );
  return [
    `### ${item.rank}. ${item.siteName} (${item.host})`,
    "",
    `- URL: ${item.url}`,
    `- 유형: ${formatKind(item.kind)} / ${item.severity} / ${item.safetyTier} / ${item.automationMode}`,
    `- 핵심값: ${item.primaryValue}`,
    `- 이유: ${item.reason}`,
    `- 권장: ${item.recommendedAction}`,
    `- 검증: ${item.verification}`,
    `- 차단 조건: ${item.blockedBy.join(", ") || "없음"}`,
    `- GSC 진단: ${item.gscDiagnosis}`,
    `- 리뷰 메모: ${item.reviewNote}`,
    ...queries,
    "",
    "작업 지시:",
    "",
    "```text",
    item.operatorPrompt,
    "```",
    "",
  ];
}

function formatKind(kind: InsightKind): string {
  switch (kind) {
    case "growth":
      return "성장";
    case "decline":
      return "하락";
    case "seoOpportunity":
      return "CTR 개선";
    case "rankingOpportunity":
      return "순위 개선";
    case "trafficMismatch":
      return "유입 불일치";
    case "indexingOrPermissionIssue":
      return "색인/권한";
    case "duplicateProperty":
      return "중복 속성";
  }
}

function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, "\\|");
}

main();
