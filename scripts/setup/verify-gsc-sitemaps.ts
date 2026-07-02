import { google } from "googleapis";
import pLimit from "p-limit";
import { pathToFileURL } from "node:url";
import { makeGoogleAuth } from "./lib/gcp.js";
import { loadLocalSecrets, readSecret } from "./lib/secrets.js";
import { loadSites, type Site } from "./lib/sites.js";
import { getErrorMessage } from "./lib/errors.js";

const CONCURRENCY = 6;
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; MultiDashboardGscSitemapVerifier/1.0)",
  Accept: "application/xml,text/xml,application/rss+xml,text/plain,*/*;q=0.8",
} as const;

interface Args {
  submitMissing: boolean;
  submitNotGreen: boolean;
  dryRun: boolean;
  limit?: number;
}

export interface ListedSitemap {
  path?: string | null;
  lastDownloaded?: string | null;
  lastSubmitted?: string | null;
  warnings?: string | number | null;
  errors?: string | number | null;
  isPending?: boolean | null;
}

export interface ExpectedSitemap {
  url: string;
  publicStatus: string;
  listed?: ListedSitemap;
  green: boolean;
  action: "none" | "submit";
  result?: string;
}

export interface SiteResult {
  id: string;
  siteUrl: string;
  expected: ExpectedSitemap[];
  error?: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const parsed: Args = {
    submitMissing: args.includes("--submit-missing"),
    submitNotGreen: args.includes("--submit-not-green"),
    dryRun: args.includes("--dry-run"),
  };
  if (limitArg) {
    parsed.limit = Number(limitArg.replace("--limit=", ""));
  }
  return parsed;
}

async function inspectPublicSitemap(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: FETCH_HEADERS,
    });
    if (!response.ok) {
      return `public ${response.status}`;
    }
    const text = await response.text();
    return /<(urlset|sitemapindex|rss|feed)/i.test(text)
      ? "public ok"
      : "public not-xml";
  } catch (error) {
    return `public error: ${getErrorMessage(error)}`;
  }
}

function getExpectedSitemapUrls(site: Site): string[] {
  if (site.sitemapUrls?.length) {
    return site.sitemapUrls;
  }
  return [new URL("/sitemap.xml", site.url).toString()];
}

function isGreen(sitemap: ListedSitemap | undefined): boolean {
  if (!sitemap?.lastSubmitted || !sitemap.lastDownloaded) {
    return false;
  }
  return (
    Number(sitemap.errors ?? 0) === 0 &&
    Number(sitemap.warnings ?? 0) === 0 &&
    sitemap.isPending !== true
  );
}

function findListedSitemap(
  listed: ListedSitemap[],
  expectedUrl: string,
): ListedSitemap | undefined {
  const normalized = normalizeUrl(expectedUrl);
  return listed.find((sitemap) => normalizeUrl(sitemap.path ?? "") === normalized);
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "").toLowerCase();
}

export async function verifySite(
  client: ReturnType<typeof google.searchconsole>,
  site: Site,
  args: Args,
): Promise<SiteResult> {
  const siteUrl = site.gscSiteUrl ?? site.url;
  let response;
  try {
    response = await client.sitemaps.list({ siteUrl });
  } catch (error) {
    return {
      id: site.id,
      siteUrl,
      expected: [],
      error: getErrorMessage(error),
    };
  }
  const listed = (response.data.sitemap ?? []) as ListedSitemap[];
  const expectedUrls = getExpectedSitemapUrls(site);
  const expected: ExpectedSitemap[] = [];

  for (const url of expectedUrls) {
    const publicStatus = await inspectPublicSitemap(url);
    const listedSitemap = findListedSitemap(listed, url);
    const green = isGreen(listedSitemap);
    const shouldSubmit =
      publicStatus === "public ok" &&
      ((args.submitMissing && !listedSitemap) ||
        (args.submitNotGreen && listedSitemap && !green));
    const item: ExpectedSitemap = {
      url,
      publicStatus,
      ...(listedSitemap ? { listed: listedSitemap } : {}),
      green,
      action: shouldSubmit ? "submit" : "none",
    };

    if (shouldSubmit) {
      if (args.dryRun) {
        item.result = "dry-run";
      } else {
        try {
          await client.sitemaps.submit({ siteUrl, feedpath: url });
          item.result = "submitted";
        } catch (error) {
          item.result = `submit failed: ${getErrorMessage(error)}`;
        }
      }
    }
    expected.push(item);
  }

  return { id: site.id, siteUrl, expected };
}

export interface GscSitemapSummary {
  sites: number;
  green: number;
  notGreen: number;
  failedSites: number;
  submitActions: number;
}

export function summarizeSitemapResults(results: SiteResult[]): GscSitemapSummary {
  let green = 0;
  let notGreen = 0;
  let submitActions = 0;
  let failedSites = 0;
  for (const result of results) {
    if (result.error) {
      failedSites += 1;
      continue;
    }
    for (const sitemap of result.expected) {
      if (sitemap.green) green += 1;
      else notGreen += 1;
      if (sitemap.result === "submitted" || sitemap.result === "dry-run") {
        submitActions += 1;
      }
    }
  }
  return {
    sites: results.length,
    green,
    notGreen,
    failedSites,
    submitActions,
  };
}

async function main(): Promise<void> {
  const args = parseArgs();
  loadLocalSecrets();
  const keyJson = readSecret("GCP_SA_KEY_JSON");
  if (!keyJson) {
    throw new Error("GCP_SA_KEY_JSON is missing.");
  }
  const auth = makeGoogleAuth(keyJson, [
    args.submitMissing || args.submitNotGreen
      ? "https://www.googleapis.com/auth/webmasters"
      : "https://www.googleapis.com/auth/webmasters.readonly",
  ]);
  const client = google.searchconsole({ version: "v1", auth });
  const sites = (await loadSites())
    .filter((site) => site.enabled !== false)
    .slice(0, args.limit);
  const limit = pLimit(CONCURRENCY);
  const results = await Promise.all(
    sites.map((site) => limit(() => verifySite(client, site, args))),
  );

  const summary = summarizeSitemapResults(results);
  for (const result of results) {
    if (result.error) {
      console.log(`ERROR ${result.id} ${result.siteUrl} ${result.error}`);
      continue;
    }
    for (const sitemap of result.expected) {
      const status = sitemap.green ? "GREEN" : "CHECK";
      const action =
        sitemap.action === "submit" ? ` action=${sitemap.result ?? "submit"}` : "";
      console.log(
        `${status} ${result.id} ${sitemap.url} ${sitemap.publicStatus}${action}`,
      );
    }
  }
  console.log(
    `GSC sitemap verify complete: sites=${summary.sites}, green=${summary.green}, notGreen=${summary.notGreen}, failedSites=${summary.failedSites}, submitActions=${summary.submitActions}, dryRun=${args.dryRun}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
