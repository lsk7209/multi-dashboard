import { describe, expect, it } from "vitest";
import { compareServerSites, type ServerSortKey } from "./server-site-sort";
import type { ServerSiteRow } from "./server-site-metrics";

const row = (domain: string, count: number | null): ServerSiteRow => ({ domain, url: `https://${domain}`, host: "ovh", approval: "READY", ga4Status: "ok", dailyUsers: count, weeklyUsers: count, gscStatus: "ok", clicks: count, impressions: count });

describe("server table sorting", () => {
  it.each<ServerSortKey>(["dailyUsers", "weeklyUsers", "clicks", "impressions"])("sorts %s numerically, keeps zero valid and missing values last both ways", key => {
    const sites = [row("unknown.com", null), row("ten.com", 10), row("zero.com", 0), row("two.com", 2)];
    expect([...sites].sort((a, b) => compareServerSites(a, b, key, "asc")).map(s => s.domain)).toEqual(["zero.com", "two.com", "ten.com", "unknown.com"]);
    expect([...sites].sort((a, b) => compareServerSites(a, b, key, "desc")).map(s => s.domain)).toEqual(["ten.com", "two.com", "zero.com", "unknown.com"]);
  });
  it("keeps failed metrics at the bottom even if stale values exist", () => {
    const failed = { ...row("failed.com", 999), ga4Status: "auth_error", gscStatus: "auth_error" };
    for (const key of ["dailyUsers", "weeklyUsers", "clicks", "impressions"] as const) {
      expect(compareServerSites(failed, row("ok.com", 0), key, "desc")).toBeGreaterThan(0);
    }
  });
  it("sorts domain, host and displayed approval labels, with deterministic domain ties", () => {
    expect(compareServerSites(row("a.com", 2), row("b.com", 2), "domain", "desc")).toBeGreaterThan(0);
    expect(compareServerSites(row("a.com", 2), { ...row("b.com", 2), host: "turbo2" }, "host", "asc")).toBeLessThan(0);
    expect(compareServerSites(row("a.com", 2), row("b.com", 2), "dailyUsers", "desc")).toBeLessThan(0);
    const a = row("a.com", 2), b = { ...row("b.com", 2), approval: "UNKNOWN" };
    expect(Math.sign(compareServerSites(a, b, "approval", "asc"))).toBe(-Math.sign(compareServerSites(a, b, "approval", "desc")));
  });
});
