import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

interface StatsArtifact {
  generatedAt?: unknown;
}

interface QueueItem {
  siteId?: unknown;
}

interface QueueArtifact {
  collectorSnapshot?: unknown;
  productionMutationPerformed?: unknown;
  adsenseConsoleChecked?: unknown;
  lanes?: {
    ordinary_adsense_proof?: QueueItem[];
    approved_root_subdomain_scope?: QueueItem[];
  };
}

interface ContinuationArtifact {
  generatedAt?: unknown;
  scope?: unknown;
  expectedPublisher?: unknown;
  commonLocalCollectorFinding?: unknown;
  candidates?: unknown[];
}

interface RefreshedArtifact {
  generatedAt: string;
  scope: string;
  collectorSnapshot: string;
  expectedPublisher?: unknown;
  commonLocalCollectorFinding?: unknown;
  candidates: unknown[];
  productionMutationPerformed: false;
  adsenseConsoleChecked: false;
  snapshotRefresh: {
    refreshedAt: string;
    previousCollectorSnapshot: string | null;
    method: string;
    retainedCandidateSiteIds: string[];
    prunedCandidateSiteIds: string[];
    productionMutationPerformed: false;
    adsenseConsoleChecked: false;
  };
}

export function refreshAdsenseProofSnapshot(input: {
  dataDirectory: string;
  date: string;
  now: Date;
}): { outputPath: string; artifact: RefreshedArtifact } {
  const stats = readJson<StatsArtifact>(join(input.dataDirectory, "site-stats.json"));
  const generatedAt = requireString(stats.generatedAt, "data/site-stats.json generatedAt");
  const collectorSnapshot = `data/site-stats.json generatedAt=${generatedAt}`;
  const queuePath = join(input.dataDirectory, `adsense-remediation-queue-${input.date}.json`);
  if (!existsSync(queuePath)) {
    throw new Error(`Current AdSense remediation queue is missing: ${queuePath}. Run pnpm adsense:queue first.`);
  }
  const queue = readJson<QueueArtifact>(queuePath);
  if (queue.collectorSnapshot !== collectorSnapshot) {
    throw new Error(`Current AdSense remediation queue does not match ${collectorSnapshot}. Regenerate it with pnpm adsense:queue.`);
  }
  if (queue.productionMutationPerformed !== false || queue.adsenseConsoleChecked !== false) {
    throw new Error("AdSense remediation queue must be a non-mutating, console-unchecked artifact.");
  }

  const predecessor = readLatestContinuationArtifact(input.dataDirectory);
  if (!predecessor) {
    throw new Error("No valid prior external proof continuation artifact exists; refusing to fabricate external proof.");
  }
  const activeSiteIds = activeProofSiteIds(queue);
  const candidates = Array.isArray(predecessor.artifact.candidates) ? predecessor.artifact.candidates : [];
  const retainedCandidates = candidates.filter((candidate) => activeSiteIds.has(candidateSiteId(candidate)));
  const retainedCandidateSiteIds = uniqueSiteIds(retainedCandidates);
  const prunedCandidateSiteIds = uniqueSiteIds(candidates).filter((siteId) => !activeSiteIds.has(siteId));
  const artifact: RefreshedArtifact = {
    generatedAt: input.now.toISOString(),
    scope: stringValue(predecessor.artifact.scope) || "remaining unapproved AdSense public-fetch-blocked candidates",
    collectorSnapshot,
    ...(predecessor.artifact.expectedPublisher === undefined
      ? {}
      : { expectedPublisher: predecessor.artifact.expectedPublisher }),
    ...(predecessor.artifact.commonLocalCollectorFinding === undefined
      ? {}
      : { commonLocalCollectorFinding: predecessor.artifact.commonLocalCollectorFinding }),
    candidates: retainedCandidates,
    productionMutationPerformed: false,
    adsenseConsoleChecked: false,
    snapshotRefresh: {
      refreshedAt: input.now.toISOString(),
      previousCollectorSnapshot: predecessor.collectorSnapshot,
      method: "Carried forward only prior external-proof candidates that remain in the current AdSense proof queue; no external evidence was created, upgraded, or inferred.",
      retainedCandidateSiteIds,
      prunedCandidateSiteIds,
      productionMutationPerformed: false,
      adsenseConsoleChecked: false,
    },
  };
  const outputPath = join(input.dataDirectory, `adsense-external-proof-continuation-${input.date}.json`);
  writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return { outputPath, artifact };
}

function main(): void {
  const date = seoulDate(new Date());
  const result = refreshAdsenseProofSnapshot({ dataDirectory: "data", date, now: new Date() });
  console.log(
    `Wrote ${result.outputPath}. snapshot=${result.artifact.collectorSnapshot} retained=${result.artifact.snapshotRefresh.retainedCandidateSiteIds.length} pruned=${result.artifact.snapshotRefresh.prunedCandidateSiteIds.length}`,
  );
}

function readLatestContinuationArtifact(dataDirectory: string): { artifact: ContinuationArtifact; collectorSnapshot: string | null } | undefined {
  const names = readdirSync(dataDirectory)
    .filter((name) => /^adsense-external-proof-continuation-\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort()
    .reverse();
  for (const name of names) {
    try {
      const parsed = readJson<ContinuationArtifact & { collectorSnapshot?: unknown }>(join(dataDirectory, name));
      if (!Array.isArray(parsed.candidates)) {
        continue;
      }
      return { artifact: parsed, collectorSnapshot: stringValue(parsed.collectorSnapshot) || null };
    } catch {
      // Try an older artifact; a malformed predecessor must not become proof.
    }
  }
  return undefined;
}

function activeProofSiteIds(queue: QueueArtifact): Set<string> {
  return new Set([
    ...(queue.lanes?.ordinary_adsense_proof ?? []),
    ...(queue.lanes?.approved_root_subdomain_scope ?? []),
  ].map((item) => stringValue(item.siteId)).filter(Boolean));
}

function candidateSiteId(candidate: unknown): string {
  return candidate && typeof candidate === "object"
    ? stringValue((candidate as { siteId?: unknown }).siteId)
    : "";
}

function uniqueSiteIds(candidates: unknown[]): string[] {
  return [...new Set(candidates.map(candidateSiteId).filter(Boolean))].sort();
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function requireString(value: unknown, label: string): string {
  const result = stringValue(value);
  if (!result) {
    throw new Error(`${label} is missing.`);
  }
  return result;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
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
