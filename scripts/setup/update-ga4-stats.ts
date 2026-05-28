import { mkdir, writeFile } from "node:fs/promises";
import pLimit from "p-limit";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { google } from "googleapis";
import { makeGoogleAuth, parseServiceAccountKey } from "./lib/gcp.js";
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
  gscSiteUrl: string;
  last7Days: MetricSet;
  last28Days: MetricSet;
  gscLast7Days: GscMetricSet;
  gscLast28Days: GscMetricSet;
  error?: string;
  gscError?: string;
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

function emptyGscMetrics(): GscMetricSet {
  return {
    clicks: 0,
    impressions: 0,
    ctr: 0,
    position: 0,
  };
}

function metricValue(row: unknown, index: number): number {
  const values = (row as { metricValues?: Array<{ value?: string | null }> }).metricValues ?? [];
  return Number(values[index]?.value ?? 0);
}

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function fetchGa4Metrics(client: BetaAnalyticsDataClient, propertyId: string, days: number): Promise<MetricSet> {
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

async function fetchGscMetrics(
  client: ReturnType<typeof google.searchconsole>,
  siteUrl: string,
  days: number,
): Promise<GscMetricSet> {
  const response = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: dateDaysAgo(days),
      endDate: dateDaysAgo(1),
      rowLimit: 1,
    },
  });
  const row = response.data.rows?.[0];

  if (!row) {
    return emptyGscMetrics();
  }

  return {
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  };
}

async function fetchSiteStat(
  ga4Client: BetaAnalyticsDataClient,
  gscClient: ReturnType<typeof google.searchconsole>,
  site: Site,
): Promise<SiteStat> {
  let last7Days = emptyMetrics();
  let last28Days = emptyMetrics();
  let gscLast7Days = emptyGscMetrics();
  let gscLast28Days = emptyGscMetrics();
  let error: string | undefined;
  let gscError: string | undefined;

  if (!site.ga4PropertyId) {
    error = "Missing ga4PropertyId";
  } else {
    try {
      [last7Days, last28Days] = await Promise.all([
        fetchGa4Metrics(ga4Client, site.ga4PropertyId, RANGE_DAYS),
        fetchGa4Metrics(ga4Client, site.ga4PropertyId, PREVIOUS_RANGE_DAYS),
      ]);
    } catch (ga4Error) {
      error = getErrorMessage(ga4Error);
    }
  }

  const gscSiteUrl = site.gscSiteUrl ?? site.url;

  try {
    [gscLast7Days, gscLast28Days] = await Promise.all([
      fetchGscMetrics(gscClient, gscSiteUrl, RANGE_DAYS),
      fetchGscMetrics(gscClient, gscSiteUrl, PREVIOUS_RANGE_DAYS),
    ]);
  } catch (searchError) {
    gscError = getErrorMessage(searchError);
  }

  const stat: SiteStat = {
    id: site.id,
    name: site.name ?? site.id,
    url: site.url,
    ga4PropertyId: site.ga4PropertyId ?? "",
    gscSiteUrl,
    last7Days,
    last28Days,
    gscLast7Days,
    gscLast28Days,
  };

  if (error) {
    stat.error = error;
  }

  if (gscError) {
    stat.gscError = gscError;
  }

  return stat;
}

async function main(): Promise<void> {
  loadLocalSecrets();
  const keyJson = readSecret("GCP_SA_KEY_JSON");

  if (!keyJson) {
    throw new Error("GCP_SA_KEY_JSON is missing. Add it to D:\\env\\키파일.txt or .env.setup.local.");
  }

  const sites = (await loadSites()).filter((site) => site.enabled !== false && site.ga4PropertyId);
  const credentials = parseServiceAccountKey(keyJson);
  const ga4Client = new BetaAnalyticsDataClient({ credentials });
  const auth = makeGoogleAuth(keyJson, ["https://www.googleapis.com/auth/webmasters.readonly"]);
  const gscClient = google.searchconsole({ version: "v1", auth });
  const limit = pLimit(CONCURRENCY);

  const stats = await Promise.all(sites.map((site) => limit(() => fetchSiteStat(ga4Client, gscClient, site))));
  const snapshot: StatsSnapshot = {
    generatedAt: new Date().toISOString(),
    rangeDays: RANGE_DAYS,
    previousRangeDays: PREVIOUS_RANGE_DAYS,
    stats: stats.sort((a, b) => b.last7Days.activeUsers - a.last7Days.activeUsers),
  };

  await mkdir("data", { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  const ga4Failed = stats.filter((site) => site.error).length;
  const gscFailed = stats.filter((site) => site.gscError).length;
  console.log(`Stats updated: ${stats.length} sites, GA4 failed=${ga4Failed}, GSC failed=${gscFailed}, output=${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
