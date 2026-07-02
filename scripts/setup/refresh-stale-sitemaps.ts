import { readFile } from "node:fs/promises";
import { google } from "googleapis";
import { makeGoogleAuth } from "./lib/gcp.js";
import { loadLocalSecrets, readSecret } from "./lib/secrets.js";
import { getErrorMessage } from "./lib/errors.js";

const STATS_PATH = "data/site-stats.json";
const DEFAULT_MIN_AGE_DAYS = 14;
type RefreshBasis = "downloaded" | "submitted";

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
  sitemapDetails?: SitemapDetail[];
}

interface SitemapDetail {
  path: string;
  lastDownloaded?: string;
  lastSubmitted?: string;
  warnings?: number;
  errors?: number;
  isPending?: boolean;
}

interface StatsSnapshot {
  generatedAt: string;
  stats: SiteStat[];
}

interface Args {
  dryRun: boolean;
  includeIssues: boolean;
  all: boolean;
  basis: RefreshBasis;
  minAgeDays: number;
  limit: number;
  siteId?: string;
  host?: string;
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
  const basisArg = args.find((arg) => arg.startsWith("--basis="));
  const siteIdArg = args.find((arg) => arg.startsWith("--site-id="));
  const hostArg = args.find((arg) => arg.startsWith("--host="));
  const basis = basisArg?.replace("--basis=", "");
  if (basis && basis !== "downloaded" && basis !== "submitted") {
    throw new Error("--basis must be downloaded or submitted.");
  }
  const refreshBasis: RefreshBasis = basis === "submitted" ? "submitted" : "downloaded";
  const parsed: Args = {
    dryRun: args.includes("--dry-run"),
    includeIssues: args.includes("--include-issues"),
    all: args.includes("--all"),
    basis: refreshBasis,
    minAgeDays: minAgeArg
      ? Number(minAgeArg.replace("--min-age-days=", ""))
      : DEFAULT_MIN_AGE_DAYS,
    limit: limitArg ? Number(limitArg.replace("--limit=", "")) : 50,
  };

  if (siteIdArg) {
    parsed.siteId = siteIdArg.replace("--site-id=", "");
  }
  if (hostArg) {
    parsed.host = hostArg
      .replace("--host=", "")
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
  }

  return parsed;
}

function getHost(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).hostname;
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

function matchesTargetFilter(stat: SiteStat, args: Args): boolean {
  if (args.siteId && stat.id !== args.siteId) {
    return false;
  }

  if (args.host) {
    const hosts = [stat.url, stat.gscSiteUrl, stat.sitemapPath]
      .map(getHost)
      .filter(Boolean);
    if (!hosts.includes(args.host)) {
      return false;
    }
  }

  return true;
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

function makeReason(stat: SiteStat, ageDays: number, basis: RefreshBasis): string {
  const parts = [
    Number.isFinite(ageDays)
      ? `${ageDays}d since last${basis === "submitted" ? "Submitted" : "Downloaded"}`
      : `no last${basis === "submitted" ? "Submitted" : "Downloaded"}`,
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
    if (!matchesTargetFilter(stat, args)) {
      return [];
    }

    const siteUrl = stat.gscSiteUrl ?? stat.url;
    const sitemapDetails =
      stat.sitemapDetails && stat.sitemapDetails.length > 0
        ? stat.sitemapDetails
        : stat.sitemapPath
          ? [
              {
                path: stat.sitemapPath,
                lastDownloaded: stat.sitemapLastDownloadedAt,
                lastSubmitted: stat.sitemapLastSubmittedAt,
                warnings: stat.sitemapWarnings,
                errors: stat.sitemapErrors,
              },
            ]
          : [];
    if (!siteUrl || sitemapDetails.length === 0) {
      return [];
    }

    return sitemapDetails.flatMap<Target>((detail) => {
      if (!detail.path || !detail.path.startsWith("http")) {
        return [];
      }

      const basisDate =
        args.basis === "submitted"
          ? detail.lastSubmitted
          : detail.lastDownloaded;
      const ageDays = getCollectionAgeDays(basisDate, now);
      const detailStat: SiteStat = {
        id: stat.id,
        name: stat.name,
        url: stat.url,
        sitemapPath: detail.path,
      };
      if (stat.gscSiteUrl) {
        detailStat.gscSiteUrl = stat.gscSiteUrl;
      }
      if (detail.lastDownloaded) {
        detailStat.sitemapLastDownloadedAt = detail.lastDownloaded;
      }
      if (detail.lastSubmitted) {
        detailStat.sitemapLastSubmittedAt = detail.lastSubmitted;
      }
      if (detail.warnings !== undefined) {
        detailStat.sitemapWarnings = detail.warnings;
      }
      if (detail.errors !== undefined) {
        detailStat.sitemapErrors = detail.errors;
      }
      const hasIssue = (detail.errors ?? 0) > 0 || (detail.warnings ?? 0) > 0;
      const selected =
        args.all ||
        ageDays >= args.minAgeDays ||
        (args.includeIssues && hasIssue);

      return selected
        ? [
            {
              stat,
              siteUrl,
              feedpath: detail.path,
              ageDays,
              reason: makeReason(detailStat, ageDays, args.basis),
            },
          ]
        : [];
    });
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
    text.includes("<rss") ||
    text.includes("<feed");
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
    `${args.dryRun ? "Dry run" : "Submitting"} ${targets.length} sitemap(s). basis=${args.basis} minAgeDays=${args.minAgeDays}`,
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
