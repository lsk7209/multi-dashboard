import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { google } from "googleapis";
import YAML from "yaml";
import { makeGoogleAuth } from "./lib/gcp.js";
import { loadLocalSecrets, readSecret } from "./lib/secrets.js";

const DEFAULT_TARGETS = ["estat-2", "cartain-2", "texturb", "tennisfrens"];
const DATA_DIR = "data";

interface SiteConfig {
  id: string;
  name?: string;
  gscSiteUrl?: string;
}

interface Opportunity {
  siteId: string;
  siteName: string;
  page: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

function seoulDateDaysAgo(days: number): string {
  const date = new Date(Date.now() - days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseTargets(args: string[]): string[] {
  if (args.length === 0) {
    return DEFAULT_TARGETS;
  }
  if (args.length === 1 && args[0]?.startsWith("--sites=")) {
    return args[0].slice("--sites=".length).split(",").map((value) => value.trim()).filter(Boolean);
  }
  throw new Error("Usage: tsx scripts/setup/collect-gsc-page-query-opportunities.ts [--sites=id,id]");
}

async function main(): Promise<void> {
  const targets = parseTargets(process.argv.slice(2));
  loadLocalSecrets();
  const keyJson = readSecret("GCP_SA_KEY_JSON");
  if (!keyJson) {
    throw new Error("Missing GCP_SA_KEY_JSON.");
  }

  const config = YAML.parse(readFileSync("scripts/setup/sites.yaml", "utf8")) as { sites?: SiteConfig[] };
  const sites = (config.sites ?? []).filter((site) => targets.includes(site.id));
  if (sites.length !== targets.length) {
    const found = new Set(sites.map((site) => site.id));
    throw new Error(`Unknown site ids: ${targets.filter((id) => !found.has(id)).join(", ")}`);
  }

  const client = google.searchconsole({
    version: "v1",
    auth: makeGoogleAuth(keyJson, ["https://www.googleapis.com/auth/webmasters.readonly"]),
  });
  const startDate = seoulDateDaysAgo(29);
  const endDate = seoulDateDaysAgo(1);
  const opportunities: Opportunity[] = [];

  for (const site of sites) {
    if (!site.gscSiteUrl) {
      continue;
    }
    const response = await client.searchanalytics.query({
      siteUrl: site.gscSiteUrl,
      requestBody: { startDate, endDate, dimensions: ["page", "query"], rowLimit: 1000 },
    }, { timeout: 30_000 });
    for (const row of response.data.rows ?? []) {
      const page = String(row.keys?.[0] ?? "").trim();
      const query = String(row.keys?.[1] ?? "").trim();
      if (!page || !query || (row.impressions ?? 0) < 20) {
        continue;
      }
      opportunities.push({
        siteId: site.id,
        siteName: site.name ?? site.id,
        page,
        query,
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0,
      });
    }
  }

  opportunities.sort((a, b) =>
    b.impressions - a.impressions || a.ctr - b.ctr || a.position - b.position,
  );
  const date = seoulDateDaysAgo(0);
  const output = {
    generatedAt: new Date().toISOString(),
    dateRange: { startDate, endDate },
    targets,
    productionMutationPerformed: false,
    opportunities,
  };
  mkdirSync(DATA_DIR, { recursive: true });
  const path = join(DATA_DIR, `gsc-page-query-opportunities-${date}.json`);
  writeFileSync(path, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${path}. rows=${opportunities.length} targets=${targets.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
