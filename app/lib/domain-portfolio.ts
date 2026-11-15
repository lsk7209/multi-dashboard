export interface DomainRecord {
  domain: string;
  registrar: string;
  status: string;
  expiresAt?: string | null;
  daysRemaining?: number | null;
  autoRenew?: string | null;
  checkedAt: string;
  source: string;
  registrantUnverified?: string;
  hold?: string;
  disabled?: string;
  deletedAt?: string;
}
export interface DomainSiteEvidence {
  domain: string;
  registrationDomain?: string | null;
  checkedAt: string;
  dnsStatus?: number;
  httpStatus?: number;
  finalUrl?: string;
  httpError?: string;
}
export interface DomainPortfolio {
  checkedAt: string;
  sources: Array<{ registrar: string; ownedCount: number; ownedComplete: boolean; deletedObserved?: number; deletedTotal?: number; deletedComplete?: boolean }>;
  domains: DomainRecord[];
  sites: DomainSiteEvidence[];
}
export interface SiteRegistration {
  registrationDomain: string | null;
  record: DomainRecord | null;
  checkedAt: string | null;
}
const key = (value: string) => value.trim().toLowerCase();
const owned = (record: DomainRecord) => record.status !== "deleted";

export function parseDomainPortfolio(value: unknown): DomainPortfolio | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Partial<DomainPortfolio>;
  if (typeof data.checkedAt !== "string" || !Number.isFinite(Date.parse(data.checkedAt)) ||
      !Array.isArray(data.sources) || !Array.isArray(data.domains) || !Array.isArray(data.sites)) return null;
  if (data.sources.some(source => !source || typeof source.registrar !== "string" || typeof source.ownedCount !== "number" || typeof source.ownedComplete !== "boolean") ||
      data.domains.some(record => !record || typeof record.domain !== "string" || typeof record.registrar !== "string" || typeof record.status !== "string" || typeof record.checkedAt !== "string") ||
      data.sites.some(site => !site || typeof site.domain !== "string" || typeof site.checkedAt !== "string")) return null;
  // Explicit projection prevents future registrar payload fields reaching clients.
  const optional = (input: object, fields: readonly string[]) => {
    const source = input as Record<string, unknown>;
    return Object.fromEntries(fields.filter(field => ["string", "number", "boolean"].includes(typeof source[field]) || source[field] === null).map(field => [field, source[field]]));
  };
  return {
    checkedAt: data.checkedAt,
    sources: data.sources.map(source => ({
      registrar: source.registrar, ownedCount: source.ownedCount, ownedComplete: source.ownedComplete,
      ...optional(source, ["deletedObserved", "deletedTotal", "deletedComplete"]),
    })),
    domains: data.domains.map(record => ({
      domain: record.domain, registrar: record.registrar, status: record.status,
      checkedAt: record.checkedAt, source: typeof record.source === "string" ? record.source : "unknown",
      ...optional(record, ["expiresAt", "daysRemaining", "autoRenew", "registrantUnverified", "hold", "disabled", "deletedAt"]),
    })),
    sites: data.sites.map(site => ({
      domain: site.domain, checkedAt: site.checkedAt,
      ...optional(site, ["registrationDomain", "dnsStatus", "httpStatus", "finalUrl", "httpError"]),
    })),
  };
}

export function remainingDays(record: DomainRecord, now = Date.now()): number | null {
  const expiration = Date.parse(record.expiresAt ?? "");
  return Number.isFinite(expiration) ? Math.ceil((expiration - now) / 86400000) : null;
}

export function renewalLabel(value: string | null | undefined): string {
  if (["ON", "auto-renew"].includes(value ?? "")) return "켜짐";
  if (["OFF", "manual renewal"].includes(value ?? "")) return "꺼짐";
  return "미확인";
}

export function domainWarnings(record: DomainRecord): string[] {
  return [record.hold?.toLowerCase() === "yes" ? "등록기관 hold" : null,
    record.disabled?.toLowerCase() === "yes" ? "비활성" : null,
    record.registrantUnverified?.toLowerCase() === "yes" ? "등록자 확인 필요" : null].filter((item): item is string => item !== null);
}

export function ownedDomains(portfolio: DomainPortfolio): DomainRecord[] {
  return portfolio.domains.filter(owned).sort((a, b) => {
    const left = a.expiresAt ? Date.parse(a.expiresAt) : Infinity;
    const right = b.expiresAt ? Date.parse(b.expiresAt) : Infinity;
    return (Number.isFinite(left) ? left : Infinity) - (Number.isFinite(right) ? right : Infinity) || a.domain.localeCompare(b.domain);
  });
}

export function siteRegistration(domain: string, portfolio: DomainPortfolio | null): SiteRegistration {
  if (!portfolio) return { registrationDomain: null, record: null, checkedAt: null };
  const site = portfolio.sites.find(item => key(item.domain) === key(domain));
  // Only the collector's exact site-to-registration mapping can associate a subdomain.
  const registrationDomain = site ? site.registrationDomain ?? null : null;
  const lookup = registrationDomain ?? (portfolio.domains.some(item => key(item.domain) === key(domain) && owned(item)) ? domain : null);
  const record = lookup ? portfolio.domains.find(item => key(item.domain) === key(lookup) && owned(item)) ?? null : null;
  return { registrationDomain: lookup, record, checkedAt: site?.checkedAt ?? null };
}
