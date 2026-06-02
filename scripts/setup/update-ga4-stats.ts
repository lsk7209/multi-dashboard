import { mkdir, writeFile } from "node:fs/promises";
import pLimit from "p-limit";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { google } from "googleapis";
import { makeGoogleAuth, parseServiceAccountKey } from "./lib/gcp.js";
import { loadLocalSecrets, readSecret } from "./lib/secrets.js";
import { loadSites, type Site } from "./lib/sites.js";
import { getErrorMessage } from "./lib/errors.js";

const OUTPUT_PATH = "data/site-stats.json";
const DAY_RANGE = 1;
const RANGE_DAYS = 7;
const LONG_RANGE_DAYS = 30;
const CONCURRENCY = 6;
const ADSENSE_PUBLISHER_ID = "pub-3050601904412736";

type CollectionStatus = "ok" | "auth_error" | "api_error" | "missing_config";
type ErrorKind =
  | "permission"
  | "not_found"
  | "quota"
  | "missing_config"
  | "api_error";

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

interface SitemapSummary {
  sitemapLastDownloadedAt?: string;
  sitemapLastSubmittedAt?: string;
  sitemapPath?: string;
  sitemapWarnings?: number;
  sitemapErrors?: number;
}

interface SiteStat {
  id: string;
  name: string;
  url: string;
  ga4PropertyId: string;
  gscSiteUrl: string;
  last1Days: MetricSet;
  last7Days: MetricSet;
  previous7Days: MetricSet;
  last30Days: MetricSet;
  gscLast7Days: GscMetricSet;
  gscPrevious7Days: GscMetricSet;
  gscLast30Days: GscMetricSet;
  ga4Status: CollectionStatus;
  gscStatus: CollectionStatus;
  adsenseStatus?: CollectionStatus;
  adsTxtStatus?: CollectionStatus;
  ga4LastSuccessfulFetchAt?: string;
  gscLastSuccessfulFetchAt?: string;
  adsenseLastSuccessfulFetchAt?: string;
  adsTxtLastSuccessfulFetchAt?: string;
  sitemapLastDownloadedAt?: string;
  sitemapLastSubmittedAt?: string;
  sitemapPath?: string;
  sitemapWarnings?: number;
  sitemapErrors?: number;
  ga4ErrorKind?: ErrorKind;
  gscErrorKind?: ErrorKind;
  adsenseErrorKind?: ErrorKind;
  adsTxtErrorKind?: ErrorKind;
  sitemapErrorKind?: ErrorKind;
  error?: string;
  gscError?: string;
  adsenseError?: string;
  adsTxtError?: string;
  sitemapError?: string;
  lastPublishedAt?: string;
}

interface StatsSnapshot {
  generatedAt: string;
  rangeDays: number;
  previousRangeDays: number;
  longRangeDays: number;
  dateRanges: DateRangeSummary;
  stats: SiteStat[];
}

interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangeSummary {
  timezone: "Asia/Seoul";
  basis: "completed_days";
  last1Days: DateRange;
  last7Days: DateRange;
  previous7Days: DateRange;
  last30Days: DateRange;
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
  const values =
    (row as { metricValues?: Array<{ value?: string | null }> }).metricValues ??
    [];
  return Number(values[index]?.value ?? 0);
}

function seoulDateDaysAgo(days: number): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
  const date = new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12),
  );
  date.setUTCDate(date.getUTCDate() - days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildDateRange(days: number): DateRange {
  return {
    startDate: seoulDateDaysAgo(days),
    endDate: seoulDateDaysAgo(1),
  };
}

function buildDateRanges(): DateRangeSummary {
  return {
    timezone: "Asia/Seoul",
    basis: "completed_days",
    last1Days: buildDateRange(DAY_RANGE),
    last7Days: buildDateRange(RANGE_DAYS),
    previous7Days: {
      startDate: seoulDateDaysAgo(14),
      endDate: seoulDateDaysAgo(8),
    },
    last30Days: buildDateRange(LONG_RANGE_DAYS),
  };
}

function toGa4StartDate(days: number): string {
  return `${days}daysAgo`;
}

function classifyError(error: string): ErrorKind {
  const normalized = error.toLowerCase();

  if (
    normalized.includes("permission") ||
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden")
  ) {
    return "permission";
  }

  if (
    normalized.includes("not found") ||
    normalized.includes("not_found") ||
    normalized.includes("404")
  ) {
    return "not_found";
  }

  if (
    normalized.includes("quota") ||
    normalized.includes("rate limit") ||
    normalized.includes("429")
  ) {
    return "quota";
  }

  if (normalized.includes("missing")) {
    return "missing_config";
  }

  return "api_error";
}

function statusFromError(
  error: string | undefined,
  fallback: CollectionStatus,
): CollectionStatus {
  if (!error) {
    return "ok";
  }

  const kind = classifyError(error);
  if (kind === "permission" || kind === "not_found") {
    return "auth_error";
  }

  if (kind === "missing_config") {
    return "missing_config";
  }

  return fallback;
}

function monetizationStatusFromError(
  error: string | undefined,
): CollectionStatus {
  if (!error) {
    return "ok";
  }

  const kind = classifyError(error);
  if (kind === "missing_config" || kind === "not_found") {
    return "missing_config";
  }

  return "api_error";
}

async function fetchGa4Metrics(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  days: number,
): Promise<MetricSet> {
  return fetchGa4MetricsForRange(
    client,
    propertyId,
    toGa4StartDate(days),
    "yesterday",
  );
}

async function fetchPreviousGa4Metrics(
  client: BetaAnalyticsDataClient,
  propertyId: string,
): Promise<MetricSet> {
  return fetchGa4MetricsForRange(client, propertyId, "14daysAgo", "8daysAgo");
}

async function fetchGa4MetricsForRange(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<MetricSet> {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
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
  return fetchGscMetricsForRange(
    client,
    siteUrl,
    seoulDateDaysAgo(days),
    seoulDateDaysAgo(1),
  );
}

async function fetchPreviousGscMetrics(
  client: ReturnType<typeof google.searchconsole>,
  siteUrl: string,
): Promise<GscMetricSet> {
  return fetchGscMetricsForRange(
    client,
    siteUrl,
    seoulDateDaysAgo(14),
    seoulDateDaysAgo(8),
  );
}

async function fetchGscMetricsForRange(
  client: ReturnType<typeof google.searchconsole>,
  siteUrl: string,
  startDate: string,
  endDate: string,
): Promise<GscMetricSet> {
  const response = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
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

async function fetchSitemapSummary(
  client: ReturnType<typeof google.searchconsole>,
  siteUrl: string,
): Promise<SitemapSummary> {
  const response = await client.sitemaps.list({ siteUrl });
  const sitemaps = response.data.sitemap ?? [];
  const datedSitemaps = sitemaps
    .filter((sitemap) => sitemap.lastDownloaded || sitemap.lastSubmitted)
    .sort(
      (a, b) =>
        Date.parse(b.lastDownloaded ?? b.lastSubmitted ?? "") -
        Date.parse(a.lastDownloaded ?? a.lastSubmitted ?? ""),
    );
  const selected =
    datedSitemaps.find((sitemap) => isXmlSitemapPath(sitemap.path)) ??
    datedSitemaps[0];

  if (!selected) {
    return {};
  }

  const summary: SitemapSummary = {};
  const warnings = toOptionalNumber(selected.warnings);
  const errors = toOptionalNumber(selected.errors);

  if (selected.lastDownloaded) {
    summary.sitemapLastDownloadedAt = selected.lastDownloaded;
  }
  if (selected.lastSubmitted) {
    summary.sitemapLastSubmittedAt = selected.lastSubmitted;
  }
  if (selected.path) {
    summary.sitemapPath = selected.path;
  }
  if (warnings !== undefined) {
    summary.sitemapWarnings = warnings;
  }
  if (errors !== undefined) {
    summary.sitemapErrors = errors;
  }

  return summary;
}

function isXmlSitemapPath(path: string | null | undefined): boolean {
  if (!path) {
    return false;
  }

  const normalized = path.toLowerCase();
  return (
    normalized.includes("sitemap") &&
    !normalized.endsWith("/feed.xml") &&
    !normalized.endsWith("/rss.xml")
  );
}

function toOptionalNumber(
  value: string | number | null | undefined,
): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

async function fetchWpStats(
  site: Site,
): Promise<Pick<SiteStat, "lastPublishedAt">> {
  if (!site.wpRestBase) {
    return {};
  }

  try {
    const url = `${site.wpRestBase.replace(/\/$/, "")}/posts?per_page=1&orderby=date&order=desc&_fields=date_gmt`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      return {};
    }
    const posts = (await response.json()) as Array<{ date_gmt?: string }>;
    const dateGmt = posts[0]?.date_gmt;
    if (!dateGmt) {
      return {};
    }
    return { lastPublishedAt: `${dateGmt}Z` };
  } catch {
    return {};
  }
}

async function fetchAdsenseCodeStatus(site: Site): Promise<void> {
  const response = await fetch(site.url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    throw new Error(`Homepage unavailable: ${response.status}`);
  }

  const html = await response.text();
  const normalized = html.toLowerCase();
  const hasAdsenseCode =
    normalized.includes("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js") ||
    normalized.includes("adsbygoogle") ||
    normalized.includes("ca-pub-");

  if (!hasAdsenseCode) {
    throw new Error("AdSense code not detected on homepage");
  }
}

async function fetchAdsTxtStatus(site: Site): Promise<void> {
  const adsTxtUrl = new URL("/ads.txt", site.url).toString();
  const response = await fetch(adsTxtUrl, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`ads.txt unavailable: ${response.status}`);
  }

  const body = await response.text();
  const normalized = body.toLowerCase();
  if (!normalized.includes("google.com")) {
    throw new Error("Missing ads.txt Google publisher entry");
  }

  if (!normalized.includes(ADSENSE_PUBLISHER_ID)) {
    throw new Error(`Missing ads.txt publisher ${ADSENSE_PUBLISHER_ID}`);
  }
}

async function fetchSiteStat(
  ga4Client: BetaAnalyticsDataClient,
  gscClient: ReturnType<typeof google.searchconsole>,
  site: Site,
): Promise<SiteStat> {
  let last1Days = emptyMetrics();
  let last7Days = emptyMetrics();
  let previous7Days = emptyMetrics();
  let last30Days = emptyMetrics();
  let gscLast7Days = emptyGscMetrics();
  let gscPrevious7Days = emptyGscMetrics();
  let gscLast30Days = emptyGscMetrics();
  let sitemapSummary: SitemapSummary = {};
  let error: string | undefined;
  let gscError: string | undefined;
  let sitemapError: string | undefined;
  let adsenseError: string | undefined;
  let adsTxtError: string | undefined;
  const collectedAt = new Date().toISOString();

  if (!site.ga4PropertyId) {
    error = "Missing ga4PropertyId";
  } else {
    try {
      [last1Days, last7Days, previous7Days, last30Days] = await Promise.all([
        fetchGa4Metrics(ga4Client, site.ga4PropertyId, DAY_RANGE),
        fetchGa4Metrics(ga4Client, site.ga4PropertyId, RANGE_DAYS),
        fetchPreviousGa4Metrics(ga4Client, site.ga4PropertyId),
        fetchGa4Metrics(ga4Client, site.ga4PropertyId, LONG_RANGE_DAYS),
      ]);
    } catch (ga4Error) {
      error = getErrorMessage(ga4Error);
    }
  }

  const gscSiteUrl = site.gscSiteUrl ?? site.url;

  try {
    [gscLast7Days, gscPrevious7Days, gscLast30Days] = await Promise.all([
      fetchGscMetrics(gscClient, gscSiteUrl, RANGE_DAYS),
      fetchPreviousGscMetrics(gscClient, gscSiteUrl),
      fetchGscMetrics(gscClient, gscSiteUrl, LONG_RANGE_DAYS),
    ]);
  } catch (searchError) {
    gscError = getErrorMessage(searchError);
  }

  try {
    sitemapSummary = await fetchSitemapSummary(gscClient, gscSiteUrl);
  } catch (searchError) {
    sitemapError = getErrorMessage(searchError);
  }

  try {
    await fetchAdsenseCodeStatus(site);
  } catch (statusError) {
    adsenseError = getErrorMessage(statusError);
  }

  try {
    await fetchAdsTxtStatus(site);
  } catch (statusError) {
    adsTxtError = getErrorMessage(statusError);
  }

  const stat: SiteStat = {
    id: site.id,
    name: site.name ?? site.id,
    url: site.url,
    ga4PropertyId: site.ga4PropertyId ?? "",
    gscSiteUrl,
    last1Days,
    last7Days,
    previous7Days,
    last30Days,
    gscLast7Days,
    gscPrevious7Days,
    gscLast30Days,
    ga4Status: statusFromError(error, "api_error"),
    gscStatus: statusFromError(gscError, "api_error"),
    adsenseStatus: monetizationStatusFromError(adsenseError),
    adsTxtStatus: monetizationStatusFromError(adsTxtError),
    ...sitemapSummary,
  };

  if (error) {
    stat.error = error;
    stat.ga4ErrorKind = classifyError(error);
  } else {
    stat.ga4LastSuccessfulFetchAt = collectedAt;
  }

  if (gscError) {
    stat.gscError = gscError;
    stat.gscErrorKind = classifyError(gscError);
  } else {
    stat.gscLastSuccessfulFetchAt = collectedAt;
  }

  if (adsenseError) {
    stat.adsenseError = adsenseError;
    stat.adsenseErrorKind = classifyError(adsenseError);
  } else {
    stat.adsenseLastSuccessfulFetchAt = collectedAt;
  }

  if (adsTxtError) {
    stat.adsTxtError = adsTxtError;
    stat.adsTxtErrorKind = classifyError(adsTxtError);
  } else {
    stat.adsTxtLastSuccessfulFetchAt = collectedAt;
  }

  if (sitemapError) {
    stat.sitemapError = sitemapError;
    stat.sitemapErrorKind = classifyError(sitemapError);
  }

  const wpStats = await fetchWpStats(site);
  if (wpStats.lastPublishedAt) {
    stat.lastPublishedAt = wpStats.lastPublishedAt;
  }

  return stat;
}

async function main(): Promise<void> {
  loadLocalSecrets();
  const keyJson = readSecret("GCP_SA_KEY_JSON");

  if (!keyJson) {
    throw new Error(
      "GCP_SA_KEY_JSON is missing. Add it to D:\\env\\키파일.txt or .env.setup.local.",
    );
  }

  const sites = (await loadSites()).filter(
    (site) => site.enabled !== false && site.ga4PropertyId,
  );
  const credentials = parseServiceAccountKey(keyJson);
  const ga4Client = new BetaAnalyticsDataClient({ credentials });
  const auth = makeGoogleAuth(keyJson, [
    "https://www.googleapis.com/auth/webmasters.readonly",
  ]);
  const gscClient = google.searchconsole({ version: "v1", auth });
  const limit = pLimit(CONCURRENCY);

  const stats = await Promise.all(
    sites.map((site) => limit(() => fetchSiteStat(ga4Client, gscClient, site))),
  );
  const snapshot: StatsSnapshot = {
    generatedAt: new Date().toISOString(),
    rangeDays: RANGE_DAYS,
    previousRangeDays: RANGE_DAYS,
    longRangeDays: LONG_RANGE_DAYS,
    dateRanges: buildDateRanges(),
    stats: stats.sort(
      (a, b) => b.last7Days.activeUsers - a.last7Days.activeUsers,
    ),
  };

  await mkdir("data", { recursive: true });
  await writeFile(
    OUTPUT_PATH,
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8",
  );

  await mkdir("data/history", { recursive: true });
  const historyDate = new Date().toISOString().slice(0, 10);
  const historyPath = `data/history/${historyDate}.json`;
  await writeFile(
    historyPath,
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8",
  );

  const ga4Failed = stats.filter((site) => site.error).length;
  const gscFailed = stats.filter((site) => site.gscError).length;
  const adsenseCodeNotDetected = stats.filter((site) => site.adsenseError)
    .length;
  const adsTxtFailed = stats.filter((site) => site.adsTxtError).length;
  const sitemapChecked = stats.filter(
    (site) => site.sitemapLastDownloadedAt || site.sitemapLastSubmittedAt,
  ).length;
  const sitemapFailed = stats.filter((site) => site.sitemapError).length;
  console.log(
    `Stats updated: ${stats.length} sites, GA4 failed=${ga4Failed}, GSC failed=${gscFailed}, sitemaps checked=${sitemapChecked}, sitemaps failed=${sitemapFailed}, AdSense code not detected=${adsenseCodeNotDetected}, ads.txt failed=${adsTxtFailed}, output=${OUTPUT_PATH}, history=${historyPath}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
