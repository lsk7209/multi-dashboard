import { describe, expect, it } from "vitest";
import { serverSiteMetrics } from "./server-site-metrics";
import type { SiteStat } from "./dashboard-data";

const metrics = (activeUsers: number) => ({ activeUsers, sessions: 0, screenPageViews: 0, eventCount: 0 });
const binding = { id: "example", enabled: true, ga4PropertyId: "123", gscSiteUrl: "https://example.com/", ga4Status: "ok", gscStatus: "ok", dailyUsers: 99 };
const site = { domain: "example.com", url: "https://example.com/", host: "ovh", approval: "READY", bindings: [binding] };
const stat: SiteStat = { id: "example", name: "example", url: site.url, ga4PropertyId: "123", gscSiteUrl: binding.gscSiteUrl,
  ga4Status: "ok", gscStatus: "ok", last1Days: metrics(0), last7Days: metrics(42), previous7Days: metrics(60), last30Days: metrics(180), gscLast7Days: { clicks: 0, impressions: 120, ctr: 0, position: 0 } };

describe("server site metrics", () => {
  it("preserves current HTTP failures and unknown probes separately from analytics", () => {
    expect(serverSiteMetrics({ ...site, httpStatus: 503 }, [stat])).toMatchObject({ httpStatus: 503, weeklyUsers: 42 });
    expect(serverSiteMetrics({ ...site, httpStatus: null }, [stat]).httpStatus).toBeNull();
  });
  it("joins exact enabled bindings and preserves valid zero counts and official approval", () => {
    expect(serverSiteMetrics({ ...site, checkedAt: "2026-10-27T00:00:00Z", hostStatus: "public_route_verified", issues: ["DNS 확인"] }, [stat])).toMatchObject({ dailyUsers: 0, weeklyUsers: 42, monthlyUsers: 180, previousWeeklyUsers: 60, weeklyChange: -30, clicks: 0, impressions: 120, ctr: 0, position: 0, checkedAt: "2026-10-27T00:00:00Z", hostStatus: "public_route_verified", issues: ["DNS 확인"], approval: "READY" });
  });
  it("does not replace permission failures with zero or old successful counts", () => {
    expect(serverSiteMetrics(site, [{ ...stat, ga4Status: "auth_error", gscStatus: "auth_error" }])).toMatchObject({ ga4Status: "auth_error", gscStatus: "auth_error", dailyUsers: null, weeklyUsers: null, monthlyUsers: null, weeklyChange: null, clicks: null, impressions: null, ctr: null, position: null });
  });
  it("blocks a mismatched GA4 domain while retaining its independently valid GSC binding", () => {
    expect(serverSiteMetrics({ ...site, bindings: [{ ...binding, ga4Status: "binding_mismatch" }] }, [stat])).toMatchObject({ ga4Status: "binding_mismatch", weeklyUsers: null, monthlyUsers: null, weeklyChange: null, clicks: 0, ctr: 0 });
    expect(serverSiteMetrics(site, [{ ...stat, ga4PropertyId: "999" }])).toMatchObject({ weeklyUsers: null, monthlyUsers: null, weeklyChange: null });
    expect(serverSiteMetrics(site, [{ ...stat, url: "https://other.com/" }])).toMatchObject({ clicks: null, ctr: null, position: null });
  });
  it("keeps disabled and missing records uncollected and rejects a different GSC property", () => {
    expect(serverSiteMetrics({ ...site, bindings: [{ ...binding, enabled: false }] }, [stat])).toMatchObject({ weeklyUsers: null, clicks: null, ga4Status: "not_collected" });
    expect(serverSiteMetrics(site, []).weeklyUsers).toBeNull();
    expect(serverSiteMetrics(site, [{ ...stat, gscSiteUrl: "sc-domain:other.com" }])).toMatchObject({ clicks: null, ctr: null, position: null });
  });
  it("uses one matching property without summing duplicate accounts", () => {
    const other = { ...binding, id: "example-2", ga4PropertyId: "456" };
    expect(serverSiteMetrics({ ...site, bindings: [binding, other] }, [stat, { ...stat, id: other.id, ga4PropertyId: "456", last7Days: metrics(300), last30Days: metrics(900) }])).toMatchObject({ weeklyUsers: 42, monthlyUsers: 180 });
  });
  it("uses finite values and leaves new or unavailable comparisons unknown", () => {
    expect(serverSiteMetrics(site, [{ ...stat, previous7Days: metrics(0) }]).weeklyChange).toBeNull();
    expect(serverSiteMetrics(site, [{ ...stat, previous7Days: metrics(0), last7Days: metrics(0) }]).weeklyChange).toBe(0);
    expect(serverSiteMetrics(site, [{ ...stat, previous7Days: undefined, last30Days: undefined }])).toMatchObject({ weeklyChange: null, monthlyUsers: null });
    expect(serverSiteMetrics(site, [{ ...stat, last30Days: metrics(Infinity), gscLast7Days: { clicks: NaN, impressions: Infinity, ctr: NaN, position: Infinity } }])).toMatchObject({ monthlyUsers: null, clicks: null, impressions: null, ctr: null, position: null });
  });
});
