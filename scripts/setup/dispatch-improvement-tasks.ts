import { existsSync, readFileSync, writeFileSync } from "node:fs";

type SafetyTier = "T1" | "T2" | "T3";
type AutomationMode =
  | "monitor_only"
  | "codex_apply_after_site_checkout"
  | "content_handoff"
  | "manual_review";

interface QueueItem {
  rank: number;
  id: string;
  siteId: string;
  siteName: string;
  url: string;
  host: string;
  kind: string;
  severity: string;
  safetyTier: SafetyTier;
  automationMode: AutomationMode;
  primaryValue: string;
  reason: string;
  recommendedAction: string;
  operatorPrompt: string;
  verification: string;
  evidence: string[];
  relatedSignals: string[];
  blockedBy: string[];
}

interface ImprovementQueue {
  generatedAt: string;
  dashboardGeneratedAt: string | null;
  summary: {
    totalItems: number;
    t2Technical: number;
    t3Content: number;
  };
  items: QueueItem[];
}

interface DispatchRecord {
  generatedAt: string;
  dashboardGeneratedAt: string | null;
  dryRun: boolean;
  dispatched: DispatchResult[];
  skipped: DispatchSkip[];
}

interface DispatchResult {
  siteId: string;
  host: string;
  repository: string;
  issueNumber: number;
  issueUrl: string;
  action: "created" | "updated";
}

interface DispatchSkip {
  siteId: string;
  host: string;
  reason: string;
}

const QUEUE_PATH = "data/site-improvement-queue.json";
const REPORT_PATH = "data/site-improvement-dispatch.json";
const MAP_PATH = "scripts/setup/site-repo-map.json";
const MAX_DISPATCH = Number(process.env.IMPROVEMENT_DISPATCH_MAX ?? 5);
const DRY_RUN = process.argv.includes("--dry-run");
const TOKEN = process.env.SITE_AUTOMATION_TOKEN ?? process.env.GH_TOKEN;
const DASHBOARD_REPOSITORY =
  process.env.GITHUB_REPOSITORY ?? process.env.GH_REPOSITORY ?? "lsk7209/multi-dashboard";

async function main(): Promise<void> {
  const queue = readJson<ImprovementQueue>(QUEUE_PATH);
  const repoMap = readJson<Record<string, string>>(MAP_PATH);
  const candidates = queue.items
    .filter((item) => item.safetyTier === "T2")
    .filter((item) => item.automationMode === "codex_apply_after_site_checkout")
    .slice(0, MAX_DISPATCH);
  const dispatched: DispatchResult[] = [];
  const skipped: DispatchSkip[] = [];

  for (const item of candidates) {
    const repository = repoMap[item.host] ?? DASHBOARD_REPOSITORY;
    if (!repoMap[item.host]) {
      skipped.push({
        siteId: item.siteId,
        host: item.host,
        reason: "target repository is not mapped; kept in dashboard queue",
      });
      continue;
    }

    if (DRY_RUN) {
      dispatched.push({
        siteId: item.siteId,
        host: item.host,
        repository,
        issueNumber: 0,
        issueUrl: `dry-run:${repository}`,
        action: "created",
      });
      continue;
    }

    if (!TOKEN) {
      skipped.push({
        siteId: item.siteId,
        host: item.host,
        reason: "SITE_AUTOMATION_TOKEN or GH_TOKEN is missing",
      });
      continue;
    }

    const result = await upsertIssue(repository, item, queue);
    dispatched.push(result);
  }

  const record: DispatchRecord = {
    generatedAt: new Date().toISOString(),
    dashboardGeneratedAt: queue.dashboardGeneratedAt,
    dryRun: DRY_RUN,
    dispatched,
    skipped,
  };
  writeFileSync(REPORT_PATH, `${JSON.stringify(record, null, 2)}\n`);
  console.log(
    `Improvement dispatch complete: dispatched=${dispatched.length}, skipped=${skipped.length}, dryRun=${DRY_RUN}`,
  );
}

async function upsertIssue(
  repository: string,
  item: QueueItem,
  queue: ImprovementQueue,
): Promise<DispatchResult> {
  const label = "dashboard-auto-improvement";
  const title = `[자동개선] ${item.host}: ${formatKind(item.kind)} ${item.primaryValue}`;
  const body = renderIssueBody(item, queue);
  await ensureLabel(repository, label);
  const existing = await findExistingIssue(repository, label, item.siteId);

  if (existing) {
    await githubApi(
      `https://api.github.com/repos/${repository}/issues/${existing.number}`,
      {
        method: "PATCH",
        body: JSON.stringify({ title, body }),
      },
    );
    return {
      siteId: item.siteId,
      host: item.host,
      repository,
      issueNumber: existing.number,
      issueUrl: existing.html_url,
      action: "updated",
    };
  }

  const created = await githubApi<{ number: number; html_url: string }>(
    `https://api.github.com/repos/${repository}/issues`,
    {
      method: "POST",
      body: JSON.stringify({ title, body, labels: [label] }),
    },
  );
  return {
    siteId: item.siteId,
    host: item.host,
    repository,
    issueNumber: created.number,
    issueUrl: created.html_url,
    action: "created",
  };
}

async function findExistingIssue(
  repository: string,
  label: string,
  siteId: string,
): Promise<{ number: number; html_url: string } | undefined> {
  const params = new URLSearchParams({
    labels: label,
    state: "open",
    per_page: "20",
  });
  const issues = await githubApi<Array<{ number: number; html_url: string; body?: string }>>(
    `https://api.github.com/repos/${repository}/issues?${params.toString()}`,
  );
  return issues.find((issue) => issue.body?.includes(`siteId: ${siteId}`));
}

async function ensureLabel(repository: string, label: string): Promise<void> {
  try {
    await githubApi(`https://api.github.com/repos/${repository}/labels/${label}`);
  } catch {
    await githubApi(`https://api.github.com/repos/${repository}/labels`, {
      method: "POST",
      body: JSON.stringify({
        name: label,
        color: "1D76DB",
        description: "Dashboard generated technical improvement task",
      }),
    });
  }
}

async function githubApi<T = unknown>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  if (!TOKEN) {
    throw new Error("Missing GitHub token");
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status} ${response.statusText}: ${text}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function renderIssueBody(item: QueueItem, queue: ImprovementQueue): string {
  const evidence = item.evidence.map((line) => `- ${line}`).join("\n");
  const related =
    item.relatedSignals.length > 0
      ? item.relatedSignals.map((line) => `- ${line}`).join("\n")
      : "- 없음";
  const blockers =
    item.blockedBy.length > 0
      ? item.blockedBy.map((line) => `- ${line}`).join("\n")
      : "- 없음";

  return [
    "<!-- dashboard-auto-improvement -->",
    `siteId: ${item.siteId}`,
    `queueItemId: ${item.id}`,
    "",
    "# 자동 개선 작업",
    "",
    `- 사이트: ${item.siteName} (${item.host})`,
    `- URL: ${item.url}`,
    `- 대시보드 스냅샷: ${queue.dashboardGeneratedAt ?? "없음"}`,
    `- 큐 생성: ${queue.generatedAt}`,
    `- 유형: ${formatKind(item.kind)} / ${item.severity} / ${item.safetyTier}`,
    `- 핵심값: ${item.primaryValue}`,
    "",
    "## 원인",
    "",
    item.reason,
    "",
    "## 권장 작업",
    "",
    item.recommendedAction,
    "",
    "## Codex 작업 지시",
    "",
    "```text",
    item.operatorPrompt,
    "```",
    "",
    "## 검증 기준",
    "",
    item.verification,
    "",
    "## 근거",
    "",
    evidence,
    "",
    "## 관련 신호",
    "",
    related,
    "",
    "## 적용 전 차단 조건",
    "",
    blockers,
    "",
    "## 안전 규칙",
    "",
    "- 개별 사이트 수정 전 백업 또는 rollback 경로를 확보합니다.",
    "- 제목, 본문, FAQ, 본문 내부링크는 이 자동 작업에서 직접 수정하지 않습니다.",
    "- 수정 후 빌드/테스트/스모크 체크를 통과한 뒤 PR 또는 일반 GitHub 배포 경로로만 반영합니다.",
    "",
  ].join("\n");
}

function readJson<T>(path: string): T {
  if (!existsSync(path)) {
    throw new Error(`Missing required file: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function formatKind(kind: string): string {
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
    default:
      return kind;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
