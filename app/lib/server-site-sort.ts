import { APPROVAL_LABELS } from "./site-inventory";
import type { ServerSiteRow } from "./server-site-metrics";

export type ServerSortKey = "domain" | "host" | "httpStatus" | "dailyUsers" | "weeklyUsers" | "monthlyUsers" | "weeklyChange" | "clicks" | "impressions" | "approval";
export type SortDirection = "asc" | "desc";

export function compareServerSites(a: ServerSiteRow, b: ServerSiteRow, key: ServerSortKey, direction: SortDirection): number {
  const value = (site: ServerSiteRow) => {
    if ((key === "dailyUsers" || key === "weeklyUsers" || key === "monthlyUsers" || key === "weeklyChange") && site.ga4Status !== "ok") return null;
    if ((key === "clicks" || key === "impressions") && site.gscStatus !== "ok") return null;
    const result = key === "approval" ? APPROVAL_LABELS[site.approval] ?? "미확인" : site[key] ?? null;
    return typeof result === "number" && !Number.isFinite(result) ? null : result;
  };
  const left = value(a);
  const right = value(b);
  // Unknown and failed metrics stay below measured values in both directions.
  if (left === null && right !== null) return 1;
  if (right === null && left !== null) return -1;
  const order = typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left ?? "").localeCompare(String(right ?? ""), "ko", { numeric: true });
  return order * (direction === "asc" ? 1 : -1) || a.domain.localeCompare(b.domain);
}
