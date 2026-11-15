import { ownedDomains, siteRegistration, type DomainPortfolio, type DomainRecord } from "./domain-portfolio";
import type { OperationStatus } from "./site-operations";

export type DomainUsage = "core" | "paused" | "unlinked" | "unknown";
export interface DomainUsageRow {
  record: DomainRecord;
  usage: DomainUsage;
  sites: string[];
}

// Association comes from the explicit registration mapping, never a suffix guess.
export function domainUsage(portfolio: DomainPortfolio, sites: Array<{domain: string; operationStatus?: OperationStatus}>, policyAvailable: boolean): DomainUsageRow[] {
  const links = new Map<string, typeof sites>();
  for (const site of sites) {
    const root = siteRegistration(site.domain, portfolio).record?.domain;
    if (root) links.set(root, [...(links.get(root) ?? []), site]);
  }
  return ownedDomains(portfolio).map(record => {
    const linked = links.get(record.domain) ?? [];
    const usage: DomainUsage = !policyAvailable ? "unknown"
      : linked.some(site => site.operationStatus === "core") ? "core"
      : linked.length === 0 ? "unlinked"
      : linked.every(site => site.operationStatus === "paused") ? "paused" : "unknown";
    return {record, usage, sites: linked.map(site => site.domain).sort()};
  });
}
