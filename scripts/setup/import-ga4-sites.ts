import { writeFile } from "node:fs/promises";
import { AnalyticsAdminServiceClient } from "@google-analytics/admin";
import YAML from "yaml";
import { parseServiceAccountKey } from "./lib/gcp.js";
import { loadLocalSecrets, readSecret } from "./lib/secrets.js";
import { loadSites, type Site } from "./lib/sites.js";

const DEFAULT_ACCOUNT_ID = "236349432";
const SITES_PATH = "scripts/setup/sites.yaml";

// 은퇴한 사이트 — GA4 속성/스트림이 남아 있어도 sites.yaml에 재삽입하지 않는다.
// AGENTS.md "Retired Sites" 참조. 되돌리려면 운영자 승인 필요.
// 정확한 호스트만 매칭하므로 서브도메인(예: saju.tasko.kr)은 영향 없음.
const RETIRED_HOSTNAMES = new Set<string>([
  "kang4.com", // 2026-08-27 은퇴 (도메인 만료, 30일 활동 0)
  "tasko.kr", // 2026-08-29 은퇴 (완전 deindex, 트래픽 0). 서브도메인은 유지
]);

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isRetiredSite(site: { url?: string }): boolean {
  return RETIRED_HOSTNAMES.has(hostnameOf(site.url ?? ""));
}

interface SitesDocument {
  sites: Site[];
}

interface ImportedSite {
  id: string;
  name: string;
  enabled: true;
  platform: "wordpress";
  url: string;
  wpRestBase: string;
  ga4PropertyId: string;
  gscSiteUrl: string;
}

function readAccountId(): string {
  const fromArg = process.argv
    .find((arg) => arg.startsWith("--account="))
    ?.slice("--account=".length);
  return fromArg || process.env.GA4_ACCOUNT_ID || DEFAULT_ACCOUNT_ID;
}

function propertyIdOf(propertyName: string): string {
  const id = propertyName.split("/").at(-1);
  if (!id) {
    throw new Error(`Invalid GA4 property name: ${propertyName}`);
  }

  return id;
}

function normalizeUrl(rawUrl: string): string {
  const withProtocol = /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : `https://${rawUrl}`;
  const url = new URL(withProtocol);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function siteIdFromUrl(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, "");
  return host
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function uniqueSiteId(baseId: string, existingIds: Set<string>): string {
  if (!existingIds.has(baseId)) {
    existingIds.add(baseId);
    return baseId;
  }

  let index = 2;
  while (existingIds.has(`${baseId}-${index}`)) {
    index += 1;
  }

  const nextId = `${baseId}-${index}`;
  existingIds.add(nextId);
  return nextId;
}

async function listImportedSites(accountId: string): Promise<ImportedSite[]> {
  loadLocalSecrets();
  const keyJson = readSecret("GCP_SA_KEY_JSON");

  if (!keyJson) {
    throw new Error(
      "GCP_SA_KEY_JSON is missing. Add it to D:\\env\\키파일.txt or .env.setup.local.",
    );
  }

  const client = new AnalyticsAdminServiceClient({
    credentials: parseServiceAccountKey(keyJson),
  });

  const imported: ImportedSite[] = [];
  const existingIds = new Set<string>();

  for await (const property of client.listPropertiesAsync({
    filter: `parent:accounts/${accountId}`,
    showDeleted: false,
    pageSize: 200,
  })) {
    const propertyName = property.name ?? "";
    const propertyId = propertyIdOf(propertyName);
    const streams = client.listDataStreamsAsync({
      parent: propertyName,
      pageSize: 200,
    });

    for await (const stream of streams) {
      const defaultUri = stream.webStreamData?.defaultUri;
      if (!defaultUri) {
        continue;
      }

      const url = normalizeUrl(defaultUri);
      if (RETIRED_HOSTNAMES.has(hostnameOf(url))) {
        continue;
      }
      const id = uniqueSiteId(siteIdFromUrl(url), existingIds);

      imported.push({
        id,
        name: property.displayName || id,
        enabled: true,
        platform: "wordpress",
        url,
        wpRestBase: new URL("/wp-json/wp/v2", url).toString(),
        ga4PropertyId: propertyId,
        gscSiteUrl: url,
      });
    }
  }

  return imported;
}

async function writeMergedSites(
  imported: ImportedSite[],
): Promise<{ added: number; updated: number; total: number }> {
  const loaded = await loadSites(SITES_PATH);
  // 은퇴 사이트가 이전에 sites.yaml에 남아 있으면 이 기회에 제거한다.
  const current = loaded.filter((site) => !isRetiredSite(site));
  const byGa4 = new Map(
    current
      .filter((site) => site.ga4PropertyId)
      .map((site) => [site.ga4PropertyId, site]),
  );
  const byUrl = new Map(
    current.map((site) => [site.url.replace(/\/$/, ""), site]),
  );
  const currentIds = new Set(current.map((site) => site.id));
  let added = 0;
  let updated = 0;

  for (const site of imported) {
    const urlKey = site.url.replace(/\/$/, "");
    const existing = byGa4.get(site.ga4PropertyId) ?? byUrl.get(urlKey);

    if (existing) {
      Object.assign(existing, {
        name: existing.name ?? site.name,
        enabled: existing.enabled ?? true,
        platform: existing.platform ?? site.platform,
        url: existing.url ?? site.url,
        wpRestBase: existing.wpRestBase ?? site.wpRestBase,
        ga4PropertyId: site.ga4PropertyId,
        gscSiteUrl: existing.gscSiteUrl ?? site.gscSiteUrl,
      });
      updated += 1;
      continue;
    }

    const id = currentIds.has(site.id)
      ? uniqueSiteId(site.id, currentIds)
      : site.id;
    currentIds.add(id);
    current.push({ ...site, id, monetization: true });
    added += 1;
  }

  const doc: SitesDocument = { sites: current };
  const header = "# Generated/managed by scripts/setup/import-ga4-sites.ts\n";
  await writeFile(SITES_PATH, `${header}${YAML.stringify(doc)}`, "utf8");

  return { added, updated, total: current.length };
}

async function main(): Promise<void> {
  const accountId = readAccountId();
  const imported = await listImportedSites(accountId);

  if (imported.length === 0) {
    throw new Error(`No web data streams found for GA4 account ${accountId}.`);
  }

  const result = await writeMergedSites(imported);
  console.log(
    `GA4 account ${accountId}: ${result.added} added, ${result.updated} updated, ${result.total} total.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
