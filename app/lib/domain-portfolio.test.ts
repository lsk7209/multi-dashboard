import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {domainWarnings,ownedDomains,parseDomainPortfolio,remainingDays,renewalLabel,siteRegistration,type DomainPortfolio} from "./domain-portfolio";
const portfolio:DomainPortfolio={checkedAt:"2026-11-15T00:00:00Z",sources:[],domains:[{domain:"example.com",registrar:"Dynadot",status:"registered",expiresAt:"2026-11-22T00:00:00Z",autoRenew:"manual renewal",hold:"no",disabled:"no",registrantUnverified:"yes",checkedAt:"2026-11-15T00:00:00Z",source:"API"}],sites:[{domain:"sub.example.com",registrationDomain:"example.com",checkedAt:"2026-11-15T00:00:00Z"}]};
describe("domain registration evidence",()=>{
  it("uses explicit child-to-registration mapping without inventing registrations",()=>{
    expect(siteRegistration("sub.example.com",portfolio).record?.domain).toBe("example.com");
    expect(siteRegistration("other.example.com",portfolio).record).toBeNull();
    expect(siteRegistration("example.com",portfolio).record?.domain).toBe("example.com");
    expect(siteRegistration("example.com",null).record).toBeNull();
  });
  it("keeps verification separate from hold and calculates remaining time freshly",()=>{
    const record=portfolio.domains[0]!;
    expect(domainWarnings(record)).toEqual(["등록자 확인 필요"]);
    expect(remainingDays(record,Date.parse("2026-11-15T00:00:00Z"))).toBe(7);
    expect(remainingDays({...record,expiresAt:"invalid"})).toBeNull();
    expect(renewalLabel(record.autoRenew)).toBe("꺼짐");
    expect(renewalLabel("auto-renew")).toBe("켜짐");
    expect(renewalLabel(undefined)).toBe("미확인");
  });
  it("does not count historical deletions as currently owned",()=>{
    expect(ownedDomains({...portfolio,domains:[...portfolio.domains,{...portfolio.domains[0]!,domain:"old.com",status:"deleted"}]})).toHaveLength(1);
    expect(parseDomainPortfolio({...portfolio,sources:[null]})).toBeNull();
  });
  it("strips unknown fields at every public boundary",()=>{
    const parsed=parseDomainPortfolio({...portfolio,secret:"private",sources:[{registrar:"Dynadot",ownedCount:1,ownedComplete:true,contact:"private"}],domains:[{...portfolio.domains[0],nameserverSettings:{EmailForwarding:{ToEmail:"private"}},owner:"private"}],sites:[{...portfolio.sites[0],dnsAnswers:["private"]}]})!;
    expect(Object.keys(parsed).sort()).toEqual(["checkedAt","domains","sites","sources"]);
    expect(Object.keys(parsed.sources[0]!).sort()).toEqual(["ownedComplete","ownedCount","registrar"]);
    expect(Object.keys(parsed.domains[0]!).sort()).toEqual(Object.keys(portfolio.domains[0]!).sort());
    expect(Object.keys(parsed.sites[0]!).sort()).toEqual(Object.keys(portfolio.sites[0]!).sort());
    expect(JSON.stringify(siteRegistration("sub.example.com",parsed))).not.toContain("private");
    expect(JSON.stringify(parsed)).not.toContain("private");
  });
  it("publishes sanitized complete owned coverage and explicit partial deletion coverage",()=>{
    const data=JSON.parse(readFileSync("data/domain-status-current.json","utf8"));
    expect(parseDomainPortfolio(data)).not.toBeNull();
    expect(ownedDomains(data)).toHaveLength(94);
    expect(data.sources.find((s:{registrar:string})=>s.registrar==="HostingKR")).toMatchObject({ownedCount:74,ownedComplete:true,deletedComplete:false});
    expect(data.sources.find((s:{registrar:string})=>s.registrar==="Dynadot")).toMatchObject({ownedCount:20,ownedComplete:true});
    expect(JSON.stringify(data)).not.toMatch(/Owner Email|Owner Name|DYNADOT_API_KEY|ContactId|@gmail/);
    expect(data.sites).toHaveLength(130);
  });
});
