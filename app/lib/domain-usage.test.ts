import {describe,expect,it} from "vitest";
import {domainUsage} from "./domain-usage";
import {parseDomainPortfolio, type DomainPortfolio} from "./domain-portfolio";
import {readFileSync} from "node:fs";

const sample: DomainPortfolio = {checkedAt:"2026-11-15T00:00:00Z",sources:[],domains:["core.com","paused.com","unknown.com","unlinked.com","old.com"].map(domain => ({domain,registrar:"Test",status:domain === "old.com" ? "deleted" : "registered",source:"fixture",checkedAt:"2026-11-15T00:00:00Z"})),sites:[{domain:"sub.core.com",registrationDomain:"core.com",checkedAt:"2026-11-15T00:00:00Z"},{domain:"paused.com",registrationDomain:"paused.com",checkedAt:"2026-11-15T00:00:00Z"}]};
describe("owned domain usage association",()=>{
  it("prefers any core child, keeps paused-only separate, never guesses suffix usage or includes deletions",()=>{
    const rows=domainUsage(sample,[{domain:"sub.core.com",operationStatus:"core"},{domain:"core.com",operationStatus:"paused"},{domain:"paused.com",operationStatus:"paused"},{domain:"unknown.com"},{domain:"other.unlinked.com",operationStatus:"core"}],true);
    expect(rows.map(row=>[row.record.domain,row.usage])).toEqual([["core.com","core"],["paused.com","paused"],["unknown.com","unknown"],["unlinked.com","unlinked"]]);
  });
  it("does not label a domain unused when the policy cannot be read",()=>{
    expect(domainUsage(sample,[],false).every(row=>row.usage==="unknown")).toBe(true);
  });
  it("keeps Name.com operator evidence distinct from complete API coverage",()=>{
    const data=parseDomainPortfolio(JSON.parse(readFileSync("data/domain-status-current.json","utf8")))!;
    expect(data.sources.find(source=>source.registrar==="Name.com")).toMatchObject({ownedCount:1,ownedComplete:false});
    expect(data.domains.find(record=>record.domain==="nekau.com")).toMatchObject({registrar:"Name.com",reportedRenewalDate:"2027-06-20",autoRenew:null});
  });
});
