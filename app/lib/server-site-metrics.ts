import type { SiteStat } from "./dashboard-data";
import type { InventorySite } from "./site-inventory";

export interface ServerSiteRow {
  domain: string;
  url: string;
  host: string;
  approval: string;
  ga4Status: string;
  dailyUsers: number | null;
  weeklyUsers: number | null;
  gscStatus: string;
  clicks: number | null;
  impressions: number | null;
}

export function serverSiteMetrics(site: Pick<InventorySite, "domain" | "url" | "host" | "approval" | "bindings">, stats: SiteStat[]): ServerSiteRow {
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
  return { domain: site.domain, url: site.url, host: site.host, approval: site.approval,
    ga4Status: ga4 ? "ok" : bindings.find(binding => ["binding_mismatch", "binding_unknown"].includes(binding.ga4Status))?.ga4Status ?? candidates.find(({ stat }) => stat?.ga4Status && stat.ga4Status !== "ok")?.stat?.ga4Status ?? (bindings.length ? "binding_unknown" : "not_collected"),
    dailyUsers: ga4?.stat?.last1Days?.activeUsers ?? null,
    weeklyUsers: ga4?.stat?.last7Days?.activeUsers ?? null,
    gscStatus: gsc ? "ok" : candidates.find(({ stat }) => stat?.gscStatus && stat.gscStatus !== "ok")?.stat?.gscStatus ?? bindings.find(binding => binding.gscStatus !== "ok")?.gscStatus ?? "not_collected",
    clicks: gsc?.stat?.gscLast7Days?.clicks ?? null,
    impressions: gsc?.stat?.gscLast7Days?.impressions ?? null,
  };
}
