import { existsSync, readFileSync } from "node:fs";
import YAML from "yaml";

export interface Site {
  id: string;
  name?: string;
  enabled?: boolean;
  platform?: string;
  url: string;
  wpRestBase?: string;
  ga4PropertyId?: string;
  gscSiteUrl?: string;
}

interface SitesFile {
  sites?: Site[];
}

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

export interface SiteStat {
  id: string;
  name: string;
  url: string;
  ga4PropertyId: string;
  gscSiteUrl?: string;
  last7Days: MetricSet;
  last28Days: MetricSet;
  gscLast7Days?: GscMetricSet;
  gscLast28Days?: GscMetricSet;
  error?: string;
  gscError?: string;
}

interface StatsSnapshot {
  generatedAt: string | null;
  rangeDays: number;
  previousRangeDays: number;
  stats: SiteStat[];
}

export interface DashboardData {
  generatedAt: string | null;
  sites: Site[];
  stats: SiteStat[];
  siteCount: number;
  trackedCount: number;
  failedCount: number;
  totalLast7Days: MetricSet;
  totalLast28Days: MetricSet;
  totalGscLast7Days: GscMetricSet;
  totalGscLast28Days: GscMetricSet;
}

export function getDashboardData(): DashboardData {
  const sites = readSites("scripts/setup/sites.yaml").filter((site) => site.enabled !== false);
  const snapshot = readStats("data/site-stats.json");
  const statsById = new Map(snapshot.stats.map((stat) => [stat.id, stat]));
  const stats = sites.map((site) => statsById.get(site.id) ?? emptySiteStat(site));

  return {
    generatedAt: snapshot.generatedAt,
    sites,
    stats,
    siteCount: sites.length,
    trackedCount: stats.filter((stat) => !stat.error && stat.ga4PropertyId).length,
    failedCount: stats.filter((stat) => stat.error).length,
    totalLast7Days: sumMetrics(stats.map((stat) => stat.last7Days)),
    totalLast28Days: sumMetrics(stats.map((stat) => stat.last28Days)),
    totalGscLast7Days: sumGscMetrics(stats.map((stat) => stat.gscLast7Days ?? emptyGscMetrics())),
    totalGscLast28Days: sumGscMetrics(stats.map((stat) => stat.gscLast28Days ?? emptyGscMetrics())),
  };
}

function readSites(path: string): Site[] {
  if (!existsSync(path)) {
    return [];
  }

  const raw = readFileSync(path, "utf8");
  const parsed = (YAML.parse(raw) ?? {}) as SitesFile;
  return parsed.sites ?? [];
}

function readStats(path: string): StatsSnapshot {
  if (!existsSync(path)) {
    return { generatedAt: null, rangeDays: 7, previousRangeDays: 28, stats: [] };
  }

  return JSON.parse(readFileSync(path, "utf8")) as StatsSnapshot;
}

function emptySiteStat(site: Site): SiteStat {
  return {
    id: site.id,
    name: site.name ?? site.id,
    url: site.url,
    ga4PropertyId: site.ga4PropertyId ?? "",
    gscSiteUrl: site.gscSiteUrl ?? site.url,
    last7Days: emptyMetrics(),
    last28Days: emptyMetrics(),
    gscLast7Days: emptyGscMetrics(),
    gscLast28Days: emptyGscMetrics(),
    error: site.ga4PropertyId ? "통계 스냅샷 없음" : "GA4 속성 없음",
  };
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

function sumMetrics(metrics: MetricSet[]): MetricSet {
  return metrics.reduce(
    (total, metric) => ({
      activeUsers: total.activeUsers + metric.activeUsers,
      sessions: total.sessions + metric.sessions,
      screenPageViews: total.screenPageViews + metric.screenPageViews,
      eventCount: total.eventCount + metric.eventCount,
    }),
    emptyMetrics(),
  );
}

function sumGscMetrics(metrics: GscMetricSet[]): GscMetricSet {
  const totals = metrics.reduce(
    (total, metric) => ({
      clicks: total.clicks + metric.clicks,
      impressions: total.impressions + metric.impressions,
      weightedCtr: total.weightedCtr + metric.ctr * metric.impressions,
      weightedPosition: total.weightedPosition + metric.position * metric.impressions,
    }),
    { clicks: 0, impressions: 0, weightedCtr: 0, weightedPosition: 0 },
  );

  return {
    clicks: totals.clicks,
    impressions: totals.impressions,
    ctr: totals.impressions === 0 ? 0 : totals.weightedCtr / totals.impressions,
    position: totals.impressions === 0 ? 0 : totals.weightedPosition / totals.impressions,
  };
}
