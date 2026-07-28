import { google } from "googleapis";
import { pathToFileURL } from "node:url";
import { makeGoogleAuth } from "./lib/gcp.js";
import { loadLocalSecrets, readSecret } from "./lib/secrets.js";
import { getErrorMessage } from "./lib/errors.js";

export interface SitemapState {
  path?: string | null;
  lastDownloaded?: string | null;
  lastSubmitted?: string | null;
  warnings?: string | number | null;
  errors?: string | number | null;
  isPending?: boolean | null;
  isSitemapsIndex?: boolean | null;
}

interface Args {
  siteUrl: string;
  feedpath: string;
  minAgeDays: number;
  pollSeconds: number;
}

function requiredArg(name: string): string {
  const prefix = `--${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!value) {
    throw new Error(`${prefix}<value> is required.`);
  }
  return value.slice(prefix.length);
}

function numberArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!value) {
    return fallback;
  }
  const parsed = Number(value.slice(prefix.length));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${prefix}<number> must be a non-negative number.`);
  }
  return parsed;
}

function parseArgs(): Args {
  return {
    siteUrl: requiredArg("site-url"),
    feedpath: requiredArg("feedpath"),
    minAgeDays: numberArg("min-age-days", 5),
    pollSeconds: numberArg("poll-seconds", 90),
  };
}

export function isGreen(state: SitemapState | undefined): boolean {
  return Boolean(
    state?.lastSubmitted &&
      state.lastDownloaded &&
      Number(state.errors ?? 0) === 0 &&
      Number(state.warnings ?? 0) === 0 &&
      state.isPending !== true,
  );
}

export function submissionAgeDays(
  state: SitemapState | undefined,
  now = new Date(),
): number {
  if (!state?.lastSubmitted) {
    return Number.POSITIVE_INFINITY;
  }
  const submittedAt = Date.parse(state.lastSubmitted);
  if (Number.isNaN(submittedAt)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.floor((now.getTime() - submittedAt) / 86_400_000);
}

export function shouldSubmit(
  state: SitemapState | undefined,
  minAgeDays: number,
  now = new Date(),
): boolean {
  return !isGreen(state) || submissionAgeDays(state, now) >= minAgeDays;
}

export function processedAfterSubmission(
  state: SitemapState | undefined,
): boolean {
  if (!isGreen(state) || !state?.lastSubmitted || !state.lastDownloaded) {
    return false;
  }
  return Date.parse(state.lastDownloaded) >= Date.parse(state.lastSubmitted);
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "").toLowerCase();
}

async function inspectPublicSitemap(feedpath: string): Promise<void> {
  const response = await fetch(feedpath, {
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MultiDashboardGscSitemapSubmitter/1.0)",
      Accept: "application/xml,text/xml,*/*;q=0.8",
    },
  });
  if (!response.ok) {
    throw new Error(`Public sitemap returned HTTP ${response.status}.`);
  }
  const text = await response.text();
  if (!/<(?:urlset|sitemapindex)\b/i.test(text)) {
    throw new Error("Public sitemap response is not a sitemap XML document.");
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  await inspectPublicSitemap(args.feedpath);

  loadLocalSecrets();
  const keyJson = readSecret("GCP_SA_KEY_JSON");
  if (!keyJson) {
    throw new Error("GCP_SA_KEY_JSON is missing.");
  }

  const auth = makeGoogleAuth(keyJson, [
    "https://www.googleapis.com/auth/webmasters",
  ]);
  const client = google.searchconsole({ version: "v1", auth });
  const list = async (): Promise<SitemapState[]> => {
    const response = await client.sitemaps.list({ siteUrl: args.siteUrl });
    return (response.data.sitemap ?? []) as SitemapState[];
  };
  const findExpected = (states: SitemapState[]): SitemapState | undefined =>
    states.find(
      (state) =>
        normalizeUrl(state.path ?? "") === normalizeUrl(args.feedpath),
    );

  const before = findExpected(await list());
  if (!shouldSubmit(before, args.minAgeDays)) {
    console.log(
      `GREEN ${args.feedpath} action=none lastSubmitted=${before?.lastSubmitted} lastDownloaded=${before?.lastDownloaded}`,
    );
    return;
  }

  await client.sitemaps.submit({
    siteUrl: args.siteUrl,
    feedpath: args.feedpath,
  });

  const deadline = Date.now() + args.pollSeconds * 1000;
  do {
    const current = findExpected(await list());
    if (processedAfterSubmission(current)) {
      console.log(
        `GREEN ${args.feedpath} action=submitted lastSubmitted=${current?.lastSubmitted} lastDownloaded=${current?.lastDownloaded} index=${current?.isSitemapsIndex === true} warnings=${Number(current?.warnings ?? 0)} errors=${Number(current?.errors ?? 0)}`,
      );
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  } while (Date.now() < deadline);

  throw new Error(
    `Sitemap was submitted but did not reach processed green state within ${args.pollSeconds}s.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(getErrorMessage(error));
    process.exit(1);
  });
}
