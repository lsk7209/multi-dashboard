import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import { loadSites } from "./lib/sites.js";

type Page<T> = { items: T[]; nextPageToken?: string | null };
type Site = { domain?: string | null; state?: string | null; autoAdsEnabled?: boolean | null };
type Account = { name?: string | null };
type AccountConfig = { clientPath: string; tokenPath: string; accountRef?: string };
type InlineAccountConfig = {
  accountRef: string;
  client: { installed?: OAuthClient; web?: OAuthClient };
  token: { refresh_token: string; token?: string; access_token?: string; expiry?: string; expiry_date?: number };
};
type OAuthClient = { client_id: string; client_secret: string; redirect_uris?: string[] };

export type SiteStatus = {
  accountRef: string;
  domain: string;
  rawState: string | null;
  autoAdsEnabled: boolean | null;
};

type Failure = { stage: "credentials" | "accounts.list" | "accounts.sites.list"; httpStatus: number | null; accountRef?: string };
type AccountCheck = { accountRef: string; checkedAt: string | null; listComplete: boolean; siteCount: number; failure?: Failure };
type SourceCheck = { sourceIndex: number; attemptedAt: string; checkedAt: string | null; listComplete: boolean; accountRefs: string[]; failure?: Failure };

export type Collection = {
  attemptedAt: string;
  checkedAt: string | null;
  listComplete: boolean;
  mutationPerformed: false;
  totalSites: number;
  accountsFound: number;
  accountRefs?: string[];
  accountChecks?: AccountCheck[];
  sourceChecks?: SourceCheck[];
  sites: SiteStatus[];
  failure?: Failure;
};

export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/\.$/, "");
}

export function exactSiteMatches(sites: SiteStatus[], domain: string): SiteStatus[] {
  const target = normalizeDomain(domain);
  return sites.filter((site) => normalizeDomain(site.domain) === target);
}

export async function listAllPages<T>(getPage: (token?: string) => Promise<Page<T>>): Promise<T[]> {
  const items: T[] = [];
  const seen = new Set<string>();
  let token: string | undefined;
  do {
    const page = await getPage(token);
    items.push(...page.items);
    const next = page.nextPageToken || undefined;
    if (next && seen.has(next)) throw new Error("Repeated page token");
    if (next) seen.add(next);
    token = next;
  } while (token);
  return items;
}

function httpStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "number" && code >= 100 && code <= 599 ? code : null;
}

export async function collectStatus(
  listAccounts: (token?: string) => Promise<Page<Account>>,
  listSites: (account: string, token?: string) => Promise<Page<Site>>,
  now = () => new Date().toISOString(),
  expectedAccountRef?: string,
): Promise<Collection> {
  const result: Collection = {
    attemptedAt: now(), checkedAt: null, listComplete: false, mutationPerformed: false,
    totalSites: 0, accountsFound: 0, accountChecks: [], sites: [],
  };
  let accounts: Account[];
  try {
    accounts = await listAllPages(listAccounts);
  } catch (error) {
    result.failure = { stage: "accounts.list", httpStatus: httpStatus(error) };
    return result;
  }
  result.accountsFound = accounts.length;
  result.accountRefs = [];
  if (expectedAccountRef && !accounts.some(account => account.name === expectedAccountRef)) {
    result.failure = { stage: "accounts.list", httpStatus: null };
    return result;
  }
  for (const account of accounts) {
    const accountRef = account.name;
    if (!accountRef || !/^accounts\/[^/]+$/.test(accountRef)) {
      result.failure = { stage: "accounts.list", httpStatus: null };
      return result;
    }
    result.accountRefs.push(accountRef);
    let sites: Site[];
    try {
      sites = await listAllPages((token) => listSites(accountRef, token));
    } catch (error) {
      result.failure = { stage: "accounts.sites.list", httpStatus: httpStatus(error), accountRef };
      result.accountChecks!.push({ accountRef, checkedAt: null, listComplete: false, siteCount: 0, failure: result.failure });
      return result;
    }
    const completedSites: SiteStatus[] = [];
    for (const site of sites) {
      if (!site.domain) {
        result.failure = { stage: "accounts.sites.list", httpStatus: null, accountRef };
        result.accountChecks!.push({ accountRef, checkedAt: null, listComplete: false, siteCount: 0, failure: result.failure });
        return result;
      }
      completedSites.push({
        accountRef,
        domain: normalizeDomain(site.domain),
        rawState: site.state ?? null,
        autoAdsEnabled: site.autoAdsEnabled ?? null,
      });
    }
    result.sites.push(...completedSites);
    result.totalSites = result.sites.length;
    result.accountChecks!.push({ accountRef, checkedAt: now(), listComplete: true, siteCount: sites.length });
  }
  result.checkedAt = now();
  result.listComplete = true;
  return result;
}

export function parseAccountConfig(value: unknown): AccountConfig[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("Invalid AdSense accounts configuration");
  return value.map((entry: unknown) => {
    if (typeof entry !== "object" || entry === null) throw new Error("Invalid AdSense account entry");
    const { clientPath, tokenPath, accountRef } = entry as Record<string, unknown>;
    if (typeof clientPath !== "string" || !clientPath.trim() || typeof tokenPath !== "string" || !tokenPath.trim()
      || (accountRef !== undefined && (typeof accountRef !== "string" || !/^accounts\/[^/]+$/.test(accountRef)))) {
      throw new Error("Invalid AdSense account entry");
    }
    return { clientPath, tokenPath, ...(accountRef === undefined ? {} : { accountRef: accountRef as string }) };
  });
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseInlineAccountConfig(value: unknown): InlineAccountConfig[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("Invalid inline AdSense accounts configuration");
  return value.map((entry: unknown) => {
    if (!record(entry) || typeof entry.accountRef !== "string" || !/^accounts\/[^/]+$/.test(entry.accountRef)
      || !record(entry.client) || !record(entry.token)) throw new Error("Invalid inline AdSense account entry");
    const client = entry.client.installed ?? entry.client.web;
    if (!record(client) || typeof client.client_id !== "string" || !client.client_id.trim()
      || typeof client.client_secret !== "string" || !client.client_secret.trim()
      || (client.redirect_uris !== undefined && (!Array.isArray(client.redirect_uris)
        || !client.redirect_uris.every(uri => typeof uri === "string")))
      || typeof entry.token.refresh_token !== "string" || !entry.token.refresh_token.trim()) {
      throw new Error("Invalid inline AdSense account entry");
    }
    return entry as InlineAccountConfig;
  });
}

export async function loadAccountConfigs(
  configuredPath: string | undefined,
  explicitLegacyArgs: boolean,
  legacy: AccountConfig,
  readText: (file: string) => Promise<string> = (file) => readFile(file, "utf8"),
  defaultPath = "E:\\env\\adsense_accounts.json",
  inlineJson?: string,
): Promise<Array<AccountConfig | InlineAccountConfig>> {
  if (explicitLegacyArgs) return [legacy];
  if (inlineJson !== undefined) return parseInlineAccountConfig(JSON.parse(inlineJson));
  if (configuredPath) return parseAccountConfig(JSON.parse(await readText(configuredPath)));
  try {
    return parseAccountConfig(JSON.parse(await readText(defaultPath)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [legacy];
    throw error;
  }
}

export async function collectSources(
  sources: Array<() => Promise<Collection>>,
  now = () => new Date().toISOString(),
): Promise<Collection> {
  const result: Collection = { attemptedAt: now(), checkedAt: null, listComplete: false,
    mutationPerformed: false, totalSites: 0, accountsFound: 0, accountRefs: [], sites: [] };
  const accountRefs = new Set<string>();
  const sites = new Map<string, SiteStatus>();
  const accountChecks = new Map<string, AccountCheck>();
  const sourceChecks: SourceCheck[] = [];
  let complete = true;
  for (const [sourceIndex, source] of sources.entries()) {
    let collected: Collection;
    try {
      collected = await source();
    } catch (error) {
      collected = { attemptedAt: result.attemptedAt, checkedAt: null, listComplete: false,
        mutationPerformed: false, totalSites: 0, accountsFound: 0, sites: [],
        failure: { stage: "credentials", httpStatus: httpStatus(error) } };
    }
    if (!collected.listComplete) {
      complete = false;
      if (!result.failure) result.failure = collected.failure ?? { stage: "credentials", httpStatus: null };
    }
    sourceChecks.push({ sourceIndex, attemptedAt: collected.attemptedAt, checkedAt: collected.checkedAt,
      listComplete: collected.listComplete, accountRefs: collected.accountRefs ?? [],
      ...(collected.failure ? { failure: collected.failure } : {}) });
    for (const ref of collected.accountRefs ?? []) accountRefs.add(ref);
    for (const check of collected.accountChecks ?? []) {
      const previous = accountChecks.get(check.accountRef);
      if (!previous || (!previous.listComplete && check.listComplete)) accountChecks.set(check.accountRef, check);
    }
    for (const site of collected.sites) {
      const key = `${site.accountRef}\0${normalizeDomain(site.domain)}`;
      const previous = sites.get(key);
      if (!previous) sites.set(key, site);
      else if (previous.rawState !== site.rawState) sites.set(key, { ...previous, rawState: "UNKNOWN" });
    }
  }
  result.accountRefs = [...accountRefs].sort();
  result.accountChecks = [...accountChecks.values()];
  result.sourceChecks = sourceChecks;
  result.accountsFound = accountRefs.size;
  result.sites = [...sites.values()];
  result.totalSites = result.sites.length;
  result.listComplete = complete && sources.length > 0;
  if (result.listComplete) result.checkedAt = now();
  return result;
}

export function publicSiteStates(sites: SiteStatus[]): Array<{ domain: string; rawState: string }> {
  const states = new Map<string, string>();
  for (const site of sites) {
    const domain = normalizeDomain(site.domain);
    const state = site.rawState ?? "UNKNOWN";
    const previous = states.get(domain);
    states.set(domain, previous === undefined ? state : previous === state ? state : "UNKNOWN");
  }
  return [...states].map(([domain, rawState]) => ({ domain, rawState }));
}

function publisherId(accountRef: string): string | null {
  return /^accounts\/(pub-\d+)$/.exec(accountRef)?.[1] ?? null;
}

export function publicAccountEvidence(result: Collection): {
  sites: Array<{ domain: string; rawState: string; accountStates: Array<{ publisherId: string; rawState: string; checkedAt: string }> }>;
  sourceChecks: Array<{ sourceIndex: number; attemptedAt: string; checkedAt: string | null; listComplete: boolean; publisherIds: string[]; failure?: { stage: Failure["stage"]; httpStatus: number | null } }>;
  accountInventory: { configuredSources: number; completeSources: number; failedSources: number; discoveredPublisherIds: string[] };
} {
  const completeChecks = new Map((result.accountChecks ?? []).filter(check => check.listComplete && check.checkedAt)
    .map(check => [check.accountRef, check.checkedAt!]));
  const sites = new Map<string, Array<{ publisherId: string; rawState: string; checkedAt: string }>>();
  for (const site of result.sites) {
    const id = publisherId(site.accountRef);
    const checkedAt = completeChecks.get(site.accountRef);
    if (!id || !checkedAt) continue;
    const domain = normalizeDomain(site.domain);
    const accountStates = sites.get(domain) ?? [];
    if (!accountStates.some(state => state.publisherId === id)) accountStates.push({ publisherId: id,
      rawState: site.rawState ?? "UNKNOWN", checkedAt });
    sites.set(domain, accountStates);
  }
  const sourceChecks = (result.sourceChecks ?? []).map(source => ({ sourceIndex: source.sourceIndex,
    attemptedAt: source.attemptedAt, checkedAt: source.checkedAt, listComplete: source.listComplete,
    publisherIds: [...new Set(source.accountRefs.map(publisherId).filter((id): id is string => id !== null))].sort(),
    ...(source.failure ? { failure: { stage: source.failure.stage, httpStatus: source.failure.httpStatus } } : {}),
  }));
  return {
    sites: [...sites].map(([domain, accountStates]) => ({ domain,
      rawState: accountStates.every(state => state.rawState === accountStates[0].rawState)
        ? accountStates[0].rawState : "UNKNOWN", accountStates: accountStates.sort((a, b) => a.publisherId.localeCompare(b.publisherId)) })),
    sourceChecks,
    accountInventory: { configuredSources: sourceChecks.length,
      completeSources: sourceChecks.filter(source => source.listComplete).length,
      failedSources: sourceChecks.filter(source => !source.listComplete).length,
      discoveredPublisherIds: [...new Set(sourceChecks.flatMap(source => source.publisherIds))].sort() },
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const arg = (name: string, fallback: string) => args.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
  const clientPath = arg("client", process.env.ADSENSE_OAUTH_CLIENT_PATH || "E:\\env\\adsense_oauth_client.json");
  const tokenPath = arg("token", process.env.ADSENSE_TOKEN_PATH || "E:\\env\\adsense_token.json");
  const outputPath = arg("output", process.env.ADSENSE_STATUS_OUTPUT_PATH || path.resolve("data/adsense-account-status-current.json"));
  let result: Collection;
  try {
    const configs = await loadAccountConfigs(process.env.ADSENSE_ACCOUNTS_CONFIG_PATH,
      args.some(item => item.startsWith("--client=") || item.startsWith("--token=")), { clientPath, tokenPath },
      undefined, undefined, process.env.ADSENSE_ACCOUNTS_JSON);
    result = await collectSources(configs.map(config => async () => {
      const clientFile = "client" in config ? config.client : JSON.parse(await readFile(config.clientPath, "utf8"));
      const tokenFile = "token" in config ? config.token : JSON.parse(await readFile(config.tokenPath, "utf8"));
      const client = clientFile.installed ?? clientFile.web;
      if (!client?.client_id || !client?.client_secret || !tokenFile?.refresh_token) throw new Error("Missing OAuth credentials");
      const auth = new google.auth.OAuth2(client.client_id, client.client_secret, client.redirect_uris?.[0]);
      auth.setCredentials({
        access_token: tokenFile.token ?? tokenFile.access_token,
        refresh_token: tokenFile.refresh_token,
        expiry_date: typeof tokenFile.expiry === "string" ? Date.parse(tokenFile.expiry) : tokenFile.expiry_date,
      });
      const api = google.adsense({ version: "v2", auth });
      return collectStatus(
        async (pageToken) => {
          const response = await api.accounts.list({ pageSize: 10000, pageToken });
          return { items: response.data.accounts ?? [], nextPageToken: response.data.nextPageToken };
        },
        async (parent, pageToken) => {
          const response = await api.accounts.sites.list({ parent, pageSize: 10000, pageToken });
          return { items: response.data.sites ?? [], nextPageToken: response.data.nextPageToken };
        },
        () => new Date().toISOString(), config.accountRef,
      );
    }));
  } catch (error) {
    result = {
      attemptedAt: new Date().toISOString(), checkedAt: null, listComplete: false,
      mutationPerformed: false, totalSites: 0, accountsFound: 0, sites: [],
      failure: { stage: "credentials", httpStatus: httpStatus(error) },
    };
  }
  await mkdir(".local/site-inventory", { recursive: true });
  await writeFile(".local/site-inventory/adsense-account-raw.json", `${JSON.stringify(result, null, 2)}\n`, "utf8");
  const domains = new Set((await loadSites()).map(site => new URL(site.url).hostname));
  const publicEvidence = publicAccountEvidence(result);
  const publicStates = publicEvidence.sites;
  const publicResult = { attemptedAt: result.attemptedAt, checkedAt: result.checkedAt,
    listComplete: result.listComplete, proofDomains: [...domains].sort(), mutationPerformed: false, totalSites: publicStates.length,
    sourceChecks: publicEvidence.sourceChecks, accountInventory: publicEvidence.accountInventory,
    stateCounts: Object.fromEntries([...new Set(publicStates.map(site => site.rawState))].map(state => [state, publicStates.filter(site => site.rawState === state).length])),
    sites: publicStates.filter(site => domains.has(site.domain) && !["tasko.kr", "kang4.com"].includes(site.domain)),
    ...(result.failure ? { failure: { stage: result.failure.stage, httpStatus: result.failure.httpStatus } } : {}),
  };
  await writeFile(outputPath, `${JSON.stringify(publicResult, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ outputPath, checkedAt: result.checkedAt, listComplete: result.listComplete,
    accountsFound: result.accountsFound, totalSites: result.totalSites,
    failure: result.failure ? { stage: result.failure.stage, httpStatus: result.failure.httpStatus } : undefined }));
  if (!result.listComplete) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error("AdSense status collection failed to write output"); process.exitCode = 1; });
}
