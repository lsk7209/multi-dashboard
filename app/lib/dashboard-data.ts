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

export interface SiteStat {
  id: string;
  name: string;
  url: string;
  ga4PropertyId: string;
  last7Days: MetricSet;
  last28Days: MetricSet;
  error?: string;
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
    last7Days: emptyMetrics(),
    last28Days: emptyMetrics(),
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
