import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export type OpsMailReviewStatus = "open" | "reviewing" | "fixed" | "ignored";

export interface OpsMailReviewEntry {
  findingId: string;
  status: OpsMailReviewStatus;
  note: string;
  updatedAt: string;
}

export interface OpsMailReviewState {
  updatedAt: string | null;
  entries: Record<string, OpsMailReviewEntry>;
}

const OPS_MAIL_WRITE_DISABLED_MESSAGE =
  "Ops mail review writes are disabled in this deployment. Configure OPS_MAIL_REVIEW_STATE to a writable path for production edits.";
const OPS_MAIL_ADMIN_UNAUTHORIZED_MESSAGE =
  "Ops mail review token is required for write actions.";
const REVIEW_STATUSES = new Set<OpsMailReviewStatus>([
  "open",
  "reviewing",
  "fixed",
  "ignored",
]);

export function getOpsMailReviewPath(): string {
  if (process.env.OPS_MAIL_REVIEW_STATE) {
    return resolve(
      /*turbopackIgnore: true*/ process.env.OPS_MAIL_REVIEW_STATE,
    );
  }
  return join(
    /*turbopackIgnore: true*/ process.cwd(),
    "data",
    "ops-mail-review-state.json",
  );
}

export function getOpsMailPersistenceNote(): string {
  if (process.env.VERCEL && !process.env.OPS_MAIL_REVIEW_STATE) {
    return "Vercel deployment is read-only for mail review edits. Configure OPS_MAIL_REVIEW_STATE on a persistent runtime for saved production edits.";
  }
  return "Mail review edits are saved to data/ops-mail-review-state.json.";
}

export function getOpsMailReviewState(): OpsMailReviewState {
  const path = getOpsMailReviewPath();
  if (!existsSync(/*turbopackIgnore: true*/ path)) {
    return { updatedAt: null, entries: {} };
  }

  try {
    const parsed = JSON.parse(
      readFileSync(/*turbopackIgnore: true*/ path, "utf8"),
    ) as Partial<OpsMailReviewState>;
    const entries = parsed.entries && typeof parsed.entries === "object"
      ? Object.fromEntries(
          Object.entries(parsed.entries).filter((entry): entry is [
            string,
            OpsMailReviewEntry,
          ] => isOpsMailReviewEntry(entry[1])),
        )
      : {};
    return {
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
      entries,
    };
  } catch {
    return { updatedAt: null, entries: {} };
  }
}

export function upsertOpsMailReviewEntry(input: {
  findingId: string;
  status: OpsMailReviewStatus;
  note?: string;
}): OpsMailReviewState {
  assertOpsMailWritable();
  const findingId = cleanText(input.findingId);
  if (!findingId) {
    throw new Error("findingId is required.");
  }
  if (!REVIEW_STATUSES.has(input.status)) {
    throw new Error("Invalid mail review status.");
  }

  const state = getOpsMailReviewState();
  const updatedAt = new Date().toISOString();
  state.updatedAt = updatedAt;
  state.entries[findingId] = {
    findingId,
    status: input.status,
    note: cleanText(input.note).slice(0, 2000),
    updatedAt,
  };
  writeOpsMailReviewState(state);
  return state;
}

export function assertOpsMailReviewAuthorized(request: Request): void {
  const expected = cleanText(process.env.OPS_MAIL_REVIEW_ADMIN_TOKEN);
  if (!expected) {
    return;
  }

  const authorization = cleanText(request.headers.get("authorization"));
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  const supplied =
    bearer || cleanText(request.headers.get("x-ops-mail-review-token"));
  if (supplied !== expected) {
    throw new Error(OPS_MAIL_ADMIN_UNAUTHORIZED_MESSAGE);
  }
}

export function isOpsMailReviewUnauthorizedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message === OPS_MAIL_ADMIN_UNAUTHORIZED_MESSAGE
  );
}

export function isOpsMailReviewWriteDisabledError(error: unknown): boolean {
  return (
    error instanceof Error && error.message === OPS_MAIL_WRITE_DISABLED_MESSAGE
  );
}

function writeOpsMailReviewState(state: OpsMailReviewState): void {
  const path = getOpsMailReviewPath();
  mkdirSync(dirname(/*turbopackIgnore: true*/ path), { recursive: true });
  writeFileSync(
    /*turbopackIgnore: true*/ path,
    `${JSON.stringify(state, null, 2)}\n`,
    "utf8",
  );
}

function assertOpsMailWritable(): void {
  if (process.env.VERCEL && !process.env.OPS_MAIL_REVIEW_STATE) {
    throw new Error(OPS_MAIL_WRITE_DISABLED_MESSAGE);
  }
}

function isOpsMailReviewEntry(value: unknown): value is OpsMailReviewEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.findingId === "string" &&
    typeof entry.status === "string" &&
    REVIEW_STATUSES.has(entry.status as OpsMailReviewStatus) &&
    typeof entry.note === "string" &&
    typeof entry.updatedAt === "string"
  );
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
