import { readFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const STATS_PATH = "data/site-stats.json";
const SUMMARY_FILE = process.env.GITHUB_STEP_SUMMARY;

interface MetricSet {
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  eventCount: number;
}

interface GscMetricSet {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SiteStat {
  id: string;
  name: string;
  url: string;
  ga4PropertyId: string;
  last7Days: MetricSet;
  previous7Days?: MetricSet;
  gscLast7Days?: GscMetricSet;
  gscPrevious7Days?: GscMetricSet;
  operationalStatus?: string;
  error?: string;
  gscError?: string;
}

interface StatsSnapshot {
  generatedAt: string | null;
  stats: SiteStat[];
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function changeRate(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

function formatChange(value: number | null): string {
  if (value === null) return "신규";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatPercent(value)}`;
}

async function main(): Promise<void> {
  if (!existsSync(STATS_PATH)) {
    console.error(`Stats file not found: ${STATS_PATH}`);
    process.exit(1);
  }

  const raw = await readFile(STATS_PATH, "utf8");
  const snapshot = JSON.parse(raw) as StatsSnapshot;
  const { stats } = snapshot;

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });

  // 상위 10개 사이트 (7일 활성 사용자 기준)
  const top10 = [...stats]
    .sort((a, b) => b.last7Days.activeUsers - a.last7Days.activeUsers)
    .slice(0, 10);

  // 트래픽 급감 사이트 (-30% 이하, previous7Days.activeUsers >= 10)
  const trafficDrops = stats
    .filter((s) => {
      const prev = s.previous7Days?.activeUsers ?? 0;
      if (prev < 10) return false;
      const change = changeRate(s.last7Days.activeUsers, prev);
      return change !== null && change <= -0.3;
    })
    .sort((a, b) => {
      const ca =
        changeRate(
          a.last7Days.activeUsers,
          a.previous7Days?.activeUsers ?? 0,
        ) ?? 0;
      const cb =
        changeRate(
          b.last7Days.activeUsers,
          b.previous7Days?.activeUsers ?? 0,
        ) ?? 0;
      return ca - cb;
    });

  // 운영 문제 사이트
  const issueStats = stats.filter((s) => s.error || s.gscError);

  // GSC 집계
  const totalGscClicks = stats.reduce(
    (sum, s) => sum + (s.gscLast7Days?.clicks ?? 0),
    0,
  );
  const totalGscImpressions = stats.reduce(
    (sum, s) => sum + (s.gscLast7Days?.impressions ?? 0),
    0,
  );

  const lines: string[] = [
    `# 주간 대시보드 리포트 — ${today}`,
    "",
    `> 전체 사이트 **${formatNumber(stats.length)}개** 기준`,
    "",
    "## 상위 10개 사이트 (7일 활성 사용자)",
    "",
    "| 순위 | 사이트 | 7일 사용자 | 증감 |",
    "| --- | --- | --- | --- |",
  ];

  for (const [i, s] of top10.entries()) {
    const prev = s.previous7Days?.activeUsers ?? 0;
    const change = changeRate(s.last7Days.activeUsers, prev);
    lines.push(
      `| ${i + 1} | ${s.name} | ${formatNumber(s.last7Days.activeUsers)} | ${formatChange(change)} |`,
    );
  }

  lines.push("", "## 트래픽 급감 사이트", "");

  if (trafficDrops.length === 0) {
    lines.push("급감 사이트 없음");
  } else {
    lines.push("| 사이트 | 7일 사용자 | 증감 |", "| --- | --- | --- |");
    for (const s of trafficDrops) {
      const prev = s.previous7Days?.activeUsers ?? 0;
      const change = changeRate(s.last7Days.activeUsers, prev);
      lines.push(
        `| ${s.name} | ${formatNumber(s.last7Days.activeUsers)} | ${formatChange(change)} |`,
      );
    }
  }

  lines.push("", "## 운영 문제 사이트", "");

  if (issueStats.length === 0) {
    lines.push("운영 문제 없음");
  } else {
    lines.push("| 사이트 | GA4 오류 | GSC 오류 |", "| --- | --- | --- |");
    for (const s of issueStats) {
      lines.push(`| ${s.name} | ${s.error ?? "-"} | ${s.gscError ?? "-"} |`);
    }
  }

  lines.push(
    "",
    "## GSC 주요 지표 (7일)",
    "",
    `- 총 클릭: **${formatNumber(totalGscClicks)}**`,
    `- 총 노출: **${formatNumber(totalGscImpressions)}**`,
    "",
  );

  const markdown = lines.join("\n");

  if (SUMMARY_FILE) {
    await appendFile(SUMMARY_FILE, markdown, "utf8");
    console.log("Weekly report written to GitHub Step Summary.");
  } else {
    console.log(markdown);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
