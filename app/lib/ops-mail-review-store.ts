import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { createClient, type Client, type Row as LibsqlRow } from "@libsql/client";

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
  "Ops mail review writes are disabled in this deployment. Configure OPS_MAIL_REVIEW_LIBSQL_URL/TOKEN or OPS_MAIL_REVIEW_STATE for production edits.";
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
  if (isOpsMailLibsqlEnabled()) {
    return "Mail review edits are saved to the remote libSQL/Turso database.";
  }
  if (process.env.VERCEL && !process.env.OPS_MAIL_REVIEW_STATE) {
    return "Vercel deployment is read-only for mail review edits. Configure OPS_MAIL_REVIEW_LIBSQL_URL/TOKEN or OPS_MAIL_REVIEW_STATE for saved production edits.";
  }
  return "Mail review edits are saved to data/ops-mail-review-state.json.";
}

export async function getOpsMailReviewStateAsync(): Promise<OpsMailReviewState> {
  if (!isOpsMailLibsqlEnabled()) {
    return getOpsMailReviewState();
  }

  const client = createOpsMailLibsqlClient();
  try {
    await ensureRemoteOpsMailSchema(client);
    const result = await client.execute({
      sql: "select finding_id, status, note, updated_at from ops_mail_review_entries order by updated_at desc",
      args: [],
    });
    const entries: Record<string, OpsMailReviewEntry> = {};
    let updatedAt: string | null = null;
    for (const row of result.rows) {
      const entry = rowToOpsMailReviewEntry(row);
      if (!entry) continue;
      entries[entry.findingId] = entry;
      if (!updatedAt || entry.updatedAt > updatedAt) {
        updatedAt = entry.updatedAt;
      }
    }
    return { updatedAt, entries };
  } finally {
    client.close();
  }
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

export async function upsertOpsMailReviewEntryAsync(input: {
  findingId: string;
  status: OpsMailReviewStatus;
  note?: string;
}): Promise<OpsMailReviewState> {
  if (!isOpsMailLibsqlEnabled()) {
    return upsertOpsMailReviewEntry(input);
  }

  const findingId = cleanText(input.findingId);
  if (!findingId) {
    throw new Error("findingId is required.");
  }
  if (!REVIEW_STATUSES.has(input.status)) {
    throw new Error("Invalid mail review status.");
  }

  const updatedAt = new Date().toISOString();
  const client = createOpsMailLibsqlClient();
  try {
    await ensureRemoteOpsMailSchema(client);
    await client.execute({
      sql: [
        "insert into ops_mail_review_entries (finding_id, status, note, updated_at)",
        "values (?, ?, ?, ?)",
        "on conflict(finding_id) do update set",
        "status = excluded.status,",
        "note = excluded.note,",
        "updated_at = excluded.updated_at",
      ].join(" "),
      args: [findingId, input.status, cleanText(input.note).slice(0, 2000), updatedAt],
    });
  } finally {
    client.close();
  }

  return getOpsMailReviewStateAsync();
}

export function assertOpsMailReviewAuthorized(request: Request): void {
  const expected = getOpsMailAdminToken();
  if (!expected && process.env.VERCEL && isOpsMailLibsqlEnabled()) {
    throw new Error(OPS_MAIL_ADMIN_UNAUTHORIZED_MESSAGE);
  }
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

function getOpsMailAdminToken(): string {
  return (
    cleanText(process.env.OPS_MAIL_REVIEW_ADMIN_TOKEN) ||
    cleanText(process.env.MONETIZATION_BANNER_ADMIN_TOKEN)
  );
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
  if (process.env.VERCEL && !process.env.OPS_MAIL_REVIEW_STATE && !isOpsMailLibsqlEnabled()) {
    throw new Error(OPS_MAIL_WRITE_DISABLED_MESSAGE);
  }
}

async function ensureRemoteOpsMailSchema(client: Client): Promise<void> {
  await client.execute(`
    create table if not exists ops_mail_review_entries (
      finding_id text primary key,
      status text not null,
      note text not null default '',
      updated_at text not null
    )
  `);
}

function rowToOpsMailReviewEntry(row: LibsqlRow): OpsMailReviewEntry | null {
  const findingId = cleanText(row.finding_id);
  const status = cleanText(row.status) as OpsMailReviewStatus;
  const note = cleanText(row.note);
  const updatedAt = cleanText(row.updated_at);
  if (!findingId || !REVIEW_STATUSES.has(status) || !updatedAt) {
    return null;
  }
  return { findingId, status, note, updatedAt };
}

function getOpsMailLibsqlConfig(): { url: string; authToken?: string } | null {
  const url =
    cleanText(process.env.OPS_MAIL_REVIEW_LIBSQL_URL) ||
    cleanText(process.env.MONETIZATION_BANNER_LIBSQL_URL);
  if (!url) return null;
  const authToken =
    cleanText(process.env.OPS_MAIL_REVIEW_LIBSQL_AUTH_TOKEN) ||
    cleanText(process.env.MONETIZATION_BANNER_LIBSQL_AUTH_TOKEN);
  return authToken ? { url, authToken } : { url };
}

function isOpsMailLibsqlEnabled(): boolean {
  return getOpsMailLibsqlConfig() !== null;
}

function createOpsMailLibsqlClient(): Client {
  const config = getOpsMailLibsqlConfig();
  if (!config) throw new Error(OPS_MAIL_WRITE_DISABLED_MESSAGE);
  return createClient(config);
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
