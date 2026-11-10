import { describe, expect, it } from "vitest";
import { applyAdSenseEvidence, type ConsoleObservation } from "./adsense-evidence";
import type { SiteInventory } from "./site-inventory";
const checkedAt = "2026-11-10T08:00:00Z";
const now = Date.parse(checkedAt);
const inventory = {sites: ["nekau.com", "sub.nekau.com", "other.com"].map(domain => ({domain, monetization:true}))} as SiteInventory;
const account = {publisherId:"pub-1234", rawState:"GETTING_READY", checkedAt};
const observation: ConsoleObservation = {domain:"nekau.com", state:"GETTING_READY", adsTxtState:"AUTHORIZED", observedAt:checkedAt, consoleUpdatedAt:"2026-11-08T08:14:00Z", source:"operator_console_screenshot"};
describe("exact-domain AdSense account evidence", () => {
  it("does not trust account-less READY rows as proof of account registration", () => {
    const row=applyAdSenseEvidence(inventory,{listComplete:true,checkedAt,sites:[{domain:"nekau.com",rawState:"READY"}]},[],now).sites[0];
    expect(row.approval).toBe("UNKNOWN");
    expect(row.adsense?.source).toBe("unknown");
    expect(row.adsense?.accounts).toEqual([]);
  });
  it("preserves a positive current account match in partial coverage without inferring absence", () => {
    const result=applyAdSenseEvidence(inventory,{listComplete:false,sites:[{domain:"nekau.com",rawState:"GETTING_READY",accountStates:[account]}]},[],now);
    expect(result.sites[0].approval).toBe("GETTING_READY");
    expect(result.sites[0].adsense?.accounts).toEqual([account]);
    expect(result.sites[0].adsense?.coverage).toBe("partial");
    expect(result.sites[1].approval).toBe("UNKNOWN");
  });
  it("keeps multiple disagreeing accounts and does not choose one", () => {
    const result=applyAdSenseEvidence(inventory,{listComplete:true,checkedAt,sites:[{domain:"nekau.com",rawState:"UNKNOWN",accountStates:[account,{...account,publisherId:"pub-5678",rawState:"READY"}]}]},[observation],now);
    expect(result.sites[0].approval).toBe("UNKNOWN");
    expect(result.sites[0].adsense?.accounts).toHaveLength(2);
    expect(result.sites[0].adsense?.source).toBe("adsense_management_api_v2");
  });
  it("keeps console Ads.txt approval separate from site readiness and never invents an account", () => {
    const row=applyAdSenseEvidence(inventory,{},[observation],now).sites[0];
    expect(row.approval).toBe("GETTING_READY");
    expect(row.adsense?.accounts).toEqual([]);
    expect(row.adsense?.source).toBe("operator_console_screenshot");
    expect(row.adsense?.consoleObservation?.adsTxtState).toBe("AUTHORIZED");
  });
  it("expires state but retains historical account and console evidence", () => {
    const row=applyAdSenseEvidence(inventory,{listComplete:true,checkedAt,sites:[{domain:"nekau.com",rawState:"GETTING_READY",accountStates:[account]}]},[observation],now+86400001).sites[0];
    expect(row.approval).toBe("UNKNOWN");
    expect(row.adsense?.accounts).toHaveLength(1);
    expect(row.adsense?.consoleObservation).toEqual(observation);
  });
  it("requires fresh complete scoped evidence for absence and respects monetization exclusions", () => {
    const result=applyAdSenseEvidence(inventory,{checkedAt,listComplete:true,proofDomains:["other.com"],sites:[]},[],now);
    expect(result.sites.map(row=>row.approval)).toEqual(["UNKNOWN","UNKNOWN","NOT_LISTED"]);
    const excluded={...inventory,sites:[{...inventory.sites[0],monetization:false}]};
    expect(applyAdSenseEvidence(excluded,{},[observation],now).sites[0].approval).toBe("EXCLUDED");
  });
});
