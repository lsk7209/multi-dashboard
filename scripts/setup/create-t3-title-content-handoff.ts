import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import YAML from "yaml";

const DATA_DIR = "data";
const DOCS_DIR = join("docs", "work-orders");
const SITES_PATH = join("scripts", "setup", "sites.yaml");

type T3ActionType = "title_handoff" | "content_handoff";

interface FleetPlan {
  dashboardEvidence?: {
    snapshotTimestamp?: unknown;
    statsPath?: unknown;
    refreshCommand?: unknown;
    refreshFailedSources?: unknown;
  };
  seoCandidates?: PlanCandidate[];
}

interface PlanCandidate {
  rank?: unknown;
  siteId?: unknown;
  host?: unknown;
  url?: unknown;
  actionType?: unknown;
  tier?: unknown;
  metrics?: {
    gscImpressions30d?: unknown;
    gscClicks30d?: unknown;
    gscCtr30d?: unknown;
    gscPosition30d?: unknown;
    ga4ActiveUsers30d?: unknown;
  };
}

interface StatsSnapshot {
  generatedAt?: unknown;
  stats?: StatsRow[];
}

interface StatsRow {
  id?: unknown;
  name?: unknown;
  url?: unknown;
  gscSiteUrl?: unknown;
  gscTopQueries?: TopQuery[];
  sitemapPath?: unknown;
  sitemapWarnings?: unknown;
  sitemapErrors?: unknown;
  adsenseStatus?: unknown;
  adsTxtStatus?: unknown;
}

interface TopQuery {
  query?: unknown;
  clicks?: unknown;
  impressions?: unknown;
  ctr?: unknown;
  position?: unknown;
}

interface SiteProfile {
  id?: unknown;
  url?: unknown;
  platform?: unknown;
  wpRestBase?: unknown;
  contentSource?: {
    type?: unknown;
    localPath?: unknown;
  };
}

interface HandoffSite {
  host: string;
  siteId: string;
  url: string;
  localPath: string;
  platform: string;
  wpRestBase: string;
  actions: T3ActionType[];
  planRanks: number[];
  metrics: {
    gscImpressions30d: number;
    gscClicks30d: number;
    gscCtr30d: number;
    gscPosition30d: number;
    ga4ActiveUsers30d: number;
  };
  topQueries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  technicalStatus: {
    sitemapPath: string;
    sitemapWarnings: number;
    sitemapErrors: number;
    adsenseStatus: string;
    adsTxtStatus: string;
  };
  recommendedNextAction: string;
}

interface T3Handoff {
  generatedAt: string;
  mutationStatus: {
    cmsMutationPerformed: false;
    productionDeploymentPerformed: false;
    searchConsoleMutationPerformed: false;
    adsenseMutationPerformed: false;
    titleOrBodyMutationPerformed: false;
  };
  dashboardEvidence: {
    snapshotTimestamp: string;
    statsPath: string;
    planPath: string;
    sitesPath: string;
    refreshCommand: string;
    refreshFailedSources: string[];
  };
  summary: {
    siteCount: number;
    titleHandoffCount: number;
    contentHandoffCount: number;
  };
  sites: HandoffSite[];
  stopConditions: string[];
}

function main() {
  const date = parseCliOptions(process.argv.slice(2)).date;
  const planPath = join(DATA_DIR, `fleet-optimization-plan-${date}.json`);
  const statsPath = join(DATA_DIR, "site-stats.json");
  const handoff = buildT3TitleContentHandoff({
    plan: readJson<FleetPlan>(planPath),
    stats: readJson<StatsSnapshot>(statsPath),
    siteProfiles: readSiteProfiles(SITES_PATH),
    planPath,
    statsPath,
    sitesPath: SITES_PATH,
  });

  const jsonPath = join(DATA_DIR, `t3-title-content-handoff-${date}.json`);
  const mdPath = join(DOCS_DIR, `t3-title-content-handoff-${date}.md`);
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(DOCS_DIR, { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(handoff, null, 2)}\n`);
  writeFileSync(mdPath, renderT3TitleContentHandoffMarkdown(handoff));
  console.log(
    [
      `Wrote ${jsonPath} and ${mdPath}.`,
      `snapshot=${handoff.dashboardEvidence.snapshotTimestamp}`,
      `sites=${handoff.summary.siteCount}`,
      `titleHandoff=${handoff.summary.titleHandoffCount}`,
      `contentHandoff=${handoff.summary.contentHandoffCount}`,
    ].join(" "),
  );
}

function parseCliOptions(args: string[]): { date: string } {
  const options = { date: seoulDate(new Date()) };
  for (const arg of args) {
    if (arg.startsWith("--date=")) {
      options.date = arg.slice("--date=".length);
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new Error("--date must be YYYY-MM-DD.");
  }
  return options;
}

export function buildT3TitleContentHandoff(input: {
  plan: FleetPlan;
  stats: StatsSnapshot;
  siteProfiles: SiteProfile[];
  planPath: string;
  statsPath: string;
  sitesPath: string;
}): T3Handoff {
  const snapshotTimestamp = requireString(
    input.plan.dashboardEvidence?.snapshotTimestamp,
    "fleet plan dashboardEvidence.snapshotTimestamp",
  );
  const statsTimestamp = requireString(
    input.stats.generatedAt,
    "data/site-stats.json generatedAt",
  );
  if (snapshotTimestamp !== statsTimestamp) {
    throw new Error(
      `plan snapshot ${snapshotTimestamp} does not match stats snapshot ${statsTimestamp}`,
    );
  }

  const rows = input.stats.stats ?? [];
  const profileByHost = buildProfileByHost(input.siteProfiles);
  const candidates = (input.plan.seoCandidates ?? []).filter(isT3Candidate);
  const byHost = new Map<string, HandoffSite>();

  for (const candidate of candidates) {
    const host = stringValue(candidate.host) || hostFromUrl(stringValue(candidate.url));
    if (!host) {
      continue;
    }
    const action = candidate.actionType as T3ActionType;
    const existing = byHost.get(host);
    if (existing) {
      if (!existing.actions.includes(action)) {
        existing.actions.push(action);
      }
      existing.planRanks.push(numberValue(candidate.rank));
      continue;
    }

    const statsRow = findStatsRow(rows, host);
    const profile = profileByHost.get(host);
    byHost.set(host, {
      host,
      siteId: stringValue(candidate.siteId) || stringValue(statsRow?.id),
      url: stringValue(candidate.url) || stringValue(statsRow?.url),
      localPath: stringValue(profile?.contentSource?.localPath),
      platform: stringValue(profile?.platform),
      wpRestBase: stringValue(profile?.wpRestBase),
      actions: [action],
      planRanks: [numberValue(candidate.rank)],
      metrics: {
        gscImpressions30d: numberValue(candidate.metrics?.gscImpressions30d),
        gscClicks30d: numberValue(candidate.metrics?.gscClicks30d),
        gscCtr30d: numberValue(candidate.metrics?.gscCtr30d),
        gscPosition30d: numberValue(candidate.metrics?.gscPosition30d),
        ga4ActiveUsers30d: numberValue(candidate.metrics?.ga4ActiveUsers30d),
      },
      topQueries: (statsRow?.gscTopQueries ?? []).slice(0, 5).map((query) => ({
        query: stringValue(query.query),
        clicks: numberValue(query.clicks),
        impressions: numberValue(query.impressions),
        ctr: numberValue(query.ctr),
        position: numberValue(query.position),
      })),
      technicalStatus: {
        sitemapPath: stringValue(statsRow?.sitemapPath),
        sitemapWarnings: numberValue(statsRow?.sitemapWarnings),
        sitemapErrors: numberValue(statsRow?.sitemapErrors),
        adsenseStatus: stringValue(statsRow?.adsenseStatus),
        adsTxtStatus: stringValue(statsRow?.adsTxtStatus),
      },
      recommendedNextAction: recommendedNextAction(
        [action],
        stringValue(profile?.contentSource?.localPath),
      ),
    });
  }

  const sites = [...byHost.values()].sort(
    (left, right) =>
      Math.min(...left.planRanks) - Math.min(...right.planRanks) ||
      left.host.localeCompare(right.host),
  );
  for (const site of sites) {
    site.recommendedNextAction = recommendedNextAction(site.actions, site.localPath);
  }

  return {
    generatedAt: new Date().toISOString(),
    mutationStatus: {
      cmsMutationPerformed: false,
      productionDeploymentPerformed: false,
      searchConsoleMutationPerformed: false,
      adsenseMutationPerformed: false,
      titleOrBodyMutationPerformed: false,
    },
    dashboardEvidence: {
      snapshotTimestamp,
      statsPath: input.statsPath,
      planPath: input.planPath,
      sitesPath: input.sitesPath,
      refreshCommand: stringValue(input.plan.dashboardEvidence?.refreshCommand) || "pnpm stats:update",
      refreshFailedSources: stringArray(input.plan.dashboardEvidence?.refreshFailedSources),
    },
    summary: {
      siteCount: sites.length,
      titleHandoffCount: candidates.filter(
        (candidate) => candidate.actionType === "title_handoff",
      ).length,
      contentHandoffCount: candidates.filter(
        (candidate) => candidate.actionType === "content_handoff",
      ).length,
    },
    sites,
    stopConditions: [
      "Do not edit WordPress titles, slugs, article bodies, headings, or in-body internal links from this handoff.",
      "Do not publish drafts, schedule posts, submit sitemaps, ping IndexNow, deploy, or mutate CMS/API state without an explicit apply step and rollback path.",
      "If localPath is missing or dirty, collect evidence only and do not create content in production.",
      "Re-run pnpm stats:update and pnpm fleet:optimize:plan before using this handoff after the next dashboard data window.",
    ],
  };
}

export function renderT3TitleContentHandoffMarkdown(handoff: T3Handoff): string {
  return `# T3 Title/Content Handoff - ${handoff.dashboardEvidence.snapshotTimestamp}

Mutation status: no CMS, database, Search Console, AdSense, production title/body, or deployment mutation performed.

## Dashboard Evidence

- Snapshot: \`${handoff.dashboardEvidence.snapshotTimestamp}\`
- Stats path: \`${handoff.dashboardEvidence.statsPath}\`
- Plan path: \`${handoff.dashboardEvidence.planPath}\`
- Sites path: \`${handoff.dashboardEvidence.sitesPath}\`
- Refresh command: \`${handoff.dashboardEvidence.refreshCommand}\`
- Refresh failed sources: ${handoff.dashboardEvidence.refreshFailedSources.length > 0 ? handoff.dashboardEvidence.refreshFailedSources.map((source) => `\`${source}\``).join(", ") : "`none`"}

## Summary

| Metric | Count |
|---|---:|
| Sites | ${handoff.summary.siteCount} |
| Title handoff rows | ${handoff.summary.titleHandoffCount} |
| Content handoff rows | ${handoff.summary.contentHandoffCount} |

## Handoff Queue

| Site | Plan ranks | Actions | 30d GSC | 30d users | Top queries | Local source |
|---|---:|---|---:|---:|---|---|
${handoff.sites
  .map(
    (site) =>
      `| \`${site.host}\` | ${site.planRanks.join(", ")} | ${site.actions.map((action) => `\`${action}\``).join(", ")} | ${site.metrics.gscImpressions30d} impr / ${site.metrics.gscClicks30d} clicks / ${(site.metrics.gscCtr30d * 100).toFixed(2)}% CTR / pos ${site.metrics.gscPosition30d.toFixed(2)} | ${site.metrics.ga4ActiveUsers30d} | ${renderTopQueries(site)} | ${site.localPath ? `\`${site.localPath}\`` : "`missing`"} |`,
  )
  .join("\n")}

## Technical Status

| Site | Platform | Sitemap | AdSense | ads.txt | Decision |
|---|---|---|---|---|---|
${handoff.sites
  .map(
    (site) =>
      `| \`${site.host}\` | \`${site.platform || "unknown"}\` | \`${site.technicalStatus.sitemapPath || "missing"}\`, warnings=${site.technicalStatus.sitemapWarnings}, errors=${site.technicalStatus.sitemapErrors} | \`${site.technicalStatus.adsenseStatus || "unknown"}\` | \`${site.technicalStatus.adsTxtStatus || "unknown"}\` | ${site.recommendedNextAction} |`,
  )
  .join("\n")}

## Stop Conditions

${handoff.stopConditions.map((condition) => `- ${condition}`).join("\n")}
`;
}

function isT3Candidate(candidate: PlanCandidate): boolean {
  return (
    candidate.tier === "T3" &&
    (candidate.actionType === "title_handoff" ||
      candidate.actionType === "content_handoff")
  );
}

function recommendedNextAction(actions: T3ActionType[], localPath: string): string {
  if (!localPath) {
    return "Evidence collection only: no controlled local content source is registered; do not create or edit production content.";
  }
  if (actions.includes("title_handoff") && actions.includes("content_handoff")) {
    return "Title + content workflow; do not directly edit live titles or article bodies from this handoff.";
  }
  if (actions.includes("title_handoff")) {
    return "Title workflow only; do not directly edit live titles from this handoff.";
  }
  return "Persona/content workflow only; do not directly edit article bodies from this handoff.";
}

function renderTopQueries(site: HandoffSite): string {
  if (site.topQueries.length === 0) {
    return "`missing`";
  }
  return site.topQueries
    .map((query) => `\`${query.query}\` (${query.impressions} impr, pos ${query.position.toFixed(2)})`)
    .join("<br>");
}

function findStatsRow(rows: StatsRow[], host: string): StatsRow | undefined {
  return rows.find((row) => {
    const candidates = [row.url, row.gscSiteUrl, row.name].map((value) =>
      hostFromUrl(stringValue(value)),
    );
    return candidates.includes(host);
  });
}

function buildProfileByHost(siteProfiles: SiteProfile[]): Map<string, SiteProfile> {
  const byHost = new Map<string, SiteProfile>();
  for (const profile of siteProfiles) {
    const host = hostFromUrl(stringValue(profile.url));
    if (!host) {
      continue;
    }
    const existing = byHost.get(host);
    if (!existing || profileScore(profile) > profileScore(existing)) {
      byHost.set(host, profile);
    }
  }
  return byHost;
}

function profileScore(profile: SiteProfile): number {
  let score = 0;
  if (stringValue(profile.contentSource?.localPath)) {
    score += 4;
  }
  if (stringValue(profile.contentSource?.type) === "local-app") {
    score += 2;
  }
  if (stringValue(profile.wpRestBase)) {
    score += 1;
  }
  return score;
}

function readSiteProfiles(path: string): SiteProfile[] {
  const parsed = YAML.parse(readFileSync(path, "utf8")) as unknown;
  if (Array.isArray(parsed)) {
    return parsed as SiteProfile[];
  }
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { sites?: unknown }).sites)
  ) {
    return (parsed as { sites: SiteProfile[] }).sites;
  }
  return [];
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} is missing.`);
  }
  return value;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function hostFromUrl(value: string): string {
  if (!value) {
    return "";
  }
  if (value.startsWith("sc-domain:")) {
    return value.slice("sc-domain:".length).replace(/^www\./, "");
  }
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
  }
}

function seoulDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
