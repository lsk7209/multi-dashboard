import { join } from "node:path";

const SAFE_FILENAME_SEGMENT = /[^a-z0-9-]+/gi;

export function getGscPageQueryOutputPath(dataDir: string, date: string, targets: string[]): string {
  const targetLabel = targets
    .map((target) => target.trim().replace(SAFE_FILENAME_SEGMENT, "-"))
    .filter(Boolean)
    .join("-");

  if (!targetLabel) {
    throw new Error("At least one GSC target is required to build an output path.");
  }

  return join(dataDir, `gsc-page-query-opportunities-${date}-${targetLabel}.json`);
}
