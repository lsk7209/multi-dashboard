import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import { loadSites } from "./lib/sites.js";

type Page<T> = { items: T[]; nextPageToken?: string | null };
type Site = { domain?: string | null; state?: string | null; autoAdsEnabled?: boolean | null };
type Account = { name?: string | null };

export type SiteStatus = {
  accountRef: string;
  domain: string;
  rawState: string | null;
  autoAdsEnabled: boolean | null;
};

export type Collection = {
  attemptedAt: string;
  checkedAt: string | null;
  listComplete: boolean;
  mutationPerformed: false;
  totalSites: number;
  accountsFound: number;
  sites: SiteStatus[];
  failure?: { stage: "credentials" | "accounts.list" | "accounts.sites.list"; httpStatus: number | null; accountRef?: string };
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
): Promise<Collection> {
  const result: Collection = {
    attemptedAt: now(), checkedAt: null, listComplete: false, mutationPerformed: false,
    totalSites: 0, accountsFound: 0, sites: [],
  };
  let accounts: Account[];
  try {
    accounts = await listAllPages(listAccounts);
  } catch (error) {
    result.failure = { stage: "accounts.list", httpStatus: httpStatus(error) };
    return result;
  }
  result.accountsFound = accounts.length;
  for (const account of accounts) {
    const accountRef = account.name;
    if (!accountRef || !/^accounts\/[^/]+$/.test(accountRef)) {
      result.failure = { stage: "accounts.list", httpStatus: null };
      return result;
    }
    let sites: Site[];
    try {
      sites = await listAllPages((token) => listSites(accountRef, token));
    } catch (error) {
      result.failure = { stage: "accounts.sites.list", httpStatus: httpStatus(error), accountRef };
      return result;
    }
    for (const site of sites) {
      if (!site.domain) {
        result.failure = { stage: "accounts.sites.list", httpStatus: null, accountRef };
        return result;
      }
      result.sites.push({
        accountRef,
        domain: normalizeDomain(site.domain),
        rawState: site.state ?? null,
        autoAdsEnabled: site.autoAdsEnabled ?? null,
      });
    }
    result.totalSites = result.sites.length;
  }
  result.checkedAt = now();
  result.listComplete = true;
  return result;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const arg = (name: string, fallback: string) => args.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
  const clientPath = arg("client", process.env.ADSENSE_OAUTH_CLIENT_PATH || "E:\\env\\adsense_oauth_client.json");
  const tokenPath = arg("token", process.env.ADSENSE_TOKEN_PATH || "E:\\env\\adsense_token.json");
  const outputPath = arg("output", process.env.ADSENSE_STATUS_OUTPUT_PATH || path.resolve("data/adsense-account-status-current.json"));
  let result: Collection;
  try {
    const clientFile = JSON.parse(await readFile(clientPath, "utf8"));
    const tokenFile = JSON.parse(await readFile(tokenPath, "utf8"));
    const client = clientFile.installed ?? clientFile.web;
    if (!client?.client_id || !client?.client_secret || !tokenFile?.refresh_token) throw new Error("Missing OAuth credentials");
    const auth = new google.auth.OAuth2(client.client_id, client.client_secret, client.redirect_uris?.[0]);
    auth.setCredentials({
      access_token: tokenFile.token ?? tokenFile.access_token,
      refresh_token: tokenFile.refresh_token,
      expiry_date: typeof tokenFile.expiry === "string" ? Date.parse(tokenFile.expiry) : tokenFile.expiry_date,
    });
    const api = google.adsense({ version: "v2", auth });
    result = await collectStatus(
      async (pageToken) => {
        const response = await api.accounts.list({ pageSize: 10000, pageToken });
        return { items: response.data.accounts ?? [], nextPageToken: response.data.nextPageToken };
      },
      async (parent, pageToken) => {
        const response = await api.accounts.sites.list({ parent, pageSize: 10000, pageToken });
        return { items: response.data.sites ?? [], nextPageToken: response.data.nextPageToken };
      },
    );
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
  const publicResult = { attemptedAt: result.attemptedAt, checkedAt: result.checkedAt,
    listComplete: result.listComplete, proofDomains: [...domains].sort(), mutationPerformed: false, totalSites: result.totalSites,
    stateCounts: Object.fromEntries([...new Set(result.sites.map(site => site.rawState ?? "UNKNOWN"))].map(state => [state, result.sites.filter(site => (site.rawState ?? "UNKNOWN") === state).length])),
    sites: result.sites.filter(site => domains.has(site.domain) && !["tasko.kr", "kang4.com"].includes(site.domain))
      .map(site => ({ domain: site.domain, rawState: site.rawState })),
    ...(result.failure ? { failure: { stage: result.failure.stage, httpStatus: result.failure.httpStatus } } : {}),
  };
  await writeFile(outputPath, `${JSON.stringify(publicResult, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ outputPath, checkedAt: result.checkedAt, listComplete: result.listComplete,
    accountsFound: result.accountsFound, totalSites: result.totalSites, failure: result.failure }));
  if (!result.listComplete) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error("AdSense status collection failed to write output"); process.exitCode = 1; });
}
