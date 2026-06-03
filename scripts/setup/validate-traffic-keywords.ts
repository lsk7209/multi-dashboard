import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const INPUT_PATH = "data/traffic-keywords.json";
const EXAMPLE_PATH = "data/traffic-keywords.example.json";

interface TrafficKeywordRow {
  siteId?: string;
  url?: string;
  keyword?: string;
  source?: string;
  medium?: string;
  activeUsers?: number;
  sessions?: number;
  clicks?: number;
  impressions?: number;
}

async function main(): Promise<void> {
  const path = existsSync(INPUT_PATH) ? INPUT_PATH : EXAMPLE_PATH;
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  const rows = Array.isArray(parsed)
    ? parsed
    : (parsed as { keywords?: unknown[] }).keywords;

  if (!Array.isArray(rows)) {
    throw new Error(`${path} must be an array or an object with keywords[]`);
  }

  const errors: string[] = [];
  const sourceCounts = new Map<string, number>();
  const siteCounts = new Map<string, number>();

  rows.forEach((row, index) => {
    const item = row as TrafficKeywordRow;
    const siteKey = String(item.siteId ?? item.url ?? "").trim();
    const keyword = String(item.keyword ?? "").trim();
    const source = String(item.source ?? "").trim();

    if (!siteKey) {
      errors.push(`#${index + 1}: siteId or url is required`);
    }
    if (!keyword) {
      errors.push(`#${index + 1}: keyword is required`);
    }
    if (!source) {
      errors.push(`#${index + 1}: source is required`);
    }

    if (siteKey) {
      siteCounts.set(siteKey, (siteCounts.get(siteKey) ?? 0) + 1);
    }
    if (source) {
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
    }
  });

  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        file: path,
        rows: rows.length,
        sites: siteCounts.size,
        sources: Object.fromEntries([...sourceCounts.entries()].sort()),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
