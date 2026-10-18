export interface InventoryBinding {
  id: string;
  enabled: boolean;
  ga4PropertyId: string | null;
  gscSiteUrl: string | null;
  ga4Status: string;
  gscStatus: string;
  dailyUsers: number | null;
}

export interface InventorySite {
  domain: string;
  url: string;
  enabled: boolean;
  platform: string;
  host: string;
  hostStatus: string;
  addresses: string[];
  cname: string[];
  httpStatus: number | null;
  checkedAt: string;
  evidence: string[];
  configuredLocations: string[];
  approval: string;
  approvalCheckedAt: string | null;
  monetization: boolean;
  bindings: InventoryBinding[];
  discoveredGa4: Array<{ propertyId: string; measurementId: string }>;
  discoveredGsc: Array<{ siteUrl: string; permission: string }>;
  issues: string[];
  accountHosts: Array<{ host: string; checkedAt: string }>;
  publicDnsAddresses: string[];
}

export interface SiteInventory {
  generatedAt: string;
  statsGeneratedAt: string | null;
  adsenseCheckedAt: string | null;
  adsenseListComplete: boolean;
  googleBindingsCheckedAt: string | null;
  googleBindingsComplete: boolean;
  adsenseAccountSummary: { total: number; ready: number; gettingReady: number } | null;
  sites: InventorySite[];
  notes: string[];
}

export const HOST_LABELS: Record<string, string> = {
  ovh: "OVHcloud", turbo1: "ChemiCloud Turbo1", turbo2: "ChemiCloud Turbo2",
  kickstart: "ChemiCloud Kickstart", vercel: "Vercel", unknown: "미확인",
  mixed: "DNS 불일치",
};
export const APPROVAL_LABELS: Record<string, string> = {
  READY: "승인됨", GETTING_READY: "준비 중", NEEDS_ATTENTION: "주의 필요",
  REQUIRES_REVIEW: "검토 필요", NOT_LISTED: "계정 목록 없음", EXCLUDED: "수익화 제외", UNKNOWN: "미확인",
};

export function classifyHost(addresses: string[], cname: string[], vercelHeader: boolean): string {
  const hosts: Record<string, string> = {
    "51.79.206.71": "ovh", "158.247.212.123": "turbo1",
    "158.247.209.217": "turbo2", "158.247.245.11": "kickstart",
  };
  const matches = new Set(addresses.map(ip => hosts[ip]).filter(Boolean));
  if (matches.size > 1) return "unknown";
  if (matches.size === 1) return [...matches][0]!;
  if (vercelHeader || cname.some(name => /(?:^|\.)vercel-dns\.(?:com|net)\.?$/i.test(name))) return "vercel";
  return "unknown";
}

export function exactApproval(domain: string, monetization: boolean, snapshot: {
  checkedAt?: string; listComplete?: boolean; proofDomains?: string[]; sites?: Array<{ domain: string; rawState: string }>;
}, now = Date.now()): string {
  if (!monetization) return "EXCLUDED";
  const age = now - Date.parse(snapshot.checkedAt ?? "");
  if (!snapshot.listComplete || !Number.isFinite(age) || age < -300000 || age > 24 * 3600000) return "UNKNOWN";
  if (snapshot.proofDomains && !snapshot.proofDomains.includes(domain.toLowerCase())) return "UNKNOWN";
  return snapshot.sites?.find(site => site.domain.toLowerCase() === domain.toLowerCase())?.rawState ?? "NOT_LISTED";
}

export function hostingDisagreement(localHost: string, localAddresses: string[], publicAddresses: string[], checked: boolean): boolean {
  if (!checked || !localAddresses.length) return false;
  if (!publicAddresses.length) return true;
  const publicHost = classifyHost(publicAddresses, [], false);
  // CDN addresses legitimately vary by resolver. Compare known origins, not arbitrary edge IPs.
  if (localHost === "vercel" || localHost === "unknown") return publicHost !== "unknown" && publicHost !== localHost;
  return publicHost !== localHost && !localAddresses.some(ip => publicAddresses.includes(ip));
}
