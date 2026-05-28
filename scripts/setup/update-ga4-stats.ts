import { mkdir, writeFile } from "node:fs/promises";
import pLimit from "p-limit";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { parseServiceAccountKey } from "./lib/gcp.js";
import { loadLocalSecrets, readSecret } from "./lib/secrets.js";
import { loadSites, type Site } from "./lib/sites.js";
import { getErrorMessage } from "./lib/errors.js";

const OUTPUT_PATH = "data/site-stats.json";
const RANGE_DAYS = 7;
const PREVIOUS_RANGE_DAYS = 28;
const CONCURRENCY = 6;

interface MetricSet {
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  eventCount: number;
}

interface SiteStat {
  id: string;
  name: string;
  url: string;
  ga4PropertyId: string;
  last7Days: MetricSet;
  last28Days: MetricSet;
  error?: string;
}

interface StatsSnapshot {
  generatedAt: string;
  rangeDays: number;
  previousRangeDays: number;
  stats: SiteStat[];
}

function emptyMetrics(): MetricSet {
  return {
    activeUsers: 0,
    sessions: 0,
    screenPageViews: 0,
    eventCount: 0,
  };
}

function metricValue(row: unknown, index: number): number {
  const values = (row as { metricValues?: Array<{ value?: string | null }> }).metricValues ?? [];
  return Number(values[index]?.value ?? 0);
}

async function fetchMetrics(client: BetaAnalyticsDataClient, propertyId: string, days: number): Promise<MetricSet> {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "yesterday" }],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "eventCount" },
    ],
  });

  const row = response.rows?.[0];
  if (!row) {
    return emptyMetrics();
  }

  return {
    activeUsers: metricValue(row, 0),
    sessions: metricValue(row, 1),
    screenPageViews: metricValue(row, 2),
    eventCount: metricValue(row, 3),
  };
}

async function fetchSiteStat(client: BetaAnalyticsDataClient, site: Site): Promise<SiteStat> {
  const base = {
    id: site.id,
    name: site.name ?? site.id,
    url: site.url,
    ga4PropertyId: site.ga4PropertyId ?? "",
  };

  if (!site.ga4PropertyId) {
    return {
      ...base,
      last7Days: emptyMetrics(),
      last28Days: emptyMetrics(),
      error: "Missing ga4PropertyId",
    };
  }

  try {
    const [last7Days, last28Days] = await Promise.all([
      fetchMetrics(client, site.ga4PropertyId, RANGE_DAYS),
      fetchMetrics(client, site.ga4PropertyId, PREVIOUS_RANGE_DAYS),
    ]);

    return {
      ...base,
      last7Days,
      last28Days,
    };
  } catch (error) {
    return {
      ...base,
      last7Days: emptyMetrics(),
      last28Days: emptyMetrics(),
      error: getErrorMessage(error),
    };
  }
}

async function main(): Promise<void> {
  loadLocalSecrets();
  const keyJson = readSecret("GCP_SA_KEY_JSON");

  if (!keyJson) {
    throw new Error("GCP_SA_KEY_JSON is missing. Add it to D:\\env\\키파일.txt or .env.setup.local.");
  }

  const sites = (await loadSites()).filter((site) => site.enabled !== false && site.ga4PropertyId);
  const client = new BetaAnalyticsDataClient({ credentials: parseServiceAccountKey(keyJson) });
  const limit = pLimit(CONCURRENCY);

  const stats = await Promise.all(sites.map((site) => limit(() => fetchSiteStat(client, site))));
  const snapshot: StatsSnapshot = {
    generatedAt: new Date().toISOString(),
    rangeDays: RANGE_DAYS,
    previousRangeDays: PREVIOUS_RANGE_DAYS,
    stats: stats.sort((a, b) => b.last7Days.activeUsers - a.last7Days.activeUsers),
  };

  await mkdir("data", { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  const failed = stats.filter((site) => site.error).length;
  console.log(`GA4 stats updated: ${stats.length} sites, ${failed} failed, output=${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
