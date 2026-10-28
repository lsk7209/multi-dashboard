import type { SiteStat } from "./dashboard-data";
import type { InventorySite } from "./site-inventory";

export interface ServerSiteRow {
  periods?: Record<"1" | "7" | "14" | "30", { users: number | null; clicks: number | null; impressions: number | null; ctr: number | null; position: number | null }>;
  domain: string;
  url: string;
  host: string;
  approval: string;
  httpStatus?: number | null;
  ga4Status: string;
  dailyUsers: number | null;
  weeklyUsers: number | null;
  monthlyUsers?: number | null;
  previousWeeklyUsers?: number | null;
  weeklyChange?: number | null;
  gscStatus: string;
  clicks: number | null;
  impressions: number | null;
  ctr?: number | null;
  position?: number | null;
  checkedAt?: string | null;
  hostStatus?: string;
  stagingTargets?: Array<{ host: string; checkedAt: string }>;
  issues?: string[];
}

const finiteMetric = (value: number | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export function serverSiteMetrics(site: Pick<InventorySite, "domain" | "url" | "host" | "approval" | "bindings"> & Partial<Pick<InventorySite, "httpStatus" | "checkedAt" | "hostStatus" | "stagingTargets" | "issues">>, stats: SiteStat[]): ServerSiteRow {
  const sameDomain = (url: string) => {
    try { return new URL(url).hostname.replace(/^www\./, "") === site.domain.replace(/^www\./, ""); }
    catch { return false; }
  };
  const bindings = site.bindings.filter(binding => binding.enabled);
  const candidates = bindings.map(binding => ({ binding,
    stat: stats.find(stat => stat.id === binding.id && sameDomain(stat.url)),
  }));
  const ga4 = candidates.find(({ binding, stat }) => binding.ga4Status === "ok" && stat?.ga4Status === "ok" && stat.ga4PropertyId === binding.ga4PropertyId);
  const gsc = candidates.find(({ binding, stat }) => binding.gscStatus === "ok" && stat?.gscStatus === "ok" && stat.gscSiteUrl === binding.gscSiteUrl && Boolean(binding.gscSiteUrl));
  const weeklyUsers = finiteMetric(ga4?.stat?.last7Days?.activeUsers);
  const previousWeeklyUsers = finiteMetric(ga4?.stat?.previous7Days?.activeUsers);
  const weeklyChange = weeklyUsers === null || previousWeeklyUsers === null
    ? null
    : previousWeeklyUsers === 0
      ? weeklyUsers === 0 ? 0 : null
      : (weeklyUsers - previousWeeklyUsers) / previousWeeklyUsers * 100;
  const period = (users: number | undefined, search: SiteStat["gscLast7Days"]) => ({ users: finiteMetric(users), clicks: finiteMetric(search?.clicks), impressions: finiteMetric(search?.impressions), ctr: finiteMetric(search?.ctr), position: finiteMetric(search?.position) });
  const periods = {
    "1": period(ga4?.stat?.last1Days?.activeUsers, gsc?.stat?.gscLast1Days?.impressions ? gsc.stat.gscLast1Days : undefined),
    "7": period(ga4?.stat?.last7Days?.activeUsers, gsc?.stat?.gscLast7Days),
    "14": period(ga4?.stat?.last14Days?.activeUsers, gsc?.stat?.gscLast14Days),
    "30": period(ga4?.stat?.last30Days?.activeUsers, gsc?.stat?.gscLast30Days),
  };
  return { periods, domain: site.domain, url: site.url, host: site.host, approval: site.approval,
    httpStatus: site.httpStatus ?? null,
    checkedAt: site.checkedAt ?? null,
    ...(site.hostStatus !== undefined ? { hostStatus: site.hostStatus } : {}),
    ...(site.stagingTargets !== undefined ? { stagingTargets: site.stagingTargets } : {}),
    ...(site.issues !== undefined ? { issues: site.issues } : {}),
    ga4Status: ga4 ? "ok" : bindings.find(binding => ["binding_mismatch", "binding_unknown"].includes(binding.ga4Status))?.ga4Status ?? candidates.find(({ stat }) => stat?.ga4Status && stat.ga4Status !== "ok")?.stat?.ga4Status ?? (bindings.length ? "binding_unknown" : "not_collected"),
    dailyUsers: finiteMetric(ga4?.stat?.last1Days?.activeUsers),
    weeklyUsers, monthlyUsers: finiteMetric(ga4?.stat?.last30Days?.activeUsers),
    previousWeeklyUsers, weeklyChange,
    gscStatus: gsc ? "ok" : candidates.find(({ stat }) => stat?.gscStatus && stat.gscStatus !== "ok")?.stat?.gscStatus ?? bindings.find(binding => binding.gscStatus !== "ok")?.gscStatus ?? "not_collected",
    clicks: finiteMetric(gsc?.stat?.gscLast7Days?.clicks),
    impressions: finiteMetric(gsc?.stat?.gscLast7Days?.impressions),
    ctr: finiteMetric(gsc?.stat?.gscLast7Days?.ctr),
    position: finiteMetric(gsc?.stat?.gscLast7Days?.position),
  };
}
