import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import {
  mkdir,
  open,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
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
const GMAIL_DIGEST_README_URL =
  process.env.GMAIL_DIGEST_README_URL ??
  "https://raw.githubusercontent.com/lsk7209/gmail-digest/main/README.md";
const DAY_RANGE = 1;
const RANGE_DAYS = 7;
const LONG_RANGE_DAYS = 30;
const LOCK_PATH = "data/.stats-update.lock";
const LOCK_STALE_MS = 6 * 60 * 60 * 1000;
const CONCURRENCY = readPositiveInteger(
  process.env.STATS_UPDATE_CONCURRENCY,
  6,
  12,
);
const GA4_CONCURRENCY = readPositiveInteger(
  process.env.STATS_UPDATE_GA4_CONCURRENCY,
  1,
  4,
);
const GA4_MIN_INTERVAL_MS = readNonNegativeInteger(
  process.env.STATS_UPDATE_GA4_MIN_INTERVAL_MS,
  250,
  10000,
);
const PROGRESS_INTERVAL_MS = readPositiveInteger(
  process.env.STATS_UPDATE_PROGRESS_INTERVAL_MS,
  30000,
  300000,
);
const SLOW_SITE_MS = readPositiveInteger(
  process.env.STATS_UPDATE_SLOW_SITE_MS,
  60000,
  600000,
);
const GOOGLE_API_TIMEOUT_MS = readPositiveInteger(
  process.env.STATS_UPDATE_GOOGLE_API_TIMEOUT_MS,
  20000,
  60000,
);
const SITE_TIMEOUT_MS = readPositiveInteger(
  process.env.STATS_UPDATE_SITE_TIMEOUT_MS,
  90000,
  180000,
);
const RUN_TIMEOUT_MS = readNonNegativeInteger(
  process.env.STATS_UPDATE_RUN_TIMEOUT_MS,
  600000,
  3600000,
);
const ADSENSE_PUBLISHER_ID =
  process.env.ADSENSE_PUBLISHER_ID ?? "pub-3050601904412736";
const ga4RequestLimit = pLimit(GA4_CONCURRENCY);
let nextGa4RequestAt = 0;
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

interface LockFile {
  pid: number;
  startedAt: string;
  command: string;
}

interface SiteProgressState {
  name: string;
  phase: string;
  startedAt: number;
  updatedAt: number;
}

export function isIgnorableStatsUpdateStreamError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "EPIPE";
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${formatElapsed(timeoutMs)}`));
    }, timeoutMs);
    timer.unref();
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function installStatsUpdateStreamErrorHandler(
  stream: NodeJS.WriteStream,
): void {
  stream.on("error", (error) => {
    if (isIgnorableStatsUpdateStreamError(error)) {
      return;
    }
    throw error;
  });
}

installStatsUpdateStreamErrorHandler(process.stdout);
installStatsUpdateStreamErrorHandler(process.stderr);

function readPositiveInteger(
  value: string | undefined,
  fallback: number,
  max: number,
): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, max);
}

export function readNonNegativeInteger(
  value: string | undefined,
  fallback: number,
  max: number,
): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

async function isProcessRunning(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === "EPERM";
  }
}

async function readExistingLock(): Promise<LockFile | undefined> {
  try {
    const raw = await readFile(LOCK_PATH, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, "")) as LockFile;
  } catch {
    return undefined;
  }
}

function formatElapsed(ms: number): string {
  return `${Math.round(ms / 1000)}s`;
}

export function summarizeInFlight(
  inFlight: Map<string, SiteProgressState>,
  now: number = Date.now(),
): string {
  if (inFlight.size === 0) {
    return "none";
  }

  return [...inFlight.entries()]
    .map(
      ([id, state]) =>
        `${id}:${state.phase}:total=${formatElapsed(
          now - state.startedAt,
        )}:phase=${formatElapsed(now - state.updatedAt)}`,
    )
    .join(", ");
}

function logStatsUpdate(message: string): void {
  console.log(`[stats:update] ${message}`);
}

async function acquireStatsUpdateLock(): Promise<() => Promise<void>> {
  await mkdir(path.dirname(LOCK_PATH), { recursive: true });
  const lock: LockFile = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
    command: process.argv.join(" "),
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(LOCK_PATH, "wx");
      await handle.writeFile(`${JSON.stringify(lock, null, 2)}\n`, "utf8");
      await handle.close();

      let released = false;
      return async () => {
        if (released) {
          return;
        }
        released = true;
        await rm(LOCK_PATH, { force: true });
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }

      const existing = await readExistingLock();
      const startedAt = existing ? Date.parse(existing.startedAt) : 0;
      const stale =
        !existing ||
        Number.isNaN(startedAt) ||
        Date.now() - startedAt > LOCK_STALE_MS ||
        !(await isProcessRunning(existing.pid));

      if (stale) {
        await rm(LOCK_PATH, { force: true });
        continue;
      }

      throw new Error(
        `stats:update is already running (pid=${existing.pid}, startedAt=${existing.startedAt}). ` +
          "Wait for it to finish instead of launching a second collector.",
      );
    }
  }

  throw new Error("Unable to acquire stats:update lock after removing stale lock.");
}

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

interface GscEmailAlert {
  source: "gmail-digest";
  site: string;
  issue: string;
  time?: string;
  detectedAt: string;
  url: string;
  severity: "high" | "medium" | "low";
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

interface TrafficBreakdownMetric {
  dimension: string;
  activeUsers: number;
  sessions: number;
  previousActiveUsers: number;
  previousSessions: number;
  activeUsersChange: number | null;
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
  ga4SourceMedium?: TrafficBreakdownMetric[];
  ga4LandingPages?: TrafficBreakdownMetric[];
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
  collectionFailurePhase?: string;
  sitemapErrorKind?: ErrorKind;
  gscEmailAlerts?: GscEmailAlert[];
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

export function getGa4RequestDelay(
  nextRequestAt: number,
  now: number,
): number {
  return Math.max(0, nextRequestAt - now);
}

async function runGa4Request<T>(
  request: () => Promise<T>,
): Promise<T> {
  return ga4RequestLimit(async () => {
    const now = Date.now();
    const delay = getGa4RequestDelay(nextGa4RequestAt, now);
    nextGa4RequestAt = Math.max(nextGa4RequestAt, now) + GA4_MIN_INTERVAL_MS;

    if (delay > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }

    return request();
  });
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
  const [response] = await runGa4Request(() =>
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "eventCount" },
      ],
    }, {
      timeout: GOOGLE_API_TIMEOUT_MS,
    }),
  );

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
  const [response] = await runGa4Request(() =>
    client.runReport({
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
    }, {
      timeout: GOOGLE_API_TIMEOUT_MS,
    }),
  );

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

async function fetchGa4TrafficBreakdown(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  dimensionName: "sourceMedium" | "landingPage",
): Promise<TrafficBreakdownMetric[]> {
  const dimensions =
    dimensionName === "sourceMedium"
      ? [{ name: "sessionSource" }, { name: "sessionMedium" }]
      : [{ name: "landingPagePlusQueryString" }];
  const formatDimension = (row: { dimensionValues?: Array<{ value?: string }> }) => {
    if (dimensionName === "sourceMedium") {
      const source = row.dimensionValues?.[0]?.value || "(direct)";
      const medium = row.dimensionValues?.[1]?.value || "(none)";
      return `${source} / ${medium}`;
    }
    return row.dimensionValues?.[0]?.value || "/";
  };
  const fetchRange = async (startDate: string, endDate: string) => {
    const [response] = await runGa4Request(() =>
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions,
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        limit: 10,
      }, {
        timeout: GOOGLE_API_TIMEOUT_MS,
      }),
    );
    return new Map(
      (response.rows ?? []).map((row) => [
        formatDimension(row),
        {
          activeUsers: metricValue(row, 0),
          sessions: metricValue(row, 1),
        },
      ]),
    );
  };

  const [current, previous] = await Promise.all([
    fetchRange(toGa4StartDate(RANGE_DAYS), "yesterday"),
    fetchRange(toGa4StartDate(RANGE_DAYS * 2), toGa4StartDate(RANGE_DAYS + 1)),
  ]);

  return [...current.entries()]
    .map(([dimension, metrics]) => {
      const prior = previous.get(dimension) ?? { activeUsers: 0, sessions: 0 };
      return {
        dimension,
        ...metrics,
        previousActiveUsers: prior.activeUsers,
        previousSessions: prior.sessions,
        activeUsersChange:
          prior.activeUsers > 0
            ? (metrics.activeUsers - prior.activeUsers) / prior.activeUsers
            : null,
      };
    })
    .sort((a, b) => b.activeUsers - a.activeUsers || b.sessions - a.sessions);
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
  const response = await client.searchanalytics.query(
    {
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        rowLimit: 1,
      },
    },
    { timeout: GOOGLE_API_TIMEOUT_MS },
  );
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
  const response = await client.searchanalytics.query(
    {
      siteUrl,
      requestBody: {
        startDate: seoulDateDaysAgo(days),
        endDate: seoulDateDaysAgo(1),
        dimensions: ["query"],
        rowLimit: 25,
      },
    },
    { timeout: GOOGLE_API_TIMEOUT_MS },
  );

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

function normalizeHostKey(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const withoutScDomain = trimmed.replace(/^sc-domain:/i, "");
  try {
    return new URL(
      withoutScDomain.includes("://")
        ? withoutScDomain
        : `https://${withoutScDomain}`,
    ).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return withoutScDomain
      .replace(/^https?:\/\//i, "")
      .replace(/\/$/, "")
      .replace(/^www\./i, "")
      .toLowerCase();
  }
}

function classifyGscEmailAlertSeverity(issue: string): GscEmailAlert["severity"] {
  const normalized = issue.toLowerCase();
  if (
    normalized.includes("404") ||
    normalized.includes("noindex") ||
    normalized.includes("robots") ||
    issue.includes("찾을 수 없음") ||
    issue.includes("NOINDEX") ||
    issue.includes("차단")
  ) {
    return "high";
  }
  if (
    normalized.includes("duplicate") ||
    normalized.includes("canonical") ||
    issue.includes("중복") ||
    issue.includes("표준")
  ) {
    return "medium";
  }
  return "low";
}

function parseGscEmailAlerts(markdown: string, detectedAt: string): GscEmailAlert[] {
  const alerts: GscEmailAlert[] = [];
  const linePattern =
    /^\s*[-*]\s+`(?<time>\d{2}:\d{2})`\s+\[GSC\]\s+(?<rest>.+?)\s*$/;

  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(linePattern);
    const groups = match?.groups;
    const parsed = parseGscEmailAlertBody(groups?.rest);
    if (!parsed) {
      continue;
    }

    alerts.push({
      source: "gmail-digest",
      site: parsed.site,
      issue: parsed.issue,
      detectedAt,
      url: GMAIL_DIGEST_README_URL,
      severity: classifyGscEmailAlertSeverity(parsed.issue),
      ...(groups?.time ? { time: groups.time } : {}),
    });
  }

  return alerts;
}

function parseGscEmailAlertBody(
  value: string | undefined,
): { site: string; issue: string } | undefined {
  const body = value?.trim();
  if (!body) {
    return undefined;
  }

  const match = body.match(
    /^(?<site>[a-z0-9.-]+\.[a-z]{2,})(?:\s+[^a-z0-9가-힣*]+\s+|\s+-\s+)\*?\s*(?<issue>.+)$/i,
  );
  const site = match?.groups?.site?.trim();
  const issue = match?.groups?.issue?.trim();
  if (!site || !issue) {
    return undefined;
  }

  return { site, issue };
}

async function loadGscEmailAlerts(): Promise<Map<string, GscEmailAlert[]>> {
  const detectedAt = new Date().toISOString();
  try {
    const response = await fetch(GMAIL_DIGEST_README_URL, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "text/markdown,text/plain,*/*" },
    });
    if (!response.ok) {
      console.warn(
        `Gmail digest GSC alerts skipped: HTTP ${response.status} from ${GMAIL_DIGEST_README_URL}`,
      );
      return new Map();
    }

    const alerts = parseGscEmailAlerts(await response.text(), detectedAt);
    const byHost = new Map<string, GscEmailAlert[]>();
    for (const alert of alerts) {
      const host = normalizeHostKey(alert.site);
      if (!host) {
        continue;
      }
      byHost.set(host, [...(byHost.get(host) ?? []), alert]);
    }
    return byHost;
  } catch (error) {
    console.warn(`Gmail digest GSC alerts skipped: ${getErrorMessage(error)}`);
    return new Map();
  }
}

function getHostname(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
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
  canonicalUrl?: string,
): Promise<SitemapSummary> {
  const response = await client.sitemaps.list(
    { siteUrl },
    { timeout: GOOGLE_API_TIMEOUT_MS },
  );
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
  const selected = selectRepresentativeSitemap(datedSitemaps, canonicalUrl);

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

export function selectRepresentativeSitemap<
  T extends { path?: string | null },
>(sitemaps: T[], canonicalUrl?: string): T | undefined {
  const canonicalHost = getHostname(canonicalUrl);
  const sameHostSitemaps = canonicalHost
    ? sitemaps.filter((sitemap) => getHostname(sitemap.path) === canonicalHost)
    : [];

  return (
    sameHostSitemaps.find((sitemap) => isRootSitemapPath(sitemap.path)) ??
    sameHostSitemaps.find((sitemap) => isXmlSitemapPath(sitemap.path)) ??
    sameHostSitemaps[0] ??
    sitemaps.find((sitemap) => isRootSitemapPath(sitemap.path)) ??
    sitemaps.find((sitemap) => isXmlSitemapPath(sitemap.path)) ??
    sitemaps[0]
  );
}

function isRootSitemapPath(path: string | null | undefined): boolean {
  if (!path) {
    return false;
  }

  try {
    const url = new URL(path);
    const pathname = url.pathname.replace(/\/+$/, "").toLowerCase();
    return (
      url.search === "" &&
      (pathname.endsWith("/sitemap.xml") ||
        pathname.endsWith("/sitemap_index.xml"))
    );
  } catch {
    return false;
  }
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
    site.contentSource.type === "github-next" ||
    site.contentSource.type === "local-app"
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
  gscEmailAlertsByHost: Map<string, GscEmailAlert[]>,
  previousStat: SiteStat | undefined,
  reportProgress: (phase: string) => void = () => undefined,
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
  let ga4SourceMedium: TrafficBreakdownMetric[] = [];
  let ga4LandingPages: TrafficBreakdownMetric[] = [];
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
    reportProgress("ga4-metrics");
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

    reportProgress("ga4-keywords");
    try {
      ga4TrafficKeywords = await fetchGa4TrafficKeywords(
        ga4Client,
        site.ga4PropertyId,
        RANGE_DAYS,
      );
    } catch {
      ga4TrafficKeywords = [];
    }

    reportProgress("ga4-breakdown");
    try {
      [ga4SourceMedium, ga4LandingPages] = await Promise.all([
        fetchGa4TrafficBreakdown(ga4Client, site.ga4PropertyId, "sourceMedium"),
        fetchGa4TrafficBreakdown(ga4Client, site.ga4PropertyId, "landingPage"),
      ]);
    } catch {
      ga4SourceMedium = [];
      ga4LandingPages = [];
    }
  }

  const gscSiteUrl = site.gscSiteUrl ?? site.url;
  const gscEmailAlerts = [
    ...(gscEmailAlertsByHost.get(normalizeHostKey(site.url) ?? "") ?? []),
    ...(gscEmailAlertsByHost.get(normalizeHostKey(gscSiteUrl) ?? "") ?? []),
  ].filter(
    (alert, index, alerts) =>
      alerts.findIndex(
        (candidate) =>
          candidate.site === alert.site &&
          candidate.issue === alert.issue &&
          candidate.time === alert.time,
      ) === index,
  );
  const siteTrafficKeywords = getExternalTrafficKeywordsForSite(
    externalTrafficKeywords,
    site,
  );

  reportProgress("gsc-metrics");
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

  reportProgress("sitemap");
  try {
    sitemapSummary = await fetchSitemapSummary(
      gscClient,
      gscSiteUrl,
      site.sitemapUrls,
      site.url,
    );
  } catch (searchError) {
    sitemapError = getErrorMessage(searchError);
  }

  const monetizationEnabled = site.monetization !== false;
  if (monetizationEnabled) {
    reportProgress("adsense");
    adsenseResult = await collectAdsenseCodeStatus(
      site,
      previousStat,
      collectedAt,
    );
    reportProgress("ads-txt");
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
    ga4SourceMedium,
    ga4LandingPages,
    ga4Status: statusFromError(error, "api_error"),
    gscStatus: statusFromError(gscError, "api_error"),
    ...(gscEmailAlerts.length > 0 ? { gscEmailAlerts } : {}),
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

  reportProgress("content");
  const wpStats = await fetchWpStats(site);
  if (wpStats.lastPublishedAt) {
    stat.lastPublishedAt = wpStats.lastPublishedAt;
  }
  if (wpStats.lastScheduledAt) {
    stat.lastScheduledAt = wpStats.lastScheduledAt;
  }

  return stat;
}

export function buildFailedSiteStat(
  site: Site,
  previousStat: SiteStat | undefined,
  errorMessage: string,
  failedPhase?: string,
): SiteStat {
  const gscSiteUrl = site.gscSiteUrl ?? site.url;
  const base: SiteStat = previousStat ?? {
    id: site.id,
    name: site.name ?? site.id,
    url: site.url,
    ga4PropertyId: site.ga4PropertyId ?? "",
    gscSiteUrl,
    last1Days: emptyMetrics(),
    last7Days: emptyMetrics(),
    previous7Days: emptyMetrics(),
    last30Days: emptyMetrics(),
    gscLast7Days: emptyGscMetrics(),
    gscPrevious7Days: emptyGscMetrics(),
    gscLast30Days: emptyGscMetrics(),
    ga4Status: "api_error",
    gscStatus: "api_error",
  };
  const error = `stats:update site collection failed: ${errorMessage}`;

  if (failedPhase === "content" && previousStat) {
    return {
      ...base,
      id: site.id,
      name: site.name ?? previousStat.name ?? site.id,
      url: site.url,
      ga4PropertyId: site.ga4PropertyId ?? previousStat.ga4PropertyId ?? "",
      gscSiteUrl,
      // Content collection runs after GA4, GSC, and monetization probes. Its
      // timeout must not turn completed probes into synthetic API failures.
      ga4Status: "ok",
      gscStatus: "ok",
      ...(site.monetization === false
        ? { monetization: false }
        : {
            adsenseStatus: "ok" as const,
            adsTxtStatus: "ok" as const,
            adsenseCollectorStatus: "ok" as const,
            adsTxtCollectorStatus: "ok" as const,
          }),
      error,
      collectionFailurePhase: failedPhase,
    };
  }

  return {
    ...base,
    id: site.id,
    name: site.name ?? previousStat?.name ?? site.id,
    url: site.url,
    ga4PropertyId: site.ga4PropertyId ?? previousStat?.ga4PropertyId ?? "",
    gscSiteUrl,
    ga4Status: statusFromError(error, "api_error"),
    gscStatus: statusFromError(error, "api_error"),
    adsenseStatus: site.monetization === false ? undefined : statusFromError(error, "api_error"),
    adsTxtStatus: site.monetization === false ? undefined : statusFromError(error, "api_error"),
    adsenseCollectorStatus: site.monetization === false ? undefined : "transient_error",
    adsTxtCollectorStatus: site.monetization === false ? undefined : "transient_error",
    error,
    ga4ErrorKind: classifyError(error),
    gscErrorKind: classifyError(error),
    adsenseErrorKind: site.monetization === false ? undefined : classifyError(error),
    adsTxtErrorKind: site.monetization === false ? undefined : classifyError(error),
    ...(failedPhase ? { collectionFailurePhase: failedPhase } : {}),
  };
}

async function runStatsUpdate(): Promise<void> {
  loadLocalSecrets();
  const keyJson = readSecret("GCP_SA_KEY_JSON");

  if (!keyJson) {
    throw new Error(
      "GCP_SA_KEY_JSON is missing. Add it to D:\\env\\키파일.txt or .env.setup.local.",
    );
  }

  const sites = (await loadSites()).filter((site) => site.enabled !== false);
  const credentials = parseServiceAccountKey(keyJson);
  const ga4Client = new BetaAnalyticsDataClient({ credentials });
  const auth = makeGoogleAuth(keyJson, [
    "https://www.googleapis.com/auth/webmasters.readonly",
  ]);
  const gscClient = google.searchconsole({ version: "v1", auth });
  const limit = pLimit(CONCURRENCY);
  const externalTrafficKeywords = await loadExternalTrafficKeywords();
  const gscEmailAlertsByHost = await loadGscEmailAlerts();
  const previousStatsById = await loadPreviousStatsById();
  const runStartedAt = Date.now();
  let completed = 0;
  const inFlight = new Map<string, SiteProgressState>();
  const progressTimer = setInterval(() => {
    logStatsUpdate(
      `progress completed=${completed}/${sites.length}, elapsed=${formatElapsed(
        Date.now() - runStartedAt,
      )}, inFlight=${summarizeInFlight(inFlight)}`,
    );
  }, PROGRESS_INTERVAL_MS);
  progressTimer.unref();

  logStatsUpdate(
    `starting sites=${sites.length}, concurrency=${CONCURRENCY}, ga4Concurrency=${GA4_CONCURRENCY}, ga4MinIntervalMs=${GA4_MIN_INTERVAL_MS}, progressIntervalMs=${PROGRESS_INTERVAL_MS}, runTimeoutMs=${RUN_TIMEOUT_MS}, siteTimeoutMs=${SITE_TIMEOUT_MS}, slowSiteMs=${SLOW_SITE_MS}, googleApiTimeoutMs=${GOOGLE_API_TIMEOUT_MS}`,
  );

  let stats: SiteStat[];
  try {
    stats = await Promise.all(
      sites.map((site) =>
        limit(async () => {
          const siteStartedAt = Date.now();
          inFlight.set(site.id, {
            name: site.name ?? site.id,
            phase: "start",
            startedAt: siteStartedAt,
            updatedAt: siteStartedAt,
          });
          logStatsUpdate(
            `site start id=${site.id}, name=${site.name ?? site.id}`,
          );

          const reportProgress = (phase: string) => {
            const current = inFlight.get(site.id);
            if (current) {
              current.phase = phase;
              current.updatedAt = Date.now();
            }
          };

          try {
            const stat = await withTimeout(
              fetchSiteStat(
                ga4Client,
                gscClient,
                site,
                externalTrafficKeywords,
                gscEmailAlertsByHost,
                previousStatsById.get(site.id),
                reportProgress,
              ),
              SITE_TIMEOUT_MS,
              `site ${site.id}`,
            );
            completed += 1;
            const elapsed = Date.now() - siteStartedAt;
            const status =
              `ga4=${stat.ga4Status ?? "unknown"}, ` +
              `gsc=${stat.gscStatus ?? "unknown"}, ` +
              `adsense=${stat.adsenseStatus ?? "disabled"}, ` +
              `adsTxt=${stat.adsTxtStatus ?? "disabled"}`;
            const message = `site done id=${site.id}, elapsed=${formatElapsed(
              elapsed,
            )}, ${status}`;
            if (elapsed >= SLOW_SITE_MS) {
              console.warn(`[stats:update] slow ${message}`);
            } else {
              logStatsUpdate(message);
            }
            return stat;
          } catch (error) {
            completed += 1;
            const errorMessage = getErrorMessage(error);
            const failedPhase = inFlight.get(site.id)?.phase;
            console.error(
              `[stats:update] site failed id=${site.id}, phase=${
                failedPhase ?? "unknown"
              }, elapsed=${formatElapsed(
                Date.now() - siteStartedAt,
              )}: ${errorMessage}`,
            );
            return buildFailedSiteStat(
              site,
              previousStatsById.get(site.id),
              errorMessage,
              failedPhase,
            );
          } finally {
            inFlight.delete(site.id);
          }
        }),
      ),
    );
  } finally {
    clearInterval(progressTimer);
  }

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
  const gscEmailAlerts = stats.reduce(
    (total, site) => total + (site.gscEmailAlerts?.length ?? 0),
    0,
  );
  const adsenseCodeNotDetected = stats.filter(
    (site) => isCurrentAdsenseInstallFailure(site),
  ).length;
  const adsenseTransientErrors = stats.filter(
    (site) => site.adsenseCollectorStatus === "transient_error",
  ).length;
  const adsTxtFailed = stats.filter((site) => isCurrentAdsTxtFailure(site)).length;
  const adsTxtTransientErrors = stats.filter(
    (site) => site.adsTxtCollectorStatus === "transient_error",
  ).length;
  const sitemapChecked = stats.filter(
    (site) => site.sitemapLastDownloadedAt || site.sitemapLastSubmittedAt,
  ).length;
  const sitemapFailed = stats.filter((site) => site.sitemapError).length;
  console.log(
    `Stats updated: ${stats.length} sites, concurrency=${CONCURRENCY}, GA4 failed=${ga4Failed}, GSC failed=${gscFailed}, GSC email alerts=${gscEmailAlerts}, sitemaps checked=${sitemapChecked}, sitemaps failed=${sitemapFailed}, AdSense code not detected=${adsenseCodeNotDetected}, AdSense transient=${adsenseTransientErrors}, ads.txt failed=${adsTxtFailed}, ads.txt transient=${adsTxtTransientErrors}, output=${OUTPUT_PATH}, history=${historyPath}`,
  );
}

export function isCurrentAdsenseInstallFailure(
  site: Pick<SiteStat, "adsenseError" | "adsenseErrorKind" | "adsenseCollectorStatus">,
): boolean {
  return (
    Boolean(site.adsenseError) &&
    site.adsenseErrorKind === "missing_config" &&
    site.adsenseCollectorStatus === "ok"
  );
}

export function isCurrentAdsTxtFailure(
  site: Pick<SiteStat, "adsTxtError" | "adsTxtErrorKind" | "adsTxtCollectorStatus">,
): boolean {
  return (
    Boolean(site.adsTxtError) &&
    site.adsTxtErrorKind === "missing_config" &&
    site.adsTxtCollectorStatus === "ok"
  );
}

async function main(): Promise<void> {
  const releaseLock = await acquireStatsUpdateLock();
  try {
    if (RUN_TIMEOUT_MS > 0) {
      await withTimeout(
        runStatsUpdate(),
        RUN_TIMEOUT_MS,
        "stats:update full run",
      );
    } else {
      await runStatsUpdate();
    }
  } finally {
    await releaseLock();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
