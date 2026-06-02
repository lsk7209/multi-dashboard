import { readFile } from "node:fs/promises";
import { google } from "googleapis";
import { makeGoogleAuth } from "./lib/gcp.js";
import { loadLocalSecrets, readSecret } from "./lib/secrets.js";
import { getErrorMessage } from "./lib/errors.js";

const STATS_PATH = "data/site-stats.json";
const DEFAULT_MIN_AGE_DAYS = 14;

interface SiteStat {
  id: string;
  name: string;
  url: string;
  gscSiteUrl?: string;
  sitemapLastDownloadedAt?: string;
  sitemapLastSubmittedAt?: string;
  sitemapPath?: string;
  sitemapWarnings?: number;
  sitemapErrors?: number;
}

interface StatsSnapshot {
  generatedAt: string;
  stats: SiteStat[];
}

interface Args {
  dryRun: boolean;
  includeIssues: boolean;
  all: boolean;
  minAgeDays: number;
  limit: number;
}

interface Target {
  stat: SiteStat;
  siteUrl: string;
  feedpath: string;
  ageDays: number;
  reason: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const minAgeArg = args.find((arg) => arg.startsWith("--min-age-days="));
  const limitArg = args.find((arg) => arg.startsWith("--limit="));

  return {
    dryRun: args.includes("--dry-run"),
    includeIssues: args.includes("--include-issues"),
    all: args.includes("--all"),
    minAgeDays: minAgeArg
      ? Number(minAgeArg.replace("--min-age-days=", ""))
      : DEFAULT_MIN_AGE_DAYS,
    limit: limitArg ? Number(limitArg.replace("--limit=", "")) : 50,
  };
}

function getCollectionAgeDays(value: string | undefined, now: Date): number {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((now.getTime() - timestamp) / 86400000);
}

function makeReason(stat: SiteStat, ageDays: number): string {
  const parts = [
    Number.isFinite(ageDays) ? `${ageDays}d since lastDownloaded` : "no lastDownloaded",
  ];

  if ((stat.sitemapErrors ?? 0) > 0) {
    parts.push(`errors=${stat.sitemapErrors}`);
  }
  if ((stat.sitemapWarnings ?? 0) > 0) {
    parts.push(`warnings=${stat.sitemapWarnings}`);
  }

  return parts.join(", ");
}

function dedupeTargets(targets: Target[]): Target[] {
  const byKey = new Map<string, Target>();

  for (const target of targets) {
    const key = `${target.siteUrl}|${target.feedpath}`;
    const current = byKey.get(key);
    if (!current || target.ageDays > current.ageDays) {
      byKey.set(key, target);
    }
  }

  return [...byKey.values()].sort((a, b) => b.ageDays - a.ageDays);
}

function selectTargets(snapshot: StatsSnapshot, args: Args): Target[] {
  const now = snapshot.generatedAt ? new Date(snapshot.generatedAt) : new Date();
  const targets = snapshot.stats.flatMap<Target>((stat) => {
    const feedpath = stat.sitemapPath;
    const siteUrl = stat.gscSiteUrl ?? stat.url;
    if (!feedpath || !siteUrl) {
      return [];
    }

    const ageDays = getCollectionAgeDays(stat.sitemapLastDownloadedAt, now);
    const hasIssue = (stat.sitemapErrors ?? 0) > 0 || (stat.sitemapWarnings ?? 0) > 0;
    const selected =
      args.all ||
      ageDays >= args.minAgeDays ||
      (args.includeIssues && hasIssue);

    return selected
      ? [
          {
            stat,
            siteUrl,
            feedpath,
            ageDays,
            reason: makeReason(stat, ageDays),
          },
        ]
      : [];
  });

  return dedupeTargets(targets).slice(0, args.limit);
}

async function inspectPublicSitemap(url: string): Promise<string> {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    return `public ${response.status}`;
  }

  const text = await response.text();
  const hasXml =
    text.includes("<urlset") ||
    text.includes("<sitemapindex") ||
    text.includes("<rss");
  const lastmodCount = (text.match(/<lastmod>/g) ?? []).length;

  return hasXml ? `public ok, lastmod=${lastmodCount}` : "public not-xml";
}

async function main(): Promise<void> {
  const args = parseArgs();
  const raw = await readFile(STATS_PATH, "utf8");
  const snapshot = JSON.parse(raw) as StatsSnapshot;
  const targets = selectTargets(snapshot, args);

  if (targets.length === 0) {
    console.log("No sitemap refresh targets.");
    return;
  }

  loadLocalSecrets();
  const keyJson = readSecret("GCP_SA_KEY_JSON");
  if (!keyJson) {
    throw new Error("GCP_SA_KEY_JSON is missing.");
  }

  const auth = makeGoogleAuth(keyJson, [
    "https://www.googleapis.com/auth/webmasters",
  ]);
  const client = google.searchconsole({ version: "v1", auth });

  console.log(
    `${args.dryRun ? "Dry run" : "Submitting"} ${targets.length} sitemap(s). minAgeDays=${args.minAgeDays}`,
  );

  for (const target of targets) {
    const publicStatus = await inspectPublicSitemap(target.feedpath);
    const prefix = `${target.stat.id} ${target.feedpath} (${target.reason}; ${publicStatus})`;

    if (args.dryRun) {
      console.log(`DRY ${prefix}`);
      continue;
    }

    try {
      await client.sitemaps.submit({
        siteUrl: target.siteUrl,
        feedpath: target.feedpath,
      });
      console.log(`OK  ${prefix}`);
    } catch (error) {
      console.log(`ERR ${prefix}; ${getErrorMessage(error)}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
