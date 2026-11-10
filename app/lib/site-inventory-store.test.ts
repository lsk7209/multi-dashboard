import {beforeEach,describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
import {getSiteInventory} from "./site-inventory-store";
vi.mock("node:fs",()=>({readFileSync:vi.fn()}));
const inventory={sites:[{domain:"example.com",monetization:true,approval:"NOT_LISTED"}]};
describe("AdSense source read diagnostics",()=>{
  beforeEach(()=>vi.resetAllMocks());
  it("invalidates stale absence and reports unreadable source while keeping hosting rows",()=>{
    vi.mocked(readFileSync).mockImplementation(file=>{
      if(file==="data/site-inventory.json") return JSON.stringify(inventory);
      throw Object.assign(new Error("private detail must not be rendered"),{code:"EACCES"});
    });
    const result=getSiteInventory();
    expect(result?.sites[0].approval).toBe("UNKNOWN");
    expect(result?.adsenseListComplete).toBe(false);
    expect(result?.adsenseDiagnostics).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain("private detail");
  });
  it("publishes partial new evidence instead of retaining a prior complete absence",()=>{
    vi.mocked(readFileSync).mockImplementation(file=>{
      if(file==="data/site-inventory.json") return JSON.stringify({...inventory,adsenseListComplete:true});
      if(file==="data/adsense-account-status-current.json") return JSON.stringify({listComplete:false,sites:[]});
      return "[]";
    });
    const result=getSiteInventory();
    expect(result?.sites[0].approval).toBe("UNKNOWN");
    expect(result?.adsenseListComplete).toBe(false);
    expect(result?.adsenseDiagnostics).toEqual([]);
  });
});
