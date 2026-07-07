import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const JSON_PATH = join("data", "vercel-api-data-sites.json");
const MD_PATH = join("docs", "vercel-api-data-sites.md");

interface ApiDataInventory {
  generatedAt: string;
  scope: string;
  rules: string[];
  summary: Record<string, number>;
  sites: Array<Record<string, unknown>>;
  productionMutationPerformed?: false;
  cmsMutationPerformed?: false;
  searchConsoleMutationPerformed?: false;
  adsenseMutationPerformed?: false;
  titleOrBodyMutationPerformed?: false;
}

function main(): void {
  const inventory = loadExistingInventory();
  const refreshed: ApiDataInventory = {
    ...inventory,
    generatedAt: new Date().toISOString(),
    productionMutationPerformed: false,
    cmsMutationPerformed: false,
    searchConsoleMutationPerformed: false,
    adsenseMutationPerformed: false,
    titleOrBodyMutationPerformed: false,
  };

  mkdirSync("data", { recursive: true });
  mkdirSync("docs", { recursive: true });
  writeFileSync(JSON_PATH, `${JSON.stringify(refreshed, null, 2)}\n`);
  writeFileSync(MD_PATH, renderMarkdown(refreshed));

  console.log(`Wrote ${JSON_PATH}`);
  console.log(`Wrote ${MD_PATH}`);
  console.log(
    `Sites: ${refreshed.sites.length} (scheduled-db=${refreshed.summary["scheduled-db-ingestion"] ?? 0}, api-backed=${refreshed.summary["api-backed-content"] ?? 0}, candidate=${refreshed.summary["candidate-review"] ?? 0})`,
  );
}

function loadExistingInventory(): ApiDataInventory {
  if (!existsSync(JSON_PATH)) {
    return {
      generatedAt: new Date().toISOString(),
      scope:
        "WordPress excluded by default; Vercel/Next.js API-data sites included from dashboard and local evidence.",
      rules: [
        "Do not rely only on dashboard platform labels.",
        "Inventory is read-only and must not call production APIs or write databases.",
        "Run a site-specific freshness check before content generation.",
      ],
      summary: {
        total: 0,
        "scheduled-db-ingestion": 0,
        "api-backed-content": 0,
        "candidate-review": 0,
      },
      sites: [],
    };
  }

  const parsed = JSON.parse(readFileSync(JSON_PATH, "utf8")) as Partial<ApiDataInventory>;
  const sites = Array.isArray(parsed.sites) ? parsed.sites : [];
  return {
    generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : new Date().toISOString(),
    scope:
      typeof parsed.scope === "string"
        ? parsed.scope
        : "WordPress excluded by default; Vercel/Next.js API-data sites included from dashboard and local evidence.",
    rules: Array.isArray(parsed.rules) ? parsed.rules.filter((rule): rule is string => typeof rule === "string") : [],
    summary: makeSummary(sites, parsed.summary),
    sites,
  };
}

function makeSummary(
  sites: Array<Record<string, unknown>>,
  existingSummary: unknown,
): Record<string, number> {
  const existing =
    existingSummary && typeof existingSummary === "object"
      ? (existingSummary as Record<string, unknown>)
      : {};
  const summary: Record<string, number> = {
    total: sites.length,
    "scheduled-db-ingestion": 0,
    "api-backed-content": 0,
    "candidate-review": 0,
  };
  for (const site of sites) {
    const level = typeof site.evidenceLevel === "string" ? site.evidenceLevel : "candidate-review";
    summary[level] = (summary[level] ?? 0) + 1;
  }
  for (const [key, value] of Object.entries(existing)) {
    if (typeof value === "number" && Number.isFinite(value) && key !== "total") {
      summary[key] = summary[key] ?? value;
    }
  }
  return summary;
}

function renderMarkdown(inventory: ApiDataInventory): string {
  return `# Vercel/API Data Sites

- Generated at: \`${inventory.generatedAt}\`
- Scope: ${inventory.scope}
- Production mutation: \`${inventory.productionMutationPerformed}\`

## Summary

| Evidence level | Count |
|---|---:|
${Object.entries(inventory.summary)
  .map(([key, value]) => `| ${key} | ${value} |`)
  .join("\n")}

## Sites

| Site | URL | Evidence level | Recommended check |
|---|---|---|---|
${inventory.sites
  .map((site) => {
    const id = stringValue(site.id);
    const url = stringValue(site.url);
    const level = stringValue(site.evidenceLevel);
    const check = stringValue(site.recommendedCheck);
    return `| \`${id}\` | ${url} | ${level} | ${check} |`;
  })
  .join("\n")}
`;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

main();
