import {describe, expect, it} from "vitest";
import {readFileSync} from "node:fs";
import {operationStatus, expectedHost, parseSiteOperationsPolicy} from "./site-operations";
import {serverSiteMatchesFocus, serverSiteMatchesHost} from "./server-site-insights";
import type {ServerSiteRow} from "./server-site-metrics";

const policy = {decidedAt:"2026-11-15T00:00:00Z",source:"operator",coreSites:[{domain:"example.com",host:"ovh"}],pausedSites:["old.example.com"]};
describe("operator site policy", () => {
  it("keeps exact core host despite routing drift and never inherits to subdomains", () => {
    const parsed = parseSiteOperationsPolicy(policy);
    expect(operationStatus("EXAMPLE.COM",parsed)).toBe("core");
    expect(operationStatus("old.example.com",parsed)).toBe("paused");
    expect(operationStatus("new.example.com",parsed)).toBe("paused");
    const row = {host:"unknown",operationStatus:"core",operationExpectedHost:expectedHost("example.com",parsed)} as ServerSiteRow;
    expect(serverSiteMatchesHost(row,"ovh")).toBe(true);
    expect(serverSiteMatchesHost(row,"paused")).toBe(false);
  });
  it("fails closed for missing or conflicting policy", () => {
    expect(operationStatus("example.com",null)).toBe("paused");
    expect(parseSiteOperationsPolicy({...policy,pausedSites:["EXAMPLE.COM"]})).toBeNull();
    expect(parseSiteOperationsPolicy({...policy,coreSites:[...policy.coreSites,...policy.coreSites]})).toBeNull();
    expect(parseSiteOperationsPolicy({})).toBeNull();
  });
  it("preserves paused rows in all/history but removes all actionable focus matches", () => {
    const row = {operationStatus:"paused",host:"ovh",httpStatus:410,ga4Status:"auth_error",gscStatus:"auth_error"} as ServerSiteRow;
    expect(serverSiteMatchesFocus(row,"all")).toBe(true);
    for (const focus of ["access","decline","search","migration","attention"] as const) expect(serverSiteMatchesFocus(row,focus)).toBe(false);
    expect(serverSiteMatchesHost(row,"paused")).toBe(true);
    expect(serverSiteMatchesHost(row,"ovh")).toBe(false);
  });
  it("locks the operator-approved production snapshot and covers every inventoried host", () => {
    const p = parseSiteOperationsPolicy(JSON.parse(readFileSync("data/site-operations-policy.json","utf8")))!;
    const inventory = JSON.parse(readFileSync("data/site-inventory.json","utf8"));
    expect(p.coreSites).toHaveLength(106);
    expect(p.pausedSites).toHaveLength(24);
    expect(new Set([...p.coreSites.map(s=>s.domain),...p.pausedSites])).toEqual(new Set(inventory.sites.map((s:{domain:string})=>s.domain)));
    expect(operationStatus("mbti.tasko.kr",p)).toBe("paused");
    expect(operationStatus("food.2mlab.kr",p)).toBe("paused");
    expect(operationStatus("knewstory.kr",p)).toBe("core");
  });
});
