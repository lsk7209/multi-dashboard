export type OperationStatus = "core" | "paused";

export interface SiteOperationsPolicy {
  decidedAt: string;
  source: string;
  coreSites: Array<{ domain: string; host: string }>;
  pausedSites: string[];
}

const domainKey = (value: string) => value.trim().toLowerCase();

export function parseSiteOperationsPolicy(value: unknown): SiteOperationsPolicy | null {
  if (!value || typeof value !== "object") return null;
  const policy = value as Partial<SiteOperationsPolicy>;
  if (typeof policy.decidedAt !== "string" || !Number.isFinite(Date.parse(policy.decidedAt)) ||
      typeof policy.source !== "string" || !policy.source || !Array.isArray(policy.coreSites) || !Array.isArray(policy.pausedSites)) return null;
  const core = new Set<string>();
  for (const site of policy.coreSites) {
    if (!site || typeof site.domain !== "string" || !site.domain.trim() || typeof site.host !== "string" || !site.host.trim()) return null;
    const key = domainKey(site.domain);
    if (core.has(key)) return null;
    core.add(key);
  }
  const paused = new Set<string>();
  for (const domain of policy.pausedSites) {
    if (typeof domain !== "string" || !domain.trim()) return null;
    const key = domainKey(domain);
    if (core.has(key) || paused.has(key)) return null;
    paused.add(key);
  }
  return policy as SiteOperationsPolicy;
}

export function operationStatus(domain: string, policy: SiteOperationsPolicy | null): OperationStatus {
  return policy?.coreSites.some(site => domainKey(site.domain) === domainKey(domain)) ? "core" : "paused";
}

export function expectedHost(domain: string, policy: SiteOperationsPolicy | null): string | null {
  return policy?.coreSites.find(site => domainKey(site.domain) === domainKey(domain))?.host ?? null;
}
