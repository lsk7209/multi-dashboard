import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getDashboardData, type SiteInsight } from "../../app/lib/dashboard-data.js";
import { looksGarbledText } from "../../app/lib/text-readability.js";

type InsightRollup = {
  siteId: string;
  siteName: string;
  url: string;
  insightCount: number;
  highCount: number;
  primaryCause: SiteInsight["cause"];
  primaryReason: string;
  nextGate: string;
  causes: string[];
};

type InsightFollowupPayload = {
  date: string;
  generatedAt: string;
  sourceSnapshot: {
    generatedAt: string;
    siteCount: number;
    actionCount: number;
    insightCount: number;
    connectorStatus: {
      ga4Failed: number;
      gscFailed: number;
      adsenseFailed: number;
      sitemapFailed: number;
    };
  };
  counts: {
    byKind: Record<string, number>;
    byCause: Record<string, number>;
    bySeverity: Record<string, number>;
    bySampleSize: Record<string, number>;
  };
  topRollups: InsightRollup[];
  topActions: Array<{
    siteId: string;
    siteName: string;
    url: string;
    kind: string;
    priority: number;
    reason: string;
    nextStep: string;
  }>;
  safety: {
    mode: string;
    productionMutationPerformed: boolean;
    forbiddenWithoutExplicitApproval: string[];
  };
};

const DATE = "2026-07-07";
const JSON_PATH = `data/dashboard-insight-followup-${DATE}.json`;
const MD_PATH = `docs/work-orders/dashboard-insight-followup-${DATE}.md`;

function main() {
  const data = getDashboardData();
  const rollups = buildRollups(data.insights);
  const counts = {
    byKind: countBy(data.insights, (insight) => insight.kind),
    byCause: countBy(data.insights, (insight) => insight.cause),
    bySeverity: countBy(data.insights, (insight) => insight.severity),
    bySampleSize: countBy(data.insights, (insight) => insight.sampleSize),
  };
  const payload: InsightFollowupPayload = {
    date: DATE,
    generatedAt: new Date().toISOString(),
    sourceSnapshot: {
      generatedAt: data.generatedAt,
      siteCount: data.siteCount,
      actionCount: data.actions.length,
      insightCount: data.insights.length,
      connectorStatus: {
        ga4Failed: data.stats.filter((stat) => stat.ga4Status !== "ok").length,
        gscFailed: data.stats.filter((stat) => stat.gscStatus !== "ok").length,
        adsenseFailed: data.stats.filter((stat) => stat.adsenseStatus === "error").length,
        sitemapFailed: data.stats.filter((stat) => stat.sitemapStatus === "error").length,
      },
    },
    counts,
    topRollups: rollups.slice(0, 12),
    topActions: data.actions.slice(0, 16).map((action) => ({
      siteId: action.siteId,
      siteName: displaySite(action.siteName, action.url, action.siteId),
      url: action.url,
      kind: action.kind,
      priority: action.priority,
      reason: summarizeActionReason(action.kind),
      nextStep: summarizeActionNextStep(action.kind),
    })),
    safety: {
      mode: "read_only_dashboard_report",
      productionMutationPerformed: false,
      forbiddenWithoutExplicitApproval: [
        "Vercel production deploy",
        "Git push",
        "WordPress publish/update/schedule",
        "Search Console sitemap submission or indexing request",
        "production DB write/backfill/migration",
        "AdSense console change",
      ],
    },
  };

  writeJson(JSON_PATH, payload);
  writeText(MD_PATH, renderMarkdown(payload));
  console.log(
    `Dashboard insight follow-up written: ${JSON_PATH}, ${MD_PATH} snapshot=${data.generatedAt} insights=${data.insights.length}`,
  );
}

function buildRollups(insights: SiteInsight[]): InsightRollup[] {
  const bySite = new Map<string, SiteInsight[]>();
  for (const insight of insights) {
    bySite.set(insight.siteId, [...(bySite.get(insight.siteId) ?? []), insight]);
  }

  return [...bySite.entries()]
    .flatMap(([siteId, siteInsights]) => {
      const sorted = [...siteInsights].sort(compareInsights);
      const primary = sorted[0];
      if (!primary) return [];
      return [{
        siteId,
        siteName: displaySite(primary.siteName, primary.url, siteId),
        url: primary.url,
        insightCount: sorted.length,
        highCount: sorted.filter((insight) => insight.severity === "high").length,
        primaryCause: primary.cause,
        primaryReason: cleanText(primary.reason, "Grouped dashboard insight requires review."),
        nextGate: getNextGate(sorted),
        causes: [...new Set(sorted.map((insight) => insight.cause))],
      }];
    })
    .sort((a, b) => {
      if (b.highCount !== a.highCount) return b.highCount - a.highCount;
      return b.insightCount - a.insightCount;
    });
}

function renderMarkdown(payload: InsightFollowupPayload): string {
  const topRollupRows = payload.topRollups
    .map(
      (rollup, index) =>
        `| ${index + 1} | \`${rollup.siteId}\` | ${rollup.siteName} | ${rollup.insightCount} | ${rollup.highCount} | ${formatCause(rollup.primaryCause)} | ${rollup.nextGate} |`,
    )
    .join("\n");
  const actionRows = payload.topActions
    .map(
      (action, index) =>
        `| ${index + 1} | \`${action.siteId}\` | ${action.siteName} | ${action.reason} | ${action.nextStep} |`,
    )
    .join("\n");

  return `# Dashboard Insight Follow-up - ${payload.date}

## Source

| Field | Value |
|---|---:|
| Snapshot | ${payload.sourceSnapshot.generatedAt} |
| Sites | ${payload.sourceSnapshot.siteCount} |
| Insights | ${payload.sourceSnapshot.insightCount} |
| Actions | ${payload.sourceSnapshot.actionCount} |
| GA4 failures | ${payload.sourceSnapshot.connectorStatus.ga4Failed} |
| GSC failures | ${payload.sourceSnapshot.connectorStatus.gscFailed} |
| Sitemap failures | ${payload.sourceSnapshot.connectorStatus.sitemapFailed} |

## Insight Counts

| Cause | Count |
|---|---:|
${Object.entries(payload.counts.byCause)
  .map(([cause, count]) => `| ${formatCause(cause as SiteInsight["cause"])} | ${count} |`)
  .join("\n")}

## Site Rollup Priority

| # | Site ID | Site | Signals | High | Primary Cause | Next Gate |
|---:|---|---|---:|---:|---|---|
${topRollupRows}

## Action Queue Priority

| # | Site ID | Site | Reason | Next Step |
|---:|---|---|---|---|
${actionRows}

## Safety Gate

- This report is read-only and local.
- Production mutation performed: \`${payload.safety.productionMutationPerformed}\`.
- Do not run deploy, Git push, WordPress publish/update, GSC submission, DB writes, or AdSense console changes from this packet without explicit approval.
`;
}

function countBy<T>(items: T[], getKey: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function cleanText(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed || looksGarbledText(trimmed)) {
    return fallback;
  }
  return trimmed;
}

function displaySite(siteName: string, url: string, fallback: string): string {
  const host = formatHost(url);
  if (host) {
    return host;
  }
  return cleanText(siteName, fallback);
}

function formatHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function summarizeActionReason(kind: string): string {
  switch (kind) {
    case "sitemap":
      return "GSC sitemap freshness warning.";
    case "decline":
      return "Traffic or search decline requires review.";
    case "seo":
      return "CTR improvement candidate.";
    case "ranking":
      return "Ranking improvement candidate.";
    case "permission":
    case "owner":
      return "Search Console authority or ownership check required.";
    case "monetization":
      return "Monetization setup or proof check required.";
    case "data":
      return "Dashboard data collection check required.";
    default:
      return "Dashboard action candidate requires review.";
  }
}

function summarizeActionNextStep(kind: string): string {
  switch (kind) {
    case "sitemap":
      return "Verify sitemap freshness and robots reference before any Search Console action.";
    case "decline":
      return "Compare recent publishing, channel, and indexability changes.";
    case "seo":
      return "Use fresh GSC queries before title or meta work.";
    case "ranking":
      return "Review page freshness, FAQ coverage, and internal link opportunities.";
    default:
      return "Review local evidence first; do not mutate production from this packet.";
  }
}

function compareInsights(a: SiteInsight, b: SiteInsight): number {
  const severityDiff = severityRank(b.severity) - severityRank(a.severity);
  if (severityDiff !== 0) return severityDiff;
  const sampleDiff = sampleRank(b.sampleSize) - sampleRank(a.sampleSize);
  if (sampleDiff !== 0) return sampleDiff;
  return confidenceRank(b.confidence) - confidenceRank(a.confidence);
}

function getNextGate(insights: SiteInsight[]): string {
  if (insights.some((insight) => insight.cause === "gsc_zero")) {
    return "Check GSC property, sitemap, canonical, and robots first.";
  }
  if (insights.some((insight) => insight.cause === "mixed_decline")) {
    return "Split GA4 channel decline and GSC query decline together.";
  }
  if (insights.some((insight) => insight.cause === "gsc_drop")) {
    return "Review top queries, CTR, and ranking drop pages.";
  }
  if (insights.some((insight) => insight.cause === "ga4_drop")) {
    return "Check recent publishing, collection, API, and channel changes.";
  }
  if (insights.some((insight) => insight.cause === "ga4_low_sample_channel_unknown")) {
    return "Review GA4 source/medium and landing pages before SEO changes.";
  }
  if (insights.some((insight) => insight.cause === "ctr")) {
    return "Use fresh GSC queries for title/meta review.";
  }
  return "Review grouped signals before applying site changes.";
}

function formatCause(cause: SiteInsight["cause"]): string {
  const labels: Record<SiteInsight["cause"], string> = {
    ga4_drop: "GA4 drop",
    ga4_low_sample_channel_unknown: "GA4 low-sample channel unknown",
    gsc_drop: "GSC drop",
    mixed_decline: "Mixed decline",
    gsc_zero: "GSC zero",
    gsc_error: "GSC error",
    ctr: "CTR",
    ranking: "Ranking",
    growth: "Growth",
    traffic_mismatch: "Traffic mismatch",
    duplicate: "Duplicate",
  };
  return labels[cause];
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

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(path: string, value: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, "utf8");
}

main();
