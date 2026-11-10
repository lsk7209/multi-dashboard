import type { SiteInventory } from "./site-inventory";

export interface AccountState {
  publisherId: string;
  rawState: string;
  checkedAt: string | null;
}
export interface ConsoleObservation {
  domain: string;
  state: string;
  adsTxtState: string;
  observedAt: string;
  consoleUpdatedAt: string;
  source: "operator_console_screenshot";
}
export interface AdSenseEvidence {
  accounts: AccountState[];
  coverage: "configured_accounts_complete" | "partial";
  source: "adsense_management_api_v2" | "operator_console_screenshot" | "unknown";
  checkedAt: string | null;
  consoleObservation?: ConsoleObservation;
}
export interface AdSenseSnapshot {
  checkedAt?: string | null;
  listComplete?: boolean;
  proofDomains?: string[];
  sites?: Array<{domain: string; rawState: string; accountStates?: AccountState[]}>;
  accountInventory?: { configuredSources: number; completeSources: number; failedSources: number; discoveredPublisherIds: string[] };
}
const exactDomain = (value: string) => value.trim().toLowerCase().replace(/\.$/, "");
const fresh = (value: string | null | undefined, now: number) => {
  const age = now - Date.parse(value ?? "");
  return Number.isFinite(age) && age >= -300000 && age <= 86400000;
};

// Positive matches survive an unrelated account failure. Absence requires complete scope.
// Console evidence remains visible after expiry, but never becomes a fresh API result.
export function applyAdSenseEvidence(inventory: SiteInventory, snapshot: AdSenseSnapshot,
  observations: ConsoleObservation[] = [], now = Date.now()): SiteInventory {
  const complete = snapshot.listComplete === true && fresh(snapshot.checkedAt, now);
  return {...inventory, adsenseCheckedAt: snapshot.checkedAt ?? null, adsenseListComplete: complete,
    adsenseAccounts: snapshot.accountInventory,
    sites: inventory.sites.map(site => {
      const domain = exactDomain(site.domain);
      const matches = (snapshot.sites ?? []).filter(row => exactDomain(row.domain) === domain);
      const accounts = matches.flatMap(row => row.accountStates ?? [])
        .filter(account => /^pub-\d+$/.test(account.publisherId));
      const currentAccounts = accounts.filter(account => fresh(account.checkedAt, now));
      const states = new Set(currentAccounts.map(account => account.rawState));
      const consoleObservation = observations.filter(row => exactDomain(row.domain) === domain)
        .sort((a,b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0];
      let state = states.size === 1 ? [...states][0]! : "UNKNOWN";
      let source: AdSenseEvidence["source"] = currentAccounts.length ? "adsense_management_api_v2" : "unknown";
      let checkedAt = currentAccounts.map(account => account.checkedAt!).sort().at(-1) ?? null;
      if (source === "unknown" && consoleObservation && fresh(consoleObservation.observedAt, now)) {
        state = consoleObservation.state;
        source = "operator_console_screenshot";
        checkedAt = consoleObservation.observedAt;
      }
      const inScope = !snapshot.proofDomains || snapshot.proofDomains.some(value => exactDomain(value) === domain);
      if (!matches.length && source === "unknown" && complete && inScope) {
        state = "NOT_LISTED";
        source = "adsense_management_api_v2";
        checkedAt = snapshot.checkedAt ?? null;
      }
      return {...site, approval: site.monetization ? state : "EXCLUDED", approvalCheckedAt: checkedAt,
        adsense: {accounts, coverage: complete ? "configured_accounts_complete" : "partial", source, checkedAt,
          ...(consoleObservation ? {consoleObservation} : {})}};
    })};
}
