import { describe, expect, it } from "vitest";
import { getServerSiteIssues, serverSiteMatchesFocus, serverSiteMatchesHost, type ServerSiteFocus } from "./server-site-insights";
import type { ServerSiteRow } from "./server-site-metrics";

const row = (changes: Partial<ServerSiteRow> = {}): ServerSiteRow => ({
  domain: "example.com", url: "https://example.com", host: "ovh", hostStatus: "public_route_verified",
  approval: "READY", httpStatus: 200, ga4Status: "ok", dailyUsers: 10,
  weeklyUsers: 70, previousWeeklyUsers: 100, weeklyChange: -30, monthlyUsers: 300,
  gscStatus: "ok", clicks: 1, impressions: 100, ctr: 0.01, position: 20,
  ...changes,
});

describe("server site insights", () => {
  it("keeps known host classification when public route verification is unavailable", () => {
    const site = row({ host: "ovh", hostStatus: "unverified" });
    expect(serverSiteMatchesHost(site, "ovh")).toBe(true);
    expect(serverSiteMatchesHost(site, "unknown")).toBe(false);
    expect(serverSiteMatchesFocus(site, "migration")).toBe(true);
    expect(serverSiteMatchesHost(row({ host: "turbo_pending" }), "unknown")).toBe(true);
    expect(serverSiteMatchesHost(row({ host: "kickstart" }), "unknown")).toBe(true);
    expect(serverSiteMatchesHost(site, "all")).toBe(true);
    expect(serverSiteMatchesHost(site, "contabo")).toBe(false);
  });
  it("uses measured decline and search thresholds, including valid boundaries", () => {
    expect(serverSiteMatchesFocus(row(), "decline")).toBe(true);
    expect(serverSiteMatchesFocus(row(), "search")).toBe(true);
    expect(serverSiteMatchesFocus(row({ previousWeeklyUsers: 49 }), "decline")).toBe(false);
    expect(serverSiteMatchesFocus(row({ weeklyChange: -29.99 }), "decline")).toBe(false);
    expect(serverSiteMatchesFocus(row({ weeklyChange: null }), "decline")).toBe(false);
    expect(serverSiteMatchesFocus(row({ weeklyChange: -Infinity }), "decline")).toBe(false);
    expect(serverSiteMatchesFocus(row({ ga4Status: "auth_error" }), "decline")).toBe(false);
    expect(serverSiteMatchesFocus(row({ impressions: 99 }), "search")).toBe(false);
    expect(serverSiteMatchesFocus(row({ position: 0 }), "search")).toBe(false);
    expect(serverSiteMatchesFocus(row({ position: 20.1 }), "search")).toBe(false);
    expect(serverSiteMatchesFocus(row({ ctr: 0.02 }), "search")).toBe(false);
    expect(serverSiteMatchesFocus(row({ ctr: NaN }), "search")).toBe(false);
    expect(serverSiteMatchesFocus(row({ gscStatus: "auth_error" }), "search")).toBe(false);
  });

  it("keeps unknown probes and observed HTTP failures in access without asserting an outage", () => {
    expect(serverSiteMatchesFocus(row({ httpStatus: null }), "access")).toBe(true);
    expect(getServerSiteIssues(row({ httpStatus: null }))).toContain("HTTPS 확인 불가");
    expect(serverSiteMatchesFocus(row({ httpStatus: 410 }), "access")).toBe(true);
    expect(getServerSiteIssues(row({ httpStatus: 410 }))).toContain("HTTPS 410 응답");
    expect(serverSiteMatchesFocus(row({ httpStatus: 503 }), "access")).toBe(true);
    expect(serverSiteMatchesFocus(row({ httpStatus: 301 }), "access")).toBe(false);
  });

  it("recognizes staged, unknown, and unverified hosting independently", () => {
    expect(serverSiteMatchesFocus(row(), "migration")).toBe(false);
    expect(serverSiteMatchesFocus(row({ stagingTargets: [{ host: "turbo2", checkedAt: "2026-10-27" }] }), "migration")).toBe(true);
    expect(serverSiteMatchesFocus(row({ host: "kickstart" }), "migration")).toBe(true);
    const missingStatus = row();
    delete missingStatus.hostStatus;
    expect(serverSiteMatchesFocus(missingStatus, "migration")).toBe(true);
    expect(getServerSiteIssues(row({ hostStatus: "unverified" }))).toContain("현재 호스팅 확인 필요");
  });

  it("aggregates evidence for attention while keeping NOT_LISTED alone nonactionable", () => {
    const ordinary = row({ weeklyChange: 0, ctr: 0.05, approval: "NOT_LISTED" });
    expect(getServerSiteIssues(ordinary)).toEqual([]);
    expect(serverSiteMatchesFocus(ordinary, "attention")).toBe(false);
    expect(serverSiteMatchesFocus(ordinary, "all")).toBe(true);
    const issues = getServerSiteIssues(row({ issues: ["DNS 불일치", "DNS 불일치"], ga4Status: "auth_error", gscStatus: "binding_unknown" }));
    expect(issues).toContain("DNS 불일치");
    expect(issues).toContain("GA4 권한 오류");
    expect(issues).toContain("GSC 연결 미확인");
    expect(issues).not.toContain("최근 7일 사용자 30% 이상 감소");
    expect(issues).not.toContain("검색 노출 대비 클릭률 2% 미만");
    expect(issues.filter(issue => issue === "DNS 불일치")).toHaveLength(1);
    expect(getServerSiteIssues(row())).toContain("최근 7일 사용자 30% 이상 감소");
    expect(serverSiteMatchesFocus(row({ weeklyChange: 0, ctr: 0.05, approval: "REQUIRES_REVIEW" }), "attention")).toBe(true);
  });

  it.each([
    ["auth_error", "권한 오류"], ["permission_denied", "권한 오류"],
    ["binding_unknown", "연결 미확인"], ["binding_mismatch", "연결 불일치"],
    ["api_error", "수집 오류"], ["error", "수집 오류"],
    ["missing_config", "설정 없음"], ["new_status", "수집 확인 필요"],
  ])("labels collection status %s without exposing its raw code", (status, label) => {
    expect(getServerSiteIssues(row({ ga4Status: status, gscStatus: status })).filter(issue => issue.startsWith("GA4 ") || issue.startsWith("GSC "))).toEqual([`GA4 ${label}`, `GSC ${label}`]);
  });

  it.each<ServerSiteFocus>(["access", "decline", "search", "migration", "attention"])("keeps independent %s focus behavior", focus => {
    const ordinary = row({ weeklyChange: 0, ctr: 0.05 });
    expect(serverSiteMatchesFocus(ordinary, focus)).toBe(false);
  });
});
