import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import pLimit from "p-limit";
import { loadSites } from "./lib/sites.js";

type Property = { property: string; displayName: string | null; account: string | null };
type Stream = { property: string; stream: string; domain: string | null; defaultUri: string | null; measurementId: string | null };
type GscProperty = { siteUrl: string; domain: string | null; permissionLevel: string | null };
type ConfigSite = { id: string; domain: string; ga4PropertyId: string | null; gscSiteUrl: string | null };

export function bindingStatus(domain: string, propertyId: string | null, streams: Array<{ property: string; domain: string | null }>): "verified" | "mismatch" | "unknown" {
  if (!propertyId) return "unknown";
  const canonical = (value: string) => value.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  const propertyStreams = streams.filter(stream => stream.property === `properties/${propertyId}`);
  if (propertyStreams.some(stream => stream.domain && canonical(stream.domain) === canonical(domain))) return "verified";
  if (!propertyStreams.length || propertyStreams.some(stream => !stream.domain)) return "unknown";
  return "mismatch";
}

function domainOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    if (value.startsWith("sc-domain:")) return value.slice(10).trim().toLowerCase().replace(/\.$/, "") || null;
    return new URL(value).hostname.toLowerCase().replace(/\.$/, "") || null;
  } catch { return null; }
}

async function allPages<T>(get: (token?: string) => Promise<{ items: T[]; nextPageToken?: string | null }>): Promise<T[]> {
  const all: T[] = [];
  const seen = new Set<string>();
  let token: string | undefined;
  do {
    const page = await get(token);
    all.push(...page.items);
    const next = page.nextPageToken || undefined;
    if (next && seen.has(next)) throw new Error("repeated_page_token");
    if (next) seen.add(next);
    token = next;
  } while (token);
  return all;
}

function failure(error: unknown): { httpStatus: number | null; code: string } {
  const status = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : null;
  return { httpStatus: typeof status === "number" && status >= 100 && status <= 599 ? status : null, code: "api_request_failed" };
}

async function main(): Promise<void> {
  const outputPath = path.resolve("data/google-site-bindings-current.json");
  const generatedAt = new Date().toISOString();
  const config: ConfigSite[] = (await loadSites()).filter((site) => site.enabled).map((site) => ({
    id: site.id, domain: domainOf(site.url) ?? site.id, ga4PropertyId: site.ga4PropertyId ?? null,
    gscSiteUrl: site.gscSiteUrl ?? null,
  }));
  const artifact: {
    generatedAt: string; mutationPerformed: false;
    ga4: { checkedAt: string | null; complete: boolean; accounts: number; properties: Property[]; webStreams: Stream[]; failures: { property?: string; httpStatus: number | null; code: string }[] };
    gsc: { checkedAt: string | null; complete: boolean; properties: GscProperty[]; failure: { httpStatus: number | null; code: string } | null };
    comparison: Record<string, unknown>;
  } = {
    generatedAt, mutationPerformed: false,
    ga4: { checkedAt: null, complete: false, accounts: 0, properties: [], webStreams: [], failures: [] },
    gsc: { checkedAt: null, complete: false, properties: [], failure: null },
    comparison: {},
  };
  try {
    const key = JSON.parse(process.env.GCP_SA_KEY_JSON || await readFile(process.env.GOOGLE_BINDINGS_CREDENTIAL_PATH || "E:\\env\\gsc_credentials.json", "utf8"));
    const auth = new google.auth.GoogleAuth({ credentials: key, scopes: [
      "https://www.googleapis.com/auth/analytics.readonly",
      "https://www.googleapis.com/auth/webmasters.readonly",
    ] });
    const admin = google.analyticsadmin({ version: "v1beta", auth });
    const gsc = google.webmasters({ version: "v3", auth });
    try {
      const summaries = await allPages(async (pageToken) => {
        const response = await admin.accountSummaries.list({ pageSize: 200, pageToken }, { timeout: 30000 });
        return { items: response.data.accountSummaries ?? [], nextPageToken: response.data.nextPageToken };
      });
      artifact.ga4.accounts = summaries.length;
      artifact.ga4.properties = summaries.flatMap((summary) => (summary.propertySummaries ?? [])
        .filter((property) => /^properties\/\d+$/.test(property.property ?? ""))
        .map((property) => ({ property: property.property!, displayName: property.displayName ?? null, account: summary.account ?? null })));
      const limit = pLimit(5);
      await Promise.all(artifact.ga4.properties.map((property) => limit(async () => {
        try {
          const streams = await allPages(async (pageToken) => {
            const response = await admin.properties.dataStreams.list({ parent: property.property, pageSize: 200, pageToken }, { timeout: 30000 });
            return { items: response.data.dataStreams ?? [], nextPageToken: response.data.nextPageToken };
          });
          for (const stream of streams) {
            if (stream.type !== "WEB_DATA_STREAM") continue;
            const uri = stream.webStreamData?.defaultUri ?? null;
            artifact.ga4.webStreams.push({ property: property.property, stream: stream.name ?? "", domain: domainOf(uri),
              defaultUri: uri, measurementId: stream.webStreamData?.measurementId ?? null });
          }
        } catch (error) {
          artifact.ga4.failures.push({ property: property.property, ...failure(error) });
        }
      })));
      artifact.ga4.complete = artifact.ga4.failures.length === 0;
      if (artifact.ga4.complete) artifact.ga4.checkedAt = new Date().toISOString();
    } catch (error) { artifact.ga4.failures.push(failure(error)); }
    try {
      const response = await gsc.sites.list({}, { timeout: 30000 });
      artifact.gsc.properties = (response.data.siteEntry ?? []).filter((entry) => Boolean(entry.siteUrl)).map((entry) => ({
        siteUrl: entry.siteUrl!, domain: domainOf(entry.siteUrl), permissionLevel: entry.permissionLevel ?? null,
      }));
      artifact.gsc.complete = true;
      artifact.gsc.checkedAt = new Date().toISOString();
    } catch (error) { artifact.gsc.failure = failure(error); }
  } catch (error) {
    artifact.ga4.failures.push(failure(error));
    artifact.gsc.failure = failure(error);
  }
  const configuredDomains = new Set(config.map((site) => site.domain));
  const streamsByDomain = Map.groupBy(artifact.ga4.webStreams.filter((stream) => stream.domain), (stream) => stream.domain!);
  artifact.comparison = {
    configuredSites: config.length,
    ga4: artifact.ga4.complete ? {
      discoveredDomainsMissingFromConfig: [...streamsByDomain.keys()].filter((domain) => !configuredDomains.has(domain)).sort(),
      duplicateStreams: [...streamsByDomain.entries()].filter(([, streams]) => streams.length > 1).map(([domain, streams]) => ({ domain,
        streams: streams.map((stream) => ({ property: stream.property, stream: stream.stream })) })),
      configuredPropertyMismatches: config.filter((site) => {
        return bindingStatus(site.domain, site.ga4PropertyId, artifact.ga4.webStreams) === "mismatch";
      }).map((site) => ({ id: site.id, domain: site.domain, configuredPropertyId: site.ga4PropertyId,
        discoveredPropertyIds: [...new Set((streamsByDomain.get(site.domain) ?? []).map((stream) => stream.property.slice(11)))] })),
      configuredPropertyBindingsUnknown: config.filter(site => bindingStatus(site.domain, site.ga4PropertyId, artifact.ga4.webStreams) === "unknown").map(site => ({ id: site.id, domain: site.domain })),
      configuredPropertiesNotAccessible: config.filter((site) => site.ga4PropertyId && !artifact.ga4.properties.some((property) => property.property === `properties/${site.ga4PropertyId}`))
        .map((site) => ({ id: site.id, domain: site.domain, configuredPropertyId: site.ga4PropertyId })),
    } : { status: "unverified" },
    gsc: artifact.gsc.complete ? {
      discoveredDomainsMissingFromConfig: [...new Set(artifact.gsc.properties.map((property) => property.domain).filter((domain): domain is string => Boolean(domain)))]
        .filter((domain) => !configuredDomains.has(domain)).sort(),
      configuredPropertiesNotListed: config.filter((site) => site.gscSiteUrl && !artifact.gsc.properties.some((property) => property.siteUrl === site.gscSiteUrl))
        .map((site) => ({ id: site.id, domain: site.domain, configuredSiteUrl: site.gscSiteUrl })),
    } : { status: "unverified" },
  };
  await mkdir(".local/site-inventory", { recursive: true });
  await writeFile(".local/site-inventory/google-account-raw.json", `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  // Public repository: omit account IDs, property names, full stream resource IDs and permission levels.
  const scope = JSON.parse(await readFile("data/site-inventory-domains.json", "utf8")) as { domains: string[] };
  const canonical = (value: string) => value.replace(/^www\./, "");
  const publicDomains = new Set([...config.map(site => canonical(site.domain)), ...scope.domains.map(canonical)]);
  const publicStreams = artifact.ga4.webStreams.filter(item => item.domain && publicDomains.has(canonical(item.domain)));
  const publicProperties = new Set([...config.map(site => `properties/${site.ga4PropertyId}`), ...publicStreams.map(item => item.property)]);
  const publicGsc = artifact.gsc.properties.filter(item => item.domain && publicDomains.has(canonical(item.domain)));
  const publicComparison = { ...artifact.comparison } as { ga4?: Record<string, unknown>; gsc?: Record<string, unknown> };
  if (publicComparison.ga4) {
    publicComparison.ga4 = { ...publicComparison.ga4,
      discoveredDomainsMissingFromConfig: [...streamsByDomain.keys()].filter(domain => publicDomains.has(canonical(domain)) && !configuredDomains.has(domain)),
      duplicateStreams: [...streamsByDomain.entries()].filter(([domain, streams]) => publicDomains.has(canonical(domain)) && streams.length > 1)
        .map(([domain, streams]) => ({ domain, propertyIds: [...new Set(streams.map(stream => stream.property.slice(11)))] })),
    };
  }
  if (publicComparison.gsc) publicComparison.gsc = { ...publicComparison.gsc,
    discoveredDomainsMissingFromConfig: [...new Set(publicGsc.map(item => item.domain))].filter(domain => domain && !configuredDomains.has(domain)),
  };
  const publicArtifact = { ...artifact, ga4: { ...artifact.ga4,
    properties: artifact.ga4.properties.filter(item => publicProperties.has(item.property)).map(item => ({ property: item.property })),
    webStreams: publicStreams.map(item => ({ property: item.property, domain: item.domain, measurementId: item.measurementId })),
  }, gsc: { ...artifact.gsc, properties: publicGsc.map(item => ({ siteUrl: item.siteUrl, domain: item.domain })) }, comparison: publicComparison };
  await writeFile(outputPath, `${JSON.stringify(publicArtifact, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ outputPath, generatedAt, ga4Complete: artifact.ga4.complete, ga4Accounts: artifact.ga4.accounts,
    ga4Properties: artifact.ga4.properties.length, webStreams: artifact.ga4.webStreams.length, gscComplete: artifact.gsc.complete,
    gscProperties: artifact.gsc.properties.length, ga4Failures: artifact.ga4.failures.length, gscFailure: artifact.gsc.failure }));
  if (!artifact.ga4.complete || !artifact.gsc.complete) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error("Google bindings collector failed"); process.exitCode = 1; });
}
