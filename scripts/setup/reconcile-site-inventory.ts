import { resolve4, resolve6, resolveCname } from "node:dns/promises";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import pLimit from "p-limit";
import { loadSites } from "./lib/sites.js";
import { classifyHost, exactApproval, hostingDisagreement, type InventorySite, type SiteInventory } from "../../app/lib/site-inventory.js";

async function readJson(file: string) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function main() {
  const sites = (await loadSites()).filter(site => !["tasko.kr", "kang4.com"].includes(new URL(site.url).hostname));
  const stats = await readJson("data/site-stats.json");
  const approval = await readJson("data/adsense-account-status-current.json");
  const google = await readJson("data/google-site-bindings-current.json");
  const hosting = await readJson("data/hosting-account-inventory-current.json");
  if (!Array.isArray(stats.stats) || !stats.generatedAt || !Array.isArray(approval.sites) || !google.ga4 || !google.gsc) throw new Error("Required source snapshot invalid");
  const canonical = (domain: string) => domain.replace(/^www\./, "");
  const discoveredDomains: string[] = [...(google.ga4?.webStreams ?? []), ...(google.gsc?.properties ?? [])].filter((item: { domain: string | null }) => item.domain).map((item: { domain: string }) => canonical(item.domain));
  const scope = await readJson("data/site-inventory-domains.json");
  const hostingDomains: string[] = (hosting.accounts ?? []).filter((account: { checkedAt: string }) => {
    const age = Date.now() - Date.parse(account.checkedAt);
    return Number.isFinite(age) && age >= -300000 && age < 7 * 86400000;
  }).flatMap((account: { domains: string[] }) => account.domains);
  for (const domain of new Set([...discoveredDomains, ...hostingDomains, ...scope.domains])) {
    if (["kang4.com", "tasko.kr"].includes(domain) || sites.some(site => canonical(new URL(site.url).hostname) === domain)) continue;
    sites.push({ id: `discovered:${domain}`, enabled: false, platform: "static", url: `https://${domain}/`, monetization: true });
  }
  const limit = pLimit(8);
  const domains = [...new Set(sites.map(site => new URL(site.url).hostname))];
  const rows: InventorySite[] = await Promise.all(domains.map(domain => limit(async () => {
    const configs = sites.filter(site => new URL(site.url).hostname === domain);
    const site = configs.find(site => site.enabled) ?? configs[0]!;
    const dns = await Promise.allSettled([resolve4(domain), resolve6(domain), resolveCname(domain)]);
    const ipv4 = dns[0].status === "fulfilled" ? dns[0].value : [];
    const ipv6 = dns[1].status === "fulfilled" ? dns[1].value : [];
    const cname = dns[2].status === "fulfilled" ? dns[2].value : [];
    let httpStatus: number | null = null;
    let vercelHeader = false;
    let finalDomain = domain;
    try {
      const response = await fetch(site.url, { method: "HEAD", signal: AbortSignal.timeout(12000), redirect: "follow" });
      httpStatus = response.status;
      finalDomain = new URL(response.url).hostname;
      vercelHeader = response.headers.has("x-vercel-id") || response.headers.get("server")?.toLowerCase() === "vercel";
    } catch { /* Probe failure remains explicit; DNS evidence is independent. */ }
    const addresses = [...ipv4, ...ipv6];
    let publicDnsAddresses: string[] = [];
    let publicDnsChecked = false;
    try {
      const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`, { signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        const result = await response.json() as { Status?: number; Answer?: Array<{ type: number; data: string }> };
        if (result.Status === 0 || result.Status === 3) {
          publicDnsChecked = true;
          publicDnsAddresses = (result.Answer ?? []).filter(answer => answer.type === 1).map(answer => answer.data);
        }
      }
    } catch { /* The separate resolver failure is recorded in evidence. */ }
    const localHost = classifyHost(addresses, cname, [domain, `www.${domain}`].includes(finalDomain) && vercelHeader);
    const accountHosts = (hosting.accounts ?? []).filter((account: { domains: string[]; checkedAt: string }) => account.domains.includes(domain) && Number.isFinite(Date.parse(account.checkedAt)) && Date.now() - Date.parse(account.checkedAt) >= -300000 && Date.now() - Date.parse(account.checkedAt) < 7 * 86400000).map((account: { host: string; checkedAt: string }) => ({ host: account.host, checkedAt: account.checkedAt }));
    const splitDns = hostingDisagreement(localHost, ipv4, publicDnsAddresses, publicDnsChecked);
    const host = splitDns ? "mixed" : localHost === "unknown" && !addresses.length && accountHosts.length === 1 ? accountHosts[0].host : localHost;
    const monetization = configs.some(config => config.monetization !== false);
    return {
      domain, url: site.url, enabled: configs.some(config => config.enabled), platform: site.platform,
      host, hostStatus: splitDns ? "dns_disagreement" : !addresses.length ? "account_configured_no_public_route" : host === "unknown" ? "unverified" : "public_route_verified",
      accountHosts, publicDnsAddresses,
      addresses, cname, httpStatus, checkedAt: new Date().toISOString(),
      evidence: ["시스템 DNS A/AAAA/CNAME", publicDnsChecked ? `Google DNS: ${publicDnsAddresses.join(", ") || "A 응답 없음"}` : "Google DNS 조회 미확인", ...(httpStatus !== null ? [`HTTPS HEAD ${httpStatus}`, ...(finalDomain !== domain ? [`redirect: ${finalDomain}`] : [])] : ["HTTPS HEAD unavailable"])],
      configuredLocations: [...new Set(configs.map(config => config.contentSource?.locationLabel).filter((value): value is string => Boolean(value)))],
      monetization, approval: exactApproval(domain, monetization, approval), approvalCheckedAt: approval.checkedAt ?? null,
      bindings: configs.map(config => {
        const stat = stats.stats?.find((entry: { id: string }) => entry.id === config.id);
        const mismatch = google.comparison?.ga4?.configuredPropertyMismatches?.some((entry: { id: string }) => entry.id === config.id);
        const unknownBinding = google.ga4?.complete !== true || google.comparison?.ga4?.configuredPropertyBindingsUnknown?.some((entry: { id: string }) => entry.id === config.id);
        return { id: config.id, enabled: config.enabled, ga4PropertyId: config.ga4PropertyId ?? null,
          gscSiteUrl: config.gscSiteUrl ?? null, ga4Status: mismatch ? "binding_mismatch" : unknownBinding ? "binding_unknown" : stat?.ga4Status ?? "not_collected",
          gscStatus: stat?.gscStatus ?? "not_collected", dailyUsers: !mismatch && !unknownBinding && stat?.ga4Status === "ok" ? stat?.last1Days?.activeUsers ?? null : null };
      }),
      discoveredGa4: (google.ga4?.webStreams ?? []).filter((stream: { domain: string | null }) => stream.domain && canonical(stream.domain) === canonical(domain)).map((stream: { property: string; measurementId: string | null }) => ({ propertyId: stream.property.split("/").at(-1)!, measurementId: stream.measurementId ?? "미확인" })),
      discoveredGsc: (google.gsc?.properties ?? []).filter((entry: { domain: string | null }) => entry.domain && canonical(entry.domain) === canonical(domain)).map((entry: { siteUrl: string }) => ({ siteUrl: entry.siteUrl, permission: "속성 목록에 있음" })),
      issues: [
        ...(splitDns ? ["DNS 조회 경로별 응답 불일치 · 이전 완료 미확인"] : []),
        ...(!addresses.length ? ["공개 DNS 확인 불가"] : []),
        ...(site.id.startsWith("discovered:") ? [`${discoveredDomains.includes(domain) ? "Google 목록에서 발견" : accountHosts.length ? "현재 서버 계정에서 발견" : "기존 현황에 등록 · 현재 연결 목록 미확인"} · 운영 대상 등록 전`] : []),
        ...(["turbo1", "turbo2", "kickstart"].includes(host) && !accountHosts.some((account: { host: string }) => account.host === host) ? ["공개 경로 확인 · 현재 계정 목록에서 정확한 도메인 미확인"] : []),
        ...(google.comparison?.ga4?.configuredPropertyMismatches ?? []).filter((item: { domain: string }) => item.domain === domain).map((item: { configuredPropertyId: string }) => `설정 GA4 ${item.configuredPropertyId}: 웹 스트림 도메인 불일치`),
      ],
    };
  })));
  const inventory: SiteInventory = {
    generatedAt: new Date().toISOString(), statsGeneratedAt: stats.generatedAt ?? null,
    adsenseCheckedAt: approval.checkedAt ?? null, adsenseListComplete: approval.listComplete === true,
    adsenseAccountSummary: approval.listComplete ? { total: approval.totalSites, ready: approval.stateCounts?.READY ?? 0, gettingReady: approval.stateCounts?.GETTING_READY ?? 0 } : null,
    googleBindingsCheckedAt: google.generatedAt ?? null, googleBindingsComplete: google.ga4?.complete === true && google.gsc?.complete === true,
    sites: rows.sort((a, b) => a.domain.localeCompare(b.domain)),
    notes: ["호스팅은 현재 공개 DNS와 응답 기준이며 이전 완료·원본 삭제를 의미하지 않습니다.",
      "GA4 중복 속성은 별도 표시하며 사용자를 합산하지 않습니다. 비활성 설정은 수집하지 않습니다.",
      "애드센스는 24시간 이내 완전한 공식 목록의 정확한 도메인만 대조합니다. 서브도메인은 상위 도메인 승인을 상속하지 않습니다.",
      "설정 위치는 기존 메타데이터이며 현재 호스팅 증거와 구분합니다."],
  };
  await writeFile("data/site-inventory.json", JSON.stringify(inventory, null, 2) + "\n");
  console.log(JSON.stringify({ domains: rows.length, activeDomains: rows.filter(row => row.enabled).length,
    hosts: Object.fromEntries([...new Set(rows.map(row => row.host))].map(host => [host, rows.filter(row => row.host === host).length])),
    approvals: Object.fromEntries([...new Set(rows.map(row => row.approval))].map(state => [state, rows.filter(row => row.approval === state).length])) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => { console.error("Site inventory reconciliation failed"); process.exitCode = 1; });
