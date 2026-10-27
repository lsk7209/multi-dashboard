import { describe, expect, it } from "vitest";
import { compareServerSites, type ServerSortKey } from "./server-site-sort";
import type { ServerSiteRow } from "./server-site-metrics";

const row = (domain: string, count: number | null): ServerSiteRow => ({ domain, url: `https://${domain}`, host: "ovh", approval: "READY", ga4Status: "ok", dailyUsers: count, weeklyUsers: count, gscStatus: "ok", clicks: count, impressions: count });

describe("server table sorting", () => {
  it("sorts HTTP results while keeping unavailable probes last", () => {
    const sites = [{ ...row("missing.com", 0), httpStatus: null }, { ...row("error.com", 0), httpStatus: 503 }, { ...row("ok.com", 0), httpStatus: 200 }];
    expect([...sites].sort((a, b) => compareServerSites(a, b, "httpStatus", "asc")).map(site => site.domain)).toEqual(["ok.com", "error.com", "missing.com"]);
    expect([...sites].sort((a, b) => compareServerSites(a, b, "httpStatus", "desc")).map(site => site.domain)).toEqual(["error.com", "ok.com", "missing.com"]);
  });
  it.each<ServerSortKey>(["dailyUsers", "weeklyUsers", "monthlyUsers", "weeklyChange", "clicks", "impressions"])("sorts %s numerically, keeps zero valid and missing values last both ways", key => {
    const sites = [row("unknown.com", null), row("ten.com", 10), row("zero.com", 0), row("two.com", 2)].map(site => ({ ...site, monthlyUsers: site.weeklyUsers, weeklyChange: site.weeklyUsers }));
    expect([...sites].sort((a, b) => compareServerSites(a, b, key, "asc")).map(s => s.domain)).toEqual(["zero.com", "two.com", "ten.com", "unknown.com"]);
    expect([...sites].sort((a, b) => compareServerSites(a, b, key, "desc")).map(s => s.domain)).toEqual(["ten.com", "two.com", "zero.com", "unknown.com"]);
  });
  it("keeps failed metrics at the bottom even if stale values exist", () => {
    const failed = { ...row("failed.com", 999), monthlyUsers: 999, weeklyChange: 999, ga4Status: "auth_error", gscStatus: "auth_error" };
    for (const key of ["dailyUsers", "weeklyUsers", "monthlyUsers", "weeklyChange", "clicks", "impressions"] as const) {
      expect(compareServerSites(failed, { ...row("ok.com", 0), monthlyUsers: 0, weeklyChange: 0 }, key, "desc")).toBeGreaterThan(0);
    }
  });
  it("sorts negative changes and nonfinite values without letting invalid metrics float to the top", () => {
    const sites = [{ ...row("drop.com", 1), weeklyChange: -30 }, { ...row("gain.com", 1), weeklyChange: 20 }, { ...row("invalid.com", 1), weeklyChange: Infinity }];
    expect([...sites].sort((a, b) => compareServerSites(a, b, "weeklyChange", "asc")).map(site => site.domain)).toEqual(["drop.com", "gain.com", "invalid.com"]);
    expect([...sites].sort((a, b) => compareServerSites(a, b, "weeklyChange", "desc")).map(site => site.domain)).toEqual(["gain.com", "drop.com", "invalid.com"]);
  });
  it("sorts domain, host and displayed approval labels, with deterministic domain ties", () => {
    expect(compareServerSites(row("a.com", 2), row("b.com", 2), "domain", "desc")).toBeGreaterThan(0);
    expect(compareServerSites(row("a.com", 2), { ...row("b.com", 2), host: "turbo2" }, "host", "asc")).toBeLessThan(0);
    expect(compareServerSites(row("a.com", 2), row("b.com", 2), "dailyUsers", "desc")).toBeLessThan(0);
    const a = row("a.com", 2), b = { ...row("b.com", 2), approval: "UNKNOWN" };
    expect(Math.sign(compareServerSites(a, b, "approval", "asc"))).toBe(-Math.sign(compareServerSites(a, b, "approval", "desc")));
  });
});
