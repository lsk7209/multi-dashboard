import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import pLimit from "p-limit";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { google } from "googleapis";
import { makeGoogleAuth, parseServiceAccountKey } from "./lib/gcp.js";
import { loadLocalSecrets, readSecret } from "./lib/secrets.js";
import { loadSites, type Site } from "./lib/sites.js";
import { getErrorMessage } from "./lib/errors.js";

const OUTPUT_PATH = "data/site-stats.json";
const TRAFFIC_KEYWORDS_PATH = "data/traffic-keywords.json";
const DAY_RANGE = 1;
const RANGE_DAYS = 7;
const LONG_RANGE_DAYS = 30;
const CONCURRENCY = 6;
const ADSENSE_PUBLISHER_ID = "pub-3050601904412736";
// 헤더 없는 undici 기본 요청은 일부 호스팅 WAF가 415로 차단한다(curl·브라우저는 통과).
// 홈페이지/ads.txt 체크에 브라우저 User-Agent와 Accept를 붙여 오탐을 막는다.
const SITE_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
} as const;
const MEDIAPARTNERS_FETCH_HEADERS = {
  ...SITE_FETCH_HEADERS,
  "User-Agent": "Mediapartners-Google",
} as const;
const MONETIZATION_LAST_GOOD_TTL_HOURS = 72;
const TOP_QUERY_LIMIT = 3;
const TOP_QUERY_MIN_IMPRESSIONS = 10;
const TOP_TRAFFIC_KEYWORD_MIN_COUNT = 10;
const DEFAULT_CONTENT_FIELDS = {
  scheduled: ["scheduledAt", "scheduled_at", "publishAt", "publish_at"],
  published: ["publishedAt", "published_at", "date", "datePublished"],
};

const execFileAsync = promisify(execFile);

type CollectionStatus = "ok" | "auth_error" | "api_error" | "missing_config";
type AdsenseInstallStatus = "installed" | "not_detected" | "unknown";
type AdsTxtValidationStatus =
  | "valid"
  | "missing"
  | "wrong_publisher"
  | "unknown";
type MonetizationCollectorStatus = "ok" | "transient_error" | "not_checked";
type MonetizationEvidenceType =
  | "homepage"
  | "homepage_mediapartners"
  | "sample_page"
  | "ads_txt";
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

interface GscQueryMetric extends GscMetricSet {
  query: string;
}

interface TrafficKeywordMetric {
  keyword: string;
  source: string;
  medium: string;
  sourceMedium: string;
  activeUsers: number;
  sessions: number;
  clicks?: number;
  impressions?: number;
  sourceType: "ga4" | "gsc" | "external";
}

interface MonetizationEvidence {
  type: MonetizationEvidenceType;
  url: string;
  checkedAt: string;
  httpStatus?: number;
  matchedSignal?: string;
  error?: string;
}

interface ExternalTrafficKeywordInput {
  siteId?: string;
  url?: string;
  keyword: string;
  source: string;
  medium?: string;
  activeUsers?: number;
  sessions?: number;
  clicks?: number;
  impressions?: number;
}

interface SitemapSummary {
  sitemapLastDownloadedAt?: string;
  sitemapLastSubmittedAt?: string;
  sitemapPath?: string;
  sitemapWarnings?: number;
  sitemapErrors?: number;
  sitemapIsPending?: boolean;
  sitemapCount?: number;
  sitemapDetails?: SitemapDetail[];
  googleIndexedCount?: number;
  googleSubmittedCount?: number;
}

interface SitemapDetail {
  path: string;
  lastDownloaded?: string;
  lastSubmitted?: string;
  warnings?: number;
  errors?: number;
  isPending?: boolean;
  indexed?: number;
  submitted?: number;
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
  gscTopQueries?: GscQueryMetric[];
  trafficKeywords?: TrafficKeywordMetric[];
  ga4Status: CollectionStatus;
  gscStatus: CollectionStatus;
  adsenseStatus?: CollectionStatus;
  adsTxtStatus?: CollectionStatus;
  adsenseInstallStatus?: AdsenseInstallStatus;
  adsenseCollectorStatus?: MonetizationCollectorStatus;
  adsenseEvidence?: MonetizationEvidence[];
  adsenseLastKnownGoodAt?: string;
  adsTxtValidationStatus?: AdsTxtValidationStatus;
  adsTxtCollectorStatus?: MonetizationCollectorStatus;
  adsTxtEvidence?: MonetizationEvidence[];
  adsTxtLastKnownGoodAt?: string;
  monetization?: boolean;
  ga4LastSuccessfulFetchAt?: string;
  gscLastSuccessfulFetchAt?: string;
  adsenseLastSuccessfulFetchAt?: string;
  adsTxtLastSuccessfulFetchAt?: string;
  sitemapLastDownloadedAt?: string;
  sitemapLastSubmittedAt?: string;
  sitemapPath?: string;
  sitemapWarnings?: number;
  sitemapErrors?: number;
  sitemapIsPending?: boolean;
  sitemapCount?: number;
  sitemapDetails?: SitemapDetail[];
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
  lastScheduledAt?: string;
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

async function loadPreviousStatsById(): Promise<Map<string, SiteStat>> {
  if (!existsSync(OUTPUT_PATH)) {
    return new Map();
  }

  try {
    const raw = await readFile(OUTPUT_PATH, "utf8");
    const snapshot = JSON.parse(raw) as Partial<StatsSnapshot>;
    return new Map(
      (snapshot.stats ?? []).map((stat) => [stat.id, stat] as const),
    );
  } catch {
    return new Map();
  }
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

function dimensionValue(row: unknown, index: number): string {
  const values =
    (row as { dimensionValues?: Array<{ value?: string | null }> })
      .dimensionValues ?? [];
  return String(values[index]?.value ?? "").trim();
}

function cleanGa4Keyword(value: string): string {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  if (
    !normalized ||
    lower === "(not set)" ||
    lower === "(not provided)" ||
    lower === "(none)" ||
    lower === "not set" ||
    lower === "not provided"
  ) {
    return "";
  }
  return normalized;
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
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      12,
    ),
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

async function fetchGa4TrafficKeywords(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  days: number,
): Promise<TrafficKeywordMetric[]> {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: toGa4StartDate(days), endDate: "yesterday" }],
    dimensions: [
      { name: "sessionSource" },
      { name: "sessionMedium" },
      { name: "sessionManualTerm" },
      { name: "sessionGoogleAdsKeyword" },
    ],
    metrics: [{ name: "activeUsers" }, { name: "sessions" }],
    limit: 50,
  });

  const byKey = new Map<string, TrafficKeywordMetric>();
  for (const row of response.rows ?? []) {
    const source = dimensionValue(row, 0) || "(direct)";
    const medium = dimensionValue(row, 1) || "(none)";
    const manualTerm = cleanGa4Keyword(dimensionValue(row, 2));
    const googleAdsKeyword = cleanGa4Keyword(dimensionValue(row, 3));
    const keyword = manualTerm || googleAdsKeyword;
    const activeUsers = metricValue(row, 0);
    const sessions = metricValue(row, 1);

    if (!keyword || activeUsers < TOP_TRAFFIC_KEYWORD_MIN_COUNT) {
      continue;
    }

    const sourceMedium = `${source} / ${medium}`;
    const key = `${sourceMedium}\u0000${keyword}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.activeUsers += activeUsers;
      existing.sessions += sessions;
      continue;
    }

    byKey.set(key, {
      keyword,
      source,
      medium,
      sourceMedium,
      activeUsers,
      sessions,
      sourceType: "ga4",
    });
  }

  return [...byKey.values()]
    .sort((a, b) => b.activeUsers - a.activeUsers || b.sessions - a.sessions)
    .slice(0, TOP_QUERY_LIMIT);
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

async function fetchGscTopQueries(
  client: ReturnType<typeof google.searchconsole>,
  siteUrl: string,
  days: number,
): Promise<GscQueryMetric[]> {
  const response = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: seoulDateDaysAgo(days),
      endDate: seoulDateDaysAgo(1),
      dimensions: ["query"],
      rowLimit: 25,
    },
  });

  return (response.data.rows ?? [])
    .map((row) => ({
      query: String(row.keys?.[0] ?? "").trim(),
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }))
    .filter(
      (row) =>
        row.query.length > 0 && row.impressions >= TOP_QUERY_MIN_IMPRESSIONS,
    )
    .sort(
      (a, b) =>
        b.clicks - a.clicks ||
        b.impressions - a.impressions ||
        a.position - b.position,
    )
    .slice(0, TOP_QUERY_LIMIT);
}

function trafficKeywordsFromGscQueries(
  queries: GscQueryMetric[],
): TrafficKeywordMetric[] {
  return queries
    .filter((query) => query.clicks >= TOP_TRAFFIC_KEYWORD_MIN_COUNT)
    .slice(0, TOP_QUERY_LIMIT)
    .map((query) => ({
      keyword: query.query,
      source: "google",
      medium: "organic",
      sourceMedium: "google / organic",
      activeUsers: query.clicks,
      sessions: query.clicks,
      clicks: query.clicks,
      impressions: query.impressions,
      sourceType: "gsc",
    }));
}

async function loadExternalTrafficKeywords(): Promise<
  Map<string, TrafficKeywordMetric[]>
> {
  if (!existsSync(TRAFFIC_KEYWORDS_PATH)) {
    return new Map();
  }

  const raw = await readFile(TRAFFIC_KEYWORDS_PATH, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return new Map();
  }
  const rows = Array.isArray(parsed)
    ? parsed
    : (parsed as { keywords?: unknown[] }).keywords;
  if (!Array.isArray(rows)) {
    return new Map();
  }

  const bySite = new Map<string, TrafficKeywordMetric[]>();
  for (const row of rows) {
    const input = row as Partial<ExternalTrafficKeywordInput>;
    const siteKeys = [input.siteId, normalizeSiteUrlKey(input.url)]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());
    const keyword = cleanGa4Keyword(String(input.keyword ?? ""));
    const source = String(input.source ?? "").trim();
    if (siteKeys.length === 0 || !keyword || !source) {
      continue;
    }

    const medium = String(input.medium ?? "organic").trim() || "organic";
    const activeUsers = Number(input.activeUsers ?? input.clicks ?? 0);
    const sessions = Number(input.sessions ?? activeUsers);
    const metric: TrafficKeywordMetric = {
      keyword,
      source,
      medium,
      sourceMedium: `${source} / ${medium}`,
      activeUsers: Number.isFinite(activeUsers) ? activeUsers : 0,
      sessions: Number.isFinite(sessions) ? sessions : 0,
      sourceType: "external",
    };
    const clicks = numberOrUndefined(input.clicks);
    const impressions = numberOrUndefined(input.impressions);
    if (clicks !== undefined) {
      metric.clicks = clicks;
    }
    if (impressions !== undefined) {
      metric.impressions = impressions;
    }

    for (const siteKey of siteKeys) {
      const current = bySite.get(siteKey) ?? [];
      current.push(metric);
      bySite.set(siteKey, current);
    }
  }

  return bySite;
}

function numberOrUndefined(value: unknown): number | undefined {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function normalizeSiteUrlKey(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  return url
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

function mergeTrafficKeywords(
  externalKeywords: TrafficKeywordMetric[],
  ga4Keywords: TrafficKeywordMetric[],
  gscQueries: GscQueryMetric[],
): TrafficKeywordMetric[] {
  const merged = [
    ...externalKeywords,
    ...ga4Keywords,
    ...(ga4Keywords.length > 0
      ? []
      : trafficKeywordsFromGscQueries(gscQueries)),
  ];
  const byKey = new Map<string, TrafficKeywordMetric>();
  for (const keyword of merged) {
    const key = `${keyword.sourceMedium}\u0000${keyword.keyword}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.activeUsers += keyword.activeUsers;
      existing.sessions += keyword.sessions;
      if (existing.clicks !== undefined || keyword.clicks !== undefined) {
        existing.clicks = (existing.clicks ?? 0) + (keyword.clicks ?? 0);
      }
      if (
        existing.impressions !== undefined ||
        keyword.impressions !== undefined
      ) {
        existing.impressions =
          (existing.impressions ?? 0) + (keyword.impressions ?? 0);
      }
      continue;
    }
    byKey.set(key, { ...keyword });
  }

  return [...byKey.values()]
    .sort(
      (a, b) =>
        getTrafficKeywordSortValue(b) - getTrafficKeywordSortValue(a) ||
        b.sessions - a.sessions,
    )
    .slice(0, TOP_QUERY_LIMIT);
}

function getTrafficKeywordSortValue(keyword: TrafficKeywordMetric): number {
  return keyword.impressions ?? keyword.activeUsers;
}

function getExternalTrafficKeywordsForSite(
  externalTrafficKeywords: Map<string, TrafficKeywordMetric[]>,
  site: Site,
): TrafficKeywordMetric[] {
  const keys = [
    site.id.toLowerCase(),
    normalizeSiteUrlKey(site.url)?.toLowerCase(),
  ].filter((value): value is string => Boolean(value));
  const byKey = new Map<string, TrafficKeywordMetric>();

  for (const key of keys) {
    for (const keyword of externalTrafficKeywords.get(key) ?? []) {
      byKey.set(`${keyword.sourceMedium}\u0000${keyword.keyword}`, keyword);
    }
  }

  return [...byKey.values()];
}

async function fetchSitemapSummary(
  client: ReturnType<typeof google.searchconsole>,
  siteUrl: string,
  sitemapUrls?: string[],
): Promise<SitemapSummary> {
  const response = await client.sitemaps.list({ siteUrl });
  const sitemaps = response.data.sitemap ?? [];
  const configuredUrls = sitemapUrls?.filter(Boolean) ?? [];

  if (configuredUrls.length > 0) {
    const details = configuredUrls.map((path) => {
      const selected = sitemaps.find((sitemap) => sitemap.path === path);
      return toSitemapDetail(selected, path);
    });
    return summarizeSitemapDetails(details);
  }

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

  return summarizeSitemapDetails([toSitemapDetail(selected)]);
}

function toSitemapDetail(
  sitemap:
    | {
        path?: string | null;
        lastDownloaded?: string | null;
        lastSubmitted?: string | null;
        warnings?: string | number | null;
        errors?: string | number | null;
        isPending?: boolean | null;
        contents?: Array<{
          type?: string | null;
          submitted?: string | null;
          indexed?: string | null;
        }> | null;
      }
    | undefined,
  fallbackPath?: string,
): SitemapDetail {
  const detail: SitemapDetail = {
    path: sitemap?.path ?? fallbackPath ?? "",
  };
  if (sitemap?.lastDownloaded) {
    detail.lastDownloaded = sitemap.lastDownloaded;
  }
  if (sitemap?.lastSubmitted) {
    detail.lastSubmitted = sitemap.lastSubmitted;
  }
  const warnings = toOptionalNumber(sitemap?.warnings);
  if (warnings !== undefined) {
    detail.warnings = warnings;
  }
  const errors = toOptionalNumber(sitemap?.errors);
  if (errors !== undefined) {
    detail.errors = errors;
  }
  if (sitemap?.isPending !== undefined && sitemap.isPending !== null) {
    detail.isPending = Boolean(sitemap.isPending);
  }
  const indexed = (sitemap?.contents ?? []).reduce((sum, c) => {
    const n = parseInt(c.indexed ?? "0", 10);
    return sum + (Number.isNaN(n) ? 0 : n);
  }, 0);
  if (indexed > 0) {
    detail.indexed = indexed;
  }
  const submitted = (sitemap?.contents ?? []).reduce((sum, c) => {
    const n = parseInt(c.submitted ?? "0", 10);
    return sum + (Number.isNaN(n) ? 0 : n);
  }, 0);
  if (submitted > 0) {
    detail.submitted = submitted;
  }
  return detail;
}

function summarizeSitemapDetails(details: SitemapDetail[]): SitemapSummary {
  const summary: SitemapSummary = {
    sitemapCount: details.length,
    sitemapDetails: details,
  };
  const downloaded = details
    .map((detail) => detail.lastDownloaded)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  const submitted = details
    .map((detail) => detail.lastSubmitted)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a));

  if (downloaded[0]) {
    summary.sitemapLastDownloadedAt = downloaded[0];
  }
  if (submitted[0]) {
    summary.sitemapLastSubmittedAt = submitted[0];
  }
  if (details[0]?.path) {
    summary.sitemapPath =
      details.length === 1 ? details[0].path : `${details.length} sitemaps`;
  }
  summary.sitemapWarnings = details.reduce(
    (sum, detail) => sum + getProcessedSitemapIssueCount(detail, "warnings"),
    0,
  );
  summary.sitemapErrors = details.reduce(
    (sum, detail) => sum + getProcessedSitemapIssueCount(detail, "errors"),
    0,
  );
  summary.sitemapIsPending = details.some((detail) => detail.isPending);
  const totalIndexed = details.reduce((sum, d) => sum + (d.indexed ?? 0), 0);
  if (totalIndexed > 0) {
    summary.googleIndexedCount = totalIndexed;
  }
  const totalSubmitted = details.reduce(
    (sum, d) => sum + (d.submitted ?? 0),
    0,
  );
  if (totalSubmitted > 0) {
    summary.googleSubmittedCount = totalSubmitted;
  }

  return summary;
}

function getProcessedSitemapIssueCount(
  detail: SitemapDetail,
  key: "errors" | "warnings",
): number {
  if (hasUnprocessedSitemapSubmission(detail)) {
    return 0;
  }

  return detail[key] ?? 0;
}

function hasUnprocessedSitemapSubmission(detail: SitemapDetail): boolean {
  if (!detail.lastSubmitted) {
    return false;
  }

  const submittedAt = Date.parse(detail.lastSubmitted);
  const downloadedAt = detail.lastDownloaded
    ? Date.parse(detail.lastDownloaded)
    : Number.NEGATIVE_INFINITY;

  if (Number.isNaN(submittedAt) || Number.isNaN(downloadedAt)) {
    return false;
  }

  return submittedAt > downloadedAt;
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
): Promise<Pick<SiteStat, "lastPublishedAt" | "lastScheduledAt">> {
  const contentStats = await fetchContentStats(site);
  if (contentStats.lastPublishedAt || contentStats.lastScheduledAt) {
    return contentStats;
  }

  if (!site.wpRestBase) {
    return {};
  }

  try {
    const restBase = site.wpRestBase.replace(/\/$/, "");
    const [publishedAt, scheduledAt] = await Promise.all([
      fetchWpPostDate(
        `${restBase}/posts?per_page=1&orderby=date&order=desc&_fields=date_gmt`,
      ),
      fetchWpPostDate(
        `${restBase}/posts?status=future&per_page=1&orderby=date&order=desc&_fields=date_gmt`,
      ),
    ]);
    return {
      ...(publishedAt ? { lastPublishedAt: publishedAt } : {}),
      ...(scheduledAt ? { lastScheduledAt: scheduledAt } : {}),
    };
  } catch {
    return {};
  }
}

async function fetchContentStats(
  site: Site,
): Promise<Pick<SiteStat, "lastPublishedAt" | "lastScheduledAt">> {
  if (!site.contentSource) {
    return {};
  }

  if (site.contentSource.type === "wordpress-ssh") {
    return fetchWordPressSshStats(site);
  }

  if (
    site.contentSource.type === "local-next" ||
    site.contentSource.type === "github-next"
  ) {
    return fetchLocalNextStats(site);
  }

  return {};
}

async function fetchWordPressSshStats(
  site: Site,
): Promise<Pick<SiteStat, "lastPublishedAt" | "lastScheduledAt">> {
  const source = site.contentSource;
  if (
    !source ||
    source.type !== "wordpress-ssh" ||
    !source.sshHost ||
    !source.sshUser ||
    !source.sshKeyPath ||
    !source.wpPath
  ) {
    return {};
  }

  const php = `
$wpPath = ${JSON.stringify(source.wpPath)};
if (!is_file($wpPath . '/wp-load.php')) {
    fwrite(STDERR, "wp-load.php not found");
    exit(2);
}
require_once $wpPath . '/wp-load.php';
global $wpdb;
function md_recent_post_date(string $status, string $order): ?string {
    global $wpdb;
    $orderSql = $order === 'ASC' ? 'ASC' : 'DESC';
    $sql = $wpdb->prepare(
        "SELECT post_date_gmt FROM {$wpdb->posts} WHERE post_type = %s AND post_status = %s AND post_date_gmt IS NOT NULL AND post_date_gmt <> '0000-00-00 00:00:00' ORDER BY post_date_gmt {$orderSql} LIMIT 1",
        'post',
        $status
    );
    $value = $wpdb->get_var($sql);
    return is_string($value) && $value !== '' ? $value : null;
}
echo json_encode([
    'lastPublishedAt' => md_recent_post_date('publish', 'DESC'),
    'lastScheduledAt' => md_recent_post_date('future', 'DESC'),
], JSON_UNESCAPED_SLASHES);
`;
  const encoded = Buffer.from(php, "utf8").toString("base64");
  const args = [
    "-p",
    String(source.sshPort ?? 22),
    "-i",
    source.sshKeyPath,
    "-o",
    "StrictHostKeyChecking=no",
    "-o",
    "BatchMode=yes",
    `${source.sshUser}@${source.sshHost}`,
    `php -r "$(printf %s '${encoded}' | base64 -d)"`,
  ];

  try {
    const { stdout } = await execFileAsync("ssh", args, {
      timeout: 15000,
      maxBuffer: 1024 * 1024,
    });
    const parsed = JSON.parse(stdout.trim()) as {
      lastPublishedAt?: string | null;
      lastScheduledAt?: string | null;
    };
    return {
      ...(parsed.lastPublishedAt
        ? { lastPublishedAt: mysqlGmtToIso(parsed.lastPublishedAt) }
        : {}),
      ...(parsed.lastScheduledAt
        ? { lastScheduledAt: mysqlGmtToIso(parsed.lastScheduledAt) }
        : {}),
    };
  } catch {
    return {};
  }
}

async function fetchLocalNextStats(
  site: Site,
): Promise<Pick<SiteStat, "lastPublishedAt" | "lastScheduledAt">> {
  const source = site.contentSource;
  if (!source?.localPath || !existsSync(source.localPath)) {
    return {};
  }

  const candidates = await collectContentFiles(source.localPath);
  const scheduledFields =
    source.scheduledFields && source.scheduledFields.length > 0
      ? source.scheduledFields
      : DEFAULT_CONTENT_FIELDS.scheduled;
  const publishedFields =
    source.publishedFields && source.publishedFields.length > 0
      ? source.publishedFields
      : DEFAULT_CONTENT_FIELDS.published;
  const scheduledDates: string[] = [];
  const publishedDates: string[] = [];

  for (const filePath of candidates) {
    const parsed = await readContentMetadata(filePath);
    if (!parsed) {
      continue;
    }

    const scheduledAt = firstDateField(parsed, scheduledFields);
    const publishedAt = firstDateField(parsed, publishedFields);
    const status = String(parsed.status ?? parsed.state ?? "").toLowerCase();

    if (
      scheduledAt &&
      (status === "future" || status === "scheduled" || !publishedAt)
    ) {
      scheduledDates.push(scheduledAt);
      continue;
    }
    if (publishedAt) {
      publishedDates.push(publishedAt);
    }
  }

  return {
    ...(publishedDates.length > 0
      ? { lastPublishedAt: newestIsoDate(publishedDates) }
      : {}),
    ...(scheduledDates.length > 0
      ? { lastScheduledAt: newestIsoDate(scheduledDates) }
      : {}),
  };
}

async function collectContentFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  const ignored = new Set([
    ".git",
    ".next",
    ".vercel",
    "node_modules",
    "dist",
    "build",
  ]);
  const allowed = new Set([".md", ".mdx", ".json"]);

  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (ignored.has(entry.name)) {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (
        entry.isFile() &&
        allowed.has(path.extname(entry.name).toLowerCase())
      ) {
        const info = await stat(fullPath);
        if (info.size <= 256 * 1024) {
          files.push(fullPath);
        }
      }
    }
  }

  await walk(root);
  return files;
}

async function readContentMetadata(
  filePath: string,
): Promise<Record<string, unknown> | undefined> {
  const raw = await readFile(filePath, "utf8");
  if (filePath.endsWith(".json")) {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }

  const frontmatter = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) {
    return undefined;
  }

  const metadata: Record<string, unknown> = {};
  const frontmatterBody = frontmatter[1];
  if (!frontmatterBody) {
    return undefined;
  }

  for (const line of frontmatterBody.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    const key = match?.[1];
    const value = match?.[2];
    if (key && value) {
      metadata[key] = value.replace(/^["']|["']$/g, "").trim();
    }
  }
  return metadata;
}

function firstDateField(
  metadata: Record<string, unknown>,
  fields: string[],
): string | undefined {
  for (const field of fields) {
    const value = metadata[field];
    if (typeof value !== "string" && typeof value !== "number") {
      continue;
    }
    const normalized = normalizeDate(value);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}

function mysqlGmtToIso(value: string): string {
  return normalizeDate(`${value.replace(" ", "T")}Z`) ?? `${value}Z`;
}

function normalizeDate(value: string | number): string | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function newestIsoDate(values: string[]): string {
  const [newest] = values.sort((a, b) => Date.parse(b) - Date.parse(a));
  return newest ?? "";
}

async function fetchWpPostDate(url: string): Promise<string | undefined> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: SITE_FETCH_HEADERS,
  });
  if (!response.ok) {
    return undefined;
  }

  const posts = (await response.json()) as Array<{ date_gmt?: string }>;
  const dateGmt = posts[0]?.date_gmt;
  return dateGmt ? `${dateGmt}Z` : undefined;
}

function findAdsenseSignal(html: string): string | undefined {
  const normalized = html.toLowerCase();
  if (
    normalized.includes(
      "pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
    )
  ) {
    return "pagead2";
  }
  if (normalized.includes("adsbygoogle")) {
    return "adsbygoogle";
  }
  if (normalized.includes("ca-pub-")) {
    return "ca-pub";
  }
  return undefined;
}

function isRecentIso(value: string | undefined, maxAgeHours: number): boolean {
  if (!value) {
    return false;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return Date.now() - timestamp <= maxAgeHours * 60 * 60 * 1000;
}

function getPreviousAdsenseLastKnownGood(
  previous: SiteStat | undefined,
): string | undefined {
  return (
    previous?.adsenseLastKnownGoodAt ?? previous?.adsenseLastSuccessfulFetchAt
  );
}

function getPreviousAdsTxtLastKnownGood(
  previous: SiteStat | undefined,
): string | undefined {
  return (
    previous?.adsTxtLastKnownGoodAt ?? previous?.adsTxtLastSuccessfulFetchAt
  );
}

async function discoverSampleContentUrl(
  site: Site,
): Promise<string | undefined> {
  const sitemapUrls = site.sitemapUrls?.length
    ? site.sitemapUrls
    : [new URL("/sitemap.xml", site.url).toString()];
  const home = normalizeUrlForComparison(site.url);

  for (const sitemapUrl of sitemapUrls) {
    try {
      const response = await fetch(sitemapUrl, {
        signal: AbortSignal.timeout(8000),
        headers: SITE_FETCH_HEADERS,
      });
      if (!response.ok) {
        continue;
      }
      const xml = await response.text();
      const urls = Array.from(xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi))
        .map((match) => match[1]?.trim())
        .filter((value): value is string => Boolean(value));
      const sampleUrl = urls.find((url) => {
        const normalized = normalizeUrlForComparison(url);
        return (
          normalized !== home &&
          !normalized.endsWith(".xml") &&
          !normalized.includes("/sitemap") &&
          !normalized.endsWith("/privacy") &&
          !normalized.endsWith("/privacy-policy") &&
          !normalized.endsWith("/contact") &&
          !normalized.endsWith("/terms")
        );
      });
      if (sampleUrl) {
        return sampleUrl;
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

function normalizeUrlForComparison(url: string): string {
  return url.replace(/\/+$/, "").toLowerCase();
}

async function collectAdsenseCodeStatus(
  site: Site,
  previous: SiteStat | undefined,
  checkedAt: string,
): Promise<
  Pick<
    SiteStat,
    | "adsenseStatus"
    | "adsenseInstallStatus"
    | "adsenseCollectorStatus"
    | "adsenseEvidence"
    | "adsenseLastKnownGoodAt"
    | "adsenseLastSuccessfulFetchAt"
    | "adsenseError"
    | "adsenseErrorKind"
  >
> {
  const evidence: MonetizationEvidence[] = [];
  const sampleUrl = await discoverSampleContentUrl(site);
  const probes: Array<{
    type: MonetizationEvidenceType;
    url: string;
    headers: HeadersInit;
  }> = [
    { type: "homepage", url: site.url, headers: SITE_FETCH_HEADERS },
    {
      type: "homepage_mediapartners",
      url: site.url,
      headers: MEDIAPARTNERS_FETCH_HEADERS,
    },
    ...(sampleUrl
      ? [
          {
            type: "sample_page" as const,
            url: sampleUrl,
            headers: SITE_FETCH_HEADERS,
          },
        ]
      : []),
  ];

  for (const probe of probes) {
    try {
      const response = await fetch(probe.url, {
        signal: AbortSignal.timeout(8000),
        headers: probe.headers,
      });
      const item: MonetizationEvidence = {
        type: probe.type,
        url: probe.url,
        checkedAt,
        httpStatus: response.status,
      };
      if (response.ok) {
        const html = await response.text();
        const signal = findAdsenseSignal(html);
        if (signal) {
          item.matchedSignal = signal;
        }
      } else {
        item.error = `HTTP ${response.status}`;
      }
      evidence.push(item);
    } catch (error) {
      evidence.push({
        type: probe.type,
        url: probe.url,
        checkedAt,
        error: getErrorMessage(error),
      });
    }
  }

  const matched = evidence.find((item) => item.matchedSignal);
  if (matched) {
    return {
      adsenseStatus: "ok",
      adsenseInstallStatus: "installed",
      adsenseCollectorStatus: "ok",
      adsenseEvidence: evidence,
      adsenseLastKnownGoodAt: checkedAt,
      adsenseLastSuccessfulFetchAt: checkedAt,
    };
  }

  const successfulHtmlChecks = evidence.filter(
    (item) =>
      item.httpStatus !== undefined &&
      item.httpStatus >= 200 &&
      item.httpStatus < 300,
  );
  const transientErrors = evidence.filter(
    (item) =>
      item.error || (item.httpStatus !== undefined && item.httpStatus >= 400),
  );
  if (successfulHtmlChecks.length >= 2 && transientErrors.length === 0) {
    const error = "AdSense code not detected on checked pages";
    return {
      adsenseStatus: "missing_config",
      adsenseInstallStatus: "not_detected",
      adsenseCollectorStatus: "ok",
      adsenseEvidence: evidence,
      adsenseError: error,
      adsenseErrorKind: "missing_config",
    };
  }

  const previousGoodAt = getPreviousAdsenseLastKnownGood(previous);
  const preservePreviousGood = isRecentIso(
    previousGoodAt,
    MONETIZATION_LAST_GOOD_TTL_HOURS,
  );
  const error = `AdSense collection transient: ${summarizeEvidenceErrors(evidence)}`;
  return {
    adsenseStatus: preservePreviousGood ? "ok" : "api_error",
    adsenseInstallStatus: preservePreviousGood ? "installed" : "unknown",
    adsenseCollectorStatus: "transient_error",
    adsenseEvidence: evidence,
    ...(previousGoodAt ? { adsenseLastKnownGoodAt: previousGoodAt } : {}),
    ...(preservePreviousGood && previousGoodAt
      ? { adsenseLastSuccessfulFetchAt: previousGoodAt }
      : {}),
    adsenseError: error,
    adsenseErrorKind: "api_error",
  };
}

async function collectAdsTxtStatus(
  site: Site,
  previous: SiteStat | undefined,
  checkedAt: string,
): Promise<
  Pick<
    SiteStat,
    | "adsTxtStatus"
    | "adsTxtValidationStatus"
    | "adsTxtCollectorStatus"
    | "adsTxtEvidence"
    | "adsTxtLastKnownGoodAt"
    | "adsTxtLastSuccessfulFetchAt"
    | "adsTxtError"
    | "adsTxtErrorKind"
  >
> {
  const adsTxtUrl = new URL("/ads.txt", site.url).toString();
  const evidence: MonetizationEvidence[] = [];

  try {
    const response = await fetch(adsTxtUrl, {
      signal: AbortSignal.timeout(8000),
      headers: SITE_FETCH_HEADERS,
    });
    const item: MonetizationEvidence = {
      type: "ads_txt",
      url: adsTxtUrl,
      checkedAt,
      httpStatus: response.status,
    };
    evidence.push(item);

    if (response.status === 404) {
      const error = "ads.txt unavailable: 404";
      return {
        adsTxtStatus: "missing_config",
        adsTxtValidationStatus: "missing",
        adsTxtCollectorStatus: "ok",
        adsTxtEvidence: evidence,
        adsTxtError: error,
        adsTxtErrorKind: "missing_config",
      };
    }

    if (!response.ok) {
      item.error = `HTTP ${response.status}`;
      return preserveAdsTxtOnTransient(previous, checkedAt, evidence);
    }

    const body = await response.text();
    const normalized = body.toLowerCase();
    if (!normalized.includes("google.com")) {
      const error = "Missing ads.txt Google publisher entry";
      return {
        adsTxtStatus: "missing_config",
        adsTxtValidationStatus: "wrong_publisher",
        adsTxtCollectorStatus: "ok",
        adsTxtEvidence: evidence,
        adsTxtError: error,
        adsTxtErrorKind: "missing_config",
      };
    }

    if (!normalized.includes(ADSENSE_PUBLISHER_ID)) {
      const error = `Missing ads.txt publisher ${ADSENSE_PUBLISHER_ID}`;
      return {
        adsTxtStatus: "missing_config",
        adsTxtValidationStatus: "wrong_publisher",
        adsTxtCollectorStatus: "ok",
        adsTxtEvidence: evidence,
        adsTxtError: error,
        adsTxtErrorKind: "missing_config",
      };
    }

    item.matchedSignal = ADSENSE_PUBLISHER_ID;
    return {
      adsTxtStatus: "ok",
      adsTxtValidationStatus: "valid",
      adsTxtCollectorStatus: "ok",
      adsTxtEvidence: evidence,
      adsTxtLastKnownGoodAt: checkedAt,
      adsTxtLastSuccessfulFetchAt: checkedAt,
    };
  } catch (error) {
    evidence.push({
      type: "ads_txt",
      url: adsTxtUrl,
      checkedAt,
      error: getErrorMessage(error),
    });
    return preserveAdsTxtOnTransient(previous, checkedAt, evidence);
  }
}

function preserveAdsTxtOnTransient(
  previous: SiteStat | undefined,
  checkedAt: string,
  evidence: MonetizationEvidence[],
): Pick<
  SiteStat,
  | "adsTxtStatus"
  | "adsTxtValidationStatus"
  | "adsTxtCollectorStatus"
  | "adsTxtEvidence"
  | "adsTxtLastKnownGoodAt"
  | "adsTxtLastSuccessfulFetchAt"
  | "adsTxtError"
  | "adsTxtErrorKind"
> {
  const previousGoodAt = getPreviousAdsTxtLastKnownGood(previous);
  const preservePreviousGood = isRecentIso(
    previousGoodAt,
    MONETIZATION_LAST_GOOD_TTL_HOURS,
  );
  const error = `ads.txt collection transient: ${summarizeEvidenceErrors(evidence)}`;
  return {
    adsTxtStatus: preservePreviousGood ? "ok" : "api_error",
    adsTxtValidationStatus: preservePreviousGood ? "valid" : "unknown",
    adsTxtCollectorStatus: "transient_error",
    adsTxtEvidence: evidence,
    ...(previousGoodAt ? { adsTxtLastKnownGoodAt: previousGoodAt } : {}),
    ...(preservePreviousGood && previousGoodAt
      ? { adsTxtLastSuccessfulFetchAt: previousGoodAt }
      : {}),
    adsTxtError: error,
    adsTxtErrorKind: "api_error",
  };
}

function summarizeEvidenceErrors(evidence: MonetizationEvidence[]): string {
  const details = evidence.map((item) => {
    const status = item.httpStatus ? `HTTP ${item.httpStatus}` : item.error;
    return `${item.type} ${status ?? "no signal"}`;
  });
  return details.join("; ");
}

async function fetchSiteStat(
  ga4Client: BetaAnalyticsDataClient,
  gscClient: ReturnType<typeof google.searchconsole>,
  site: Site,
  externalTrafficKeywords: Map<string, TrafficKeywordMetric[]>,
  previousStat: SiteStat | undefined,
): Promise<SiteStat> {
  let last1Days = emptyMetrics();
  let last7Days = emptyMetrics();
  let previous7Days = emptyMetrics();
  let last30Days = emptyMetrics();
  let gscLast7Days = emptyGscMetrics();
  let gscPrevious7Days = emptyGscMetrics();
  let gscLast30Days = emptyGscMetrics();
  let gscTopQueries: GscQueryMetric[] = [];
  let ga4TrafficKeywords: TrafficKeywordMetric[] = [];
  let sitemapSummary: SitemapSummary = {};
  let error: string | undefined;
  let gscError: string | undefined;
  let sitemapError: string | undefined;
  let adsenseResult: Partial<SiteStat> = {};
  let adsTxtResult: Partial<SiteStat> = {};
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

    try {
      ga4TrafficKeywords = await fetchGa4TrafficKeywords(
        ga4Client,
        site.ga4PropertyId,
        RANGE_DAYS,
      );
    } catch {
      ga4TrafficKeywords = [];
    }
  }

  const gscSiteUrl = site.gscSiteUrl ?? site.url;
  const siteTrafficKeywords = getExternalTrafficKeywordsForSite(
    externalTrafficKeywords,
    site,
  );

  try {
    [gscLast7Days, gscPrevious7Days, gscLast30Days, gscTopQueries] =
      await Promise.all([
        fetchGscMetrics(gscClient, gscSiteUrl, RANGE_DAYS),
        fetchPreviousGscMetrics(gscClient, gscSiteUrl),
        fetchGscMetrics(gscClient, gscSiteUrl, LONG_RANGE_DAYS),
        fetchGscTopQueries(gscClient, gscSiteUrl, RANGE_DAYS),
      ]);
  } catch (searchError) {
    gscError = getErrorMessage(searchError);
  }

  try {
    sitemapSummary = await fetchSitemapSummary(
      gscClient,
      gscSiteUrl,
      site.sitemapUrls,
    );
  } catch (searchError) {
    sitemapError = getErrorMessage(searchError);
  }

  const monetizationEnabled = site.monetization !== false;
  if (monetizationEnabled) {
    adsenseResult = await collectAdsenseCodeStatus(
      site,
      previousStat,
      collectedAt,
    );
    adsTxtResult = await collectAdsTxtStatus(site, previousStat, collectedAt);
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
    gscTopQueries,
    trafficKeywords: mergeTrafficKeywords(
      siteTrafficKeywords,
      ga4TrafficKeywords,
      gscTopQueries,
    ),
    ga4Status: statusFromError(error, "api_error"),
    gscStatus: statusFromError(gscError, "api_error"),
    // exactOptionalPropertyTypes: monetization 비활성 사이트는 adsense/adsTxt
    // 키를 undefined로 명시하지 않고 아예 빼서 optional 계약을 지킨다.
    ...(monetizationEnabled
      ? {
          ...adsenseResult,
          ...adsTxtResult,
        }
      : { monetization: false }),
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

  if (monetizationEnabled) {
    stat.adsenseCollectorStatus ??= "not_checked";
    stat.adsTxtCollectorStatus ??= "not_checked";
  }

  if (sitemapError) {
    stat.sitemapError = sitemapError;
    stat.sitemapErrorKind = classifyError(sitemapError);
  }

  const wpStats = await fetchWpStats(site);
  if (wpStats.lastPublishedAt) {
    stat.lastPublishedAt = wpStats.lastPublishedAt;
  }
  if (wpStats.lastScheduledAt) {
    stat.lastScheduledAt = wpStats.lastScheduledAt;
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
  const externalTrafficKeywords = await loadExternalTrafficKeywords();
  const previousStatsById = await loadPreviousStatsById();

  const stats = await Promise.all(
    sites.map((site) =>
      limit(() =>
        fetchSiteStat(
          ga4Client,
          gscClient,
          site,
          externalTrafficKeywords,
          previousStatsById.get(site.id),
        ),
      ),
    ),
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
  const adsenseCodeNotDetected = stats.filter(
    (site) => site.adsenseError,
  ).length;
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
