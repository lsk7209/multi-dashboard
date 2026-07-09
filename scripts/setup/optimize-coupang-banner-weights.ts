import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { createClient, type Client } from "@libsql/client";

type Row = Record<string, unknown>;

export interface AssignmentPerformance {
  assignmentId: string;
  placementId: string;
  siteKey: string;
  slotKey: string;
  creativeName: string;
  currentWeight: number;
  impressions: number;
  redirects: number;
}

export interface WeightDecision extends AssignmentPerformance {
  reason:
    | "optimized"
    | "insufficient_placement_redirects"
    | "insufficient_placement_sample"
    | "single_assignment"
    | "unchanged";
  recommendedWeight: number;
  smoothedRedirectRate: number;
}

export interface PlacementWeightPlan {
  changed: boolean;
  decisions: WeightDecision[];
  placementId: string;
  siteKey: string;
  slotKey: string;
  totalImpressions: number;
  totalRedirects: number;
}

export interface WeightOptimizerOptions {
  maxWeight: number;
  minPlacementImpressions: number;
  minPlacementRedirects: number;
  minWeight: number;
  minWeightDelta: number;
  priorImpressions: number;
  priorRedirects: number;
}

const DEFAULT_DB_PATH = "data/monetization/ad-manage.db";
const DEFAULT_LOOKBACK_DAYS = 7;
const DEFAULT_OPTIONS: WeightOptimizerOptions = {
  maxWeight: 80,
  minPlacementImpressions: 100,
  minPlacementRedirects: 3,
  minWeight: 10,
  minWeightDelta: 5,
  priorImpressions: 100,
  priorRedirects: 2,
};

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2]
      .replace(/^["']|["']$/g, "")
      .replace(/(?:\\r)?\\n$/g, "")
      .trim();
  }
}

function loadEnv(): void {
  loadEnvFile(".env.local");
  loadEnvFile(".env.vercel.local");
}

function getRemoteClient(): Client | null {
  const url = process.env.MONETIZATION_BANNER_LIBSQL_URL?.trim();
  if (!url) return null;
  const authToken = process.env.MONETIZATION_BANNER_LIBSQL_AUTH_TOKEN?.trim();
  return createClient(authToken ? { url, authToken } : { url });
}

export function buildWeightPlans(
  rows: AssignmentPerformance[],
  options: WeightOptimizerOptions = DEFAULT_OPTIONS,
): PlacementWeightPlan[] {
  const byPlacement = new Map<string, AssignmentPerformance[]>();
  for (const row of rows) {
    const current = byPlacement.get(row.placementId) ?? [];
    current.push(row);
    byPlacement.set(row.placementId, current);
  }

  return [...byPlacement.entries()]
    .map(([placementId, assignments]) => buildPlacementWeightPlan(placementId, assignments, options))
    .sort((left, right) => {
      if (left.changed !== right.changed) return left.changed ? -1 : 1;
      return right.totalImpressions - left.totalImpressions;
    });
}

function buildPlacementWeightPlan(
  placementId: string,
  assignments: AssignmentPerformance[],
  options: WeightOptimizerOptions,
): PlacementWeightPlan {
  const [first] = assignments;
  if (!first) {
    throw new Error(`No assignments for placement: ${placementId}`);
  }

  const totalImpressions = assignments.reduce((sum, item) => sum + item.impressions, 0);
  const totalRedirects = assignments.reduce((sum, item) => sum + item.redirects, 0);
  const shared = {
    placementId,
    siteKey: first.siteKey,
    slotKey: first.slotKey,
    totalImpressions,
    totalRedirects,
  };

  if (assignments.length < 2) {
    return {
      ...shared,
      changed: false,
      decisions: assignments.map((assignment) => decisionFor(assignment, assignment.currentWeight, "single_assignment", options)),
    };
  }

  if (totalImpressions < options.minPlacementImpressions) {
    return {
      ...shared,
      changed: false,
      decisions: assignments.map((assignment) =>
        decisionFor(assignment, assignment.currentWeight, "insufficient_placement_sample", options),
      ),
    };
  }

  if (totalRedirects < options.minPlacementRedirects) {
    return {
      ...shared,
      changed: false,
      decisions: assignments.map((assignment) =>
        decisionFor(assignment, assignment.currentWeight, "insufficient_placement_redirects", options),
      ),
    };
  }

  const scores = assignments.map((assignment) => smoothedRate(assignment, options));
  const weights = allocateWeights(scores, options.minWeight, options.maxWeight);
  const maxDelta = Math.max(...assignments.map((assignment, index) => Math.abs(assignment.currentWeight - weights[index]!)));
  const changed = maxDelta >= options.minWeightDelta;

  return {
    ...shared,
    changed,
    decisions: assignments.map((assignment, index) =>
      decisionFor(assignment, changed ? weights[index]! : assignment.currentWeight, changed ? "optimized" : "unchanged", options),
    ),
  };
}

function decisionFor(
  assignment: AssignmentPerformance,
  recommendedWeight: number,
  reason: WeightDecision["reason"],
  options: WeightOptimizerOptions,
): WeightDecision {
  return {
    ...assignment,
    reason,
    recommendedWeight,
    smoothedRedirectRate: smoothedRate(assignment, options),
  };
}

function smoothedRate(assignment: AssignmentPerformance, options: WeightOptimizerOptions): number {
  return (assignment.redirects + options.priorRedirects) / (assignment.impressions + options.priorImpressions);
}

function allocateWeights(scores: number[], minWeight: number, maxWeight: number): number[] {
  if (scores.length === 0) return [];
  const effectiveMin = Math.min(minWeight, Math.floor(100 / scores.length));
  const effectiveMax = Math.max(maxWeight, Math.ceil(100 / scores.length));
  const baseScores = scores.map((score) => (Number.isFinite(score) && score > 0 ? score : 1));

  const locked = new Map<number, number>();
  let unlocked = baseScores.map((_, index) => index);
  let remaining = 100;

  for (let pass = 0; pass < baseScores.length; pass += 1) {
    const scoreSum = unlocked.reduce((sum, index) => sum + baseScores[index]!, 0);
    const nextUnlocked: number[] = [];
    let changed = false;

    for (const index of unlocked) {
      const raw = (baseScores[index]! / scoreSum) * remaining;
      if (raw < effectiveMin) {
        locked.set(index, effectiveMin);
        remaining -= effectiveMin;
        changed = true;
      } else if (raw > effectiveMax) {
        locked.set(index, effectiveMax);
        remaining -= effectiveMax;
        changed = true;
      } else {
        nextUnlocked.push(index);
      }
    }

    unlocked = nextUnlocked;
    if (!changed) break;
  }

  const result = Array(scores.length).fill(0) as number[];
  for (const [index, value] of locked.entries()) {
    result[index] = value;
  }

  if (unlocked.length > 0) {
    const scoreSum = unlocked.reduce((sum, index) => sum + baseScores[index]!, 0);
    const rawValues = unlocked.map((index) => ({
      fraction: ((baseScores[index]! / scoreSum) * remaining) % 1,
      index,
      value: Math.floor((baseScores[index]! / scoreSum) * remaining),
    }));
    let roundedTotal = rawValues.reduce((sum, item) => sum + item.value, 0);
    for (const item of rawValues.sort((left, right) => right.fraction - left.fraction)) {
      if (roundedTotal >= remaining) break;
      item.value += 1;
      roundedTotal += 1;
    }
    for (const item of rawValues) {
      result[item.index] = item.value;
    }
  }

  const drift = 100 - result.reduce((sum, value) => sum + value, 0);
  if (drift !== 0) {
    const index = result.findIndex((value) => value + drift >= effectiveMin && value + drift <= effectiveMax);
    result[index === -1 ? 0 : index] += drift;
  }
  return result;
}

function cutoffIso(lookbackDays: number): string {
  return new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
}

function performanceSql(): string {
  return `
    SELECT
      a.id AS assignment_id,
      a.placement_id,
      p.site_key,
      p.slot_key,
      c.name AS creative_name,
      a.weight AS current_weight,
      COALESCE(SUM(CASE WHEN e.event_type = 'image_request' THEN 1 ELSE 0 END), 0) AS impressions,
      COALESCE(SUM(CASE WHEN e.event_type = 'click' THEN 1 ELSE 0 END), 0) AS redirects
    FROM assignments a
    JOIN placements p ON p.id = a.placement_id
    LEFT JOIN creatives c ON c.id = a.creative_id
    LEFT JOIN placement_event_ledger e ON e.assignment_id = a.id AND e.created_at >= ?
    WHERE a.status = 'active'
      AND p.status = 'active'
      AND p.slot_key = 'coupang-inline'
      AND a.id LIKE 'assignment_coupang_%_inline_%'
    GROUP BY a.id, a.placement_id, p.site_key, p.slot_key, c.name, a.weight
    ORDER BY p.site_key ASC, a.id ASC
  `;
}

function rowToPerformance(row: Row): AssignmentPerformance {
  return {
    assignmentId: asString(row.assignment_id),
    placementId: asString(row.placement_id),
    siteKey: asString(row.site_key),
    slotKey: asString(row.slot_key),
    creativeName: asString(row.creative_name),
    currentWeight: asNumber(row.current_weight),
    impressions: asNumber(row.impressions),
    redirects: asNumber(row.redirects),
  };
}

function readLocalPerformance(dbPath: string, lookbackDays: number): AssignmentPerformance[] {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    return db.prepare(performanceSql()).all(cutoffIso(lookbackDays)).map(rowToPerformance);
  } finally {
    db.close();
  }
}

async function readRemotePerformance(client: Client, lookbackDays: number): Promise<AssignmentPerformance[]> {
  const result = await client.execute({ sql: performanceSql(), args: [cutoffIso(lookbackDays)] });
  return result.rows.map((row) => rowToPerformance(row as unknown as Row));
}

function applyLocalPlans(dbPath: string, plans: PlacementWeightPlan[]): number {
  const db = new DatabaseSync(dbPath);
  const now = new Date().toISOString();
  let updated = 0;
  try {
    const update = db.prepare("UPDATE assignments SET weight = ?, updated_at = ? WHERE id = ?");
    for (const plan of plans) {
      if (!plan.changed) continue;
      for (const decision of plan.decisions) {
        update.run(decision.recommendedWeight, now, decision.assignmentId);
        updated += 1;
      }
    }
  } finally {
    db.close();
  }
  return updated;
}

async function applyRemotePlans(client: Client, plans: PlacementWeightPlan[]): Promise<number> {
  const now = new Date().toISOString();
  let updated = 0;
  for (const plan of plans) {
    if (!plan.changed) continue;
    for (const decision of plan.decisions) {
      await client.execute({
        sql: "UPDATE assignments SET weight = ?, updated_at = ? WHERE id = ?",
        args: [decision.recommendedWeight, now, decision.assignmentId],
      });
      updated += 1;
    }
  }
  return updated;
}

function parseArgs(argv: string[]): {
  apply: boolean;
  dbPath: string;
  lookbackDays: number;
  options: WeightOptimizerOptions;
  source: "local" | "remote";
} {
  const apply = argv.includes("--apply");
  const sourceArg = argv.find((arg) => arg.startsWith("--source="))?.split("=")[1];
  const lookbackDays = parsePositiveInt(argv.find((arg) => arg.startsWith("--lookback-days="))?.split("=")[1], DEFAULT_LOOKBACK_DAYS);
  const minPlacementImpressions = parsePositiveInt(
    argv.find((arg) => arg.startsWith("--min-placement-impressions="))?.split("=")[1],
    DEFAULT_OPTIONS.minPlacementImpressions,
  );
  const minWeightDelta = parsePositiveInt(
    argv.find((arg) => arg.startsWith("--min-weight-delta="))?.split("=")[1],
    DEFAULT_OPTIONS.minWeightDelta,
  );
  const minPlacementRedirects = parsePositiveInt(
    argv.find((arg) => arg.startsWith("--min-placement-redirects="))?.split("=")[1],
    DEFAULT_OPTIONS.minPlacementRedirects,
  );

  return {
    apply,
    dbPath: argv.find((arg) => arg.startsWith("--db="))?.split("=")[1] ?? DEFAULT_DB_PATH,
    lookbackDays,
    options: { ...DEFAULT_OPTIONS, minPlacementImpressions, minPlacementRedirects, minWeightDelta },
    source: sourceArg === "local" ? "local" : "remote",
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function summarizePlan(plan: PlacementWeightPlan): Record<string, unknown> {
  return {
    changed: plan.changed,
    placementId: plan.placementId,
    siteKey: plan.siteKey,
    slotKey: plan.slotKey,
    totalImpressions: plan.totalImpressions,
    totalRedirects: plan.totalRedirects,
    variants: plan.decisions.map((decision) => ({
      assignmentId: decision.assignmentId,
      creativeName: decision.creativeName,
      currentWeight: decision.currentWeight,
      impressions: decision.impressions,
      reason: decision.reason,
      recommendedWeight: decision.recommendedWeight,
      redirectRate: decision.impressions > 0 ? Number((decision.redirects / decision.impressions).toFixed(4)) : 0,
      redirects: decision.redirects,
      smoothedRedirectRate: Number(decision.smoothedRedirectRate.toFixed(4)),
    })),
  };
}

async function main(): Promise<void> {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const remoteClient = args.source === "remote" ? getRemoteClient() : null;
  if (args.source === "remote" && !remoteClient) {
    throw new Error("Remote source requested but MONETIZATION_BANNER_LIBSQL_URL is missing.");
  }

  try {
    const rows = remoteClient
      ? await readRemotePerformance(remoteClient, args.lookbackDays)
      : readLocalPerformance(args.dbPath, args.lookbackDays);
    const plans = buildWeightPlans(rows, args.options);
    const changedPlans = plans.filter((plan) => plan.changed);
    const updated = args.apply
      ? remoteClient
        ? await applyRemotePlans(remoteClient, changedPlans)
        : applyLocalPlans(args.dbPath, changedPlans)
      : 0;

    console.log(
      JSON.stringify(
        {
          apply: args.apply,
          changedPlacements: changedPlans.length,
          lookbackDays: args.lookbackDays,
          plans: plans.map(summarizePlan),
          source: remoteClient ? "remote" : "local",
          updatedAssignments: updated,
        },
        null,
        2,
      ),
    );
  } finally {
    remoteClient?.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
