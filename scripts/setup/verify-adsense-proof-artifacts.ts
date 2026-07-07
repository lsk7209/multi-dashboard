import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = "data";

interface StatsArtifact {
  generatedAt?: unknown;
}

interface QueueArtifact {
  collectorSnapshot?: unknown;
  productionMutationPerformed?: unknown;
  lanes?: Record<string, unknown[]>;
  summary?: {
    problemRows?: unknown;
    ordinaryAdsenseProof?: unknown;
    approvedRootSubdomainScope?: unknown;
  };
}

interface ProofGateArtifact {
  generatedAt: string;
  collectorSnapshot: string;
  productionMutationPerformed: false;
  adsenseConsoleChecked: false;
  verdict: "ready_for_console_review" | "do_not_submit";
  readiness: {
    technicalReadiness: string;
    consoleReadiness: string;
    scopeReadiness: string;
    telemetryReadiness: string;
  };
  blockers: Array<{
    code: string;
    severity: "blocking" | "maintenance";
    count: number;
    siteIds: string[];
    requiredAction: string;
  }>;
  summary: Record<string, number>;
  stopCondition: string;
}

function main(): void {
  const stats = readJson<StatsArtifact>(join(DATA_DIR, "site-stats.json"));
  const snapshot = requireString(stats.generatedAt, "data/site-stats.json generatedAt");
  const date = seoulDate(new Date());
  const queuePath = join(DATA_DIR, `adsense-remediation-queue-${date}.json`);
  const queue = existsSync(queuePath) ? readJson<QueueArtifact>(queuePath) : undefined;
  const expectedCollectorSnapshot = `data/site-stats.json generatedAt=${snapshot}`;
  const blockers = buildBlockers(queue, expectedCollectorSnapshot);
  const gate: ProofGateArtifact = {
    generatedAt: new Date().toISOString(),
    collectorSnapshot: expectedCollectorSnapshot,
    productionMutationPerformed: false,
    adsenseConsoleChecked: false,
    verdict: blockers.some((blocker) => blocker.severity === "blocking")
      ? "do_not_submit"
      : "ready_for_console_review",
    readiness: {
      technicalReadiness: blockers.length === 0 ? "ready" : "needs_attention",
      consoleReadiness: "not_checked",
      scopeReadiness: blockers.length === 0 ? "no_active_scope_blocker" : "review_required",
      telemetryReadiness: blockers.length === 0 ? "clean" : "review_required",
    },
    blockers,
    summary: {
      externalProof: 0,
      localSupplement: 0,
      livePublic: 0,
      endpointRetryResultCount: 0,
      endpointRetry: 0,
      loaderRetry: 0,
      hostingEndpointPacket: 0,
      hostingLoaderPacket: 0,
      hostingLoaderResult: 0,
      consoleState: 0,
      networkVantage: 0,
      remediationQueue: numberValue(queue?.summary?.problemRows),
      checkedActions: numberValue(queue?.summary?.ordinaryAdsenseProof) +
        numberValue(queue?.summary?.approvedRootSubdomainScope),
    },
    stopCondition:
      "This verifier is local and non-mutating. It confirms the current AdSense queue/proof state only; it does not submit AdSense reviews or edit production sites.",
  };

  const outputPath = join(DATA_DIR, `adsense-proof-gate-${date}.json`);
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(gate, null, 2)}\n`);

  if (gate.verdict === "do_not_submit") {
    console.error(
      `AdSense proof artifacts blocked. snapshot=${snapshot} blockers=${blockers
        .map((blocker) => `${blocker.code}:${blocker.count}`)
        .join(",")}`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    [
      "AdSense proof artifacts verified.",
      `snapshot=${snapshot}`,
      "externalProof=0",
      "localSupplement=0",
      "livePublic=0",
      "endpointRetry=0",
      "loaderRetry=0",
      "hostingEndpointPacket=0",
      "hostingLoaderPacket=0",
      "hostingLoaderResult=0",
      "consoleState=0",
      "networkVantage=0",
      `remediationQueue=${gate.summary.remediationQueue}`,
      `checkedActions=${gate.summary.checkedActions}`,
    ].join(" "),
  );
}

function buildBlockers(
  queue: QueueArtifact | undefined,
  expectedCollectorSnapshot: string,
): ProofGateArtifact["blockers"] {
  if (!queue) {
    return [
      {
        code: "missing_remediation_queue",
        severity: "blocking",
        count: 1,
        siteIds: [],
        requiredAction: "Run pnpm adsense:queue for the current dashboard snapshot.",
      },
    ];
  }
  if (queue.collectorSnapshot !== expectedCollectorSnapshot) {
    return [
      {
        code: "stale_remediation_queue",
        severity: "blocking",
        count: 1,
        siteIds: [],
        requiredAction: "Regenerate the remediation queue from the current data/site-stats.json snapshot.",
      },
    ];
  }
  if (queue.productionMutationPerformed !== false) {
    return [
      {
        code: "mutating_queue_artifact",
        severity: "blocking",
        count: 1,
        siteIds: [],
        requiredAction: "Use only non-mutating local evidence artifacts for verification.",
      },
    ];
  }

  const problemRows = numberValue(queue.summary?.problemRows);
  if (problemRows === 0) {
    return [];
  }

  return [
    {
      code: "active_adsense_queue_items",
      severity: "blocking",
      count: problemRows,
      siteIds: collectQueueSiteIds(queue),
      requiredAction: "Resolve active AdSense queue items before console review.",
    },
  ];
}

function collectQueueSiteIds(queue: QueueArtifact): string[] {
  const siteIds = new Set<string>();
  for (const lane of Object.values(queue.lanes ?? {})) {
    for (const item of lane) {
      if (item && typeof item === "object") {
        const siteId = (item as { siteId?: unknown }).siteId;
        if (typeof siteId === "string" && siteId.length > 0) {
          siteIds.add(siteId);
        }
      }
    }
  }
  return [...siteIds].sort();
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
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

function seoulDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

main();
