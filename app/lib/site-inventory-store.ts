import { readFileSync } from "node:fs";
import type { SiteInventory } from "./site-inventory";
import { applyAdSenseEvidence, type ConsoleObservation, type AdSenseSnapshot } from "./adsense-evidence";
import { parseSiteOperationsPolicy, operationStatus, expectedHost } from "./site-operations";
import { parseDomainPortfolio, siteRegistration } from "./domain-portfolio";

export function getSiteInventory(): SiteInventory | null {
  try {
    const inventory = JSON.parse(readFileSync("data/site-inventory.json", "utf8")) as SiteInventory;
    if (!Array.isArray(inventory.sites)) return null;
    let snapshot: AdSenseSnapshot = {};
    let observations: ConsoleObservation[] = [];
    const diagnostics: string[] = [];
    let policy = null;
    let domainPortfolio = null;
    try { policy = parseSiteOperationsPolicy(JSON.parse(readFileSync("data/site-operations-policy.json", "utf8"))); } catch { /* Fail closed below. */ }
    try { domainPortfolio = parseDomainPortfolio(JSON.parse(readFileSync("data/domain-status-current.json", "utf8"))); } catch { /* Separately unavailable. */ }
    try {
      const data = JSON.parse(readFileSync("data/adsense-account-status-current.json", "utf8"));
      if (!data || !Array.isArray(data.sites)) throw new Error("Invalid snapshot");
      snapshot = data;
    } catch { diagnostics.push("AdSense API 스냅샷을 읽지 못했습니다. 현재 계정 조회 범위는 미확인입니다."); }
    try {
      const data = JSON.parse(readFileSync("data/adsense-console-observations.json", "utf8"));
      if (!Array.isArray(data)) throw new Error("Invalid observations");
      observations = data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") diagnostics.push("AdSense 콘솔 관측 기록을 읽지 못했습니다.");
    }
    const withAdsense = applyAdSenseEvidence(inventory, snapshot, observations);
    return {...withAdsense,
      sites: withAdsense.sites.map(site => {
        const observation = domainPortfolio?.sites.find(item => item.domain === site.domain);
        const age = Date.now() - Date.parse(observation?.checkedAt ?? "");
        const current = observation && Number.isFinite(age) && age >= -300000 && age < 86400000;
        return ({...site,
        ...(current ? {httpStatus: observation.httpStatus ?? null, checkedAt: observation.checkedAt} : {}),
        operationStatus: operationStatus(site.domain, policy),
        operationExpectedHost: expectedHost(site.domain, policy),
        registration: siteRegistration(site.domain, domainPortfolio),
      }); }),
      operationsPolicyAvailable: policy !== null,
      operationsDecidedAt: policy?.decidedAt ?? null,
      domainPortfolio, domainPortfolioAvailable: domainPortfolio !== null,
      adsenseDiagnostics: diagnostics};
  } catch { return null; }
}
