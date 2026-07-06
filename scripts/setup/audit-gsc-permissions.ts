import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { google } from "googleapis";
import { makeGoogleAuth } from "./lib/gcp.js";
import { loadLocalSecrets, readSecret } from "./lib/secrets.js";

const DATA_DIR = "data";
const SNAPSHOT_PATH = join(DATA_DIR, "site-stats.json");

interface StatsSnapshot {
  generatedAt?: unknown;
  stats?: StatsRow[];
}

interface StatsRow {
  id?: unknown;
  name?: unknown;
  url?: unknown;
  gscSiteUrl?: unknown;
  gscStatus?: unknown;
}

interface GscSiteEntry {
  siteUrl?: string | null;
  permissionLevel?: string | null;
}

export interface GscPermissionAuditResult {
  siteId: string;
  host: string;
  configuredGscSiteUrl: string;
  gscStatus: string;
  listedSiteUrl: string | null;
  permissionLevel: string | null;
  accessState: "owner_access" | "restricted_access" | "unverified" | "not_listed";
  requiredAction: string;
}

export interface GscPermissionAuditArtifact {
  generatedAt: string;
  collectorSnapshot: string;
  handoffStatus: "pending_external" | "pending_local_refresh" | "resolved";
  productionMutationPerformed: false;
  gscMutationPerformed: false;
  serviceAccountEmail: string | null;
  summary: {
    auditedRows: number;
    ownerAccess: number;
    restrictedAccess: number;
    unverified: number;
    notListed: number;
  };
  results: GscPermissionAuditResult[];
}

async function main(): Promise<void> {
  loadLocalSecrets();
  const keyJson = readSecret("GCP_SA_KEY_JSON");
  if (!keyJson) {
    throw new Error("Missing GCP_SA_KEY_JSON.");
  }

  const snapshot = readJson<StatsSnapshot>(SNAPSHOT_PATH);
  const generatedAt = requireString(
    snapshot.generatedAt,
    "data/site-stats.json generatedAt",
  );
  const auth = makeGoogleAuth(keyJson, [
    "https://www.googleapis.com/auth/webmasters.readonly",
  ]);
  const client = google.webmasters({ version: "v3", auth });
  const response = await client.sites.list({}, { timeout: 30000 });
  const artifact = buildGscPermissionAudit({
    snapshot,
    siteEntries: response.data.siteEntry ?? [],
    serviceAccountEmail: readServiceAccountEmail(keyJson),
  });
  const date = seoulDate(new Date());
  const outputPath = join(DATA_DIR, `gsc-permission-audit-${date}.json`);
  const markdownPath = join("docs", "work-orders", `gsc-permission-audit-${date}.md`);

  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(join("docs", "work-orders"), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(markdownPath, renderMarkdown(artifact));
  console.log(
    [
      `Wrote ${outputPath} and ${markdownPath}.`,
      `snapshot=${generatedAt}`,
      `auditedRows=${artifact.summary.auditedRows}`,
      `ownerAccess=${artifact.summary.ownerAccess}`,
      `restrictedAccess=${artifact.summary.restrictedAccess}`,
      `unverified=${artifact.summary.unverified}`,
      `notListed=${artifact.summary.notListed}`,
    ].join(" "),
  );
}

export function buildGscPermissionAudit(input: {
  snapshot: StatsSnapshot;
  siteEntries: GscSiteEntry[];
  serviceAccountEmail?: string | null;
}): GscPermissionAuditArtifact {
  const generatedAt = requireString(
    input.snapshot.generatedAt,
    "data/site-stats.json generatedAt",
  );
  const entriesBySiteUrl = new Map(
    input.siteEntries
      .filter((entry) => typeof entry.siteUrl === "string")
      .map((entry) => [entry.siteUrl as string, entry]),
  );
  const rows = (input.snapshot.stats ?? [])
    .map(toAuditRow)
    .filter((row) => row.gscStatus !== "ok")
    .filter((row) => row.host.length > 0 && row.configuredGscSiteUrl.length > 0);
  const results = rows.map((row): GscPermissionAuditResult => {
    const entry = entriesBySiteUrl.get(row.configuredGscSiteUrl);
    const permissionLevel =
      typeof entry?.permissionLevel === "string" ? entry.permissionLevel : null;
    const accessState = classifyAccessState(permissionLevel);
    return {
      ...row,
      listedSiteUrl: entry?.siteUrl ?? null,
      permissionLevel,
      accessState,
      requiredAction: requiredActionFor(accessState),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    collectorSnapshot: `data/site-stats.json generatedAt=${generatedAt}`,
    handoffStatus: summarizeHandoffStatus(results),
    productionMutationPerformed: false,
    gscMutationPerformed: false,
    serviceAccountEmail: input.serviceAccountEmail ?? null,
    summary: {
      auditedRows: results.length,
      ownerAccess: results.filter((result) => result.accessState === "owner_access")
        .length,
      restrictedAccess: results.filter(
        (result) => result.accessState === "restricted_access",
      ).length,
      unverified: results.filter((result) => result.accessState === "unverified")
        .length,
      notListed: results.filter((result) => result.accessState === "not_listed")
        .length,
    },
    results,
  };
}

export function renderMarkdown(artifact: GscPermissionAuditArtifact): string {
  const lines = [
    `# GSC Permission Audit - ${artifact.collectorSnapshot.replace("data/site-stats.json generatedAt=", "")}`,
    "",
    "This is a non-mutating permission recovery packet. It does not change Search Console, GA4, DNS, or site files.",
    "",
    "## Service Account",
    "",
    `- Email to grant or verify: \`${artifact.serviceAccountEmail ?? "unknown"}\``,
    "",
    "## Summary",
    "",
    `- Handoff status: \`${artifact.handoffStatus}\``,
    `- Snapshot: \`${artifact.collectorSnapshot}\``,
    `- Audited rows: ${artifact.summary.auditedRows}`,
    `- Owner access: ${artifact.summary.ownerAccess}`,
    `- Restricted access: ${artifact.summary.restrictedAccess}`,
    `- Unverified: ${artifact.summary.unverified}`,
    `- Not listed: ${artifact.summary.notListed}`,
    "",
    "## Required Actions",
    "",
  ];

  for (const result of artifact.results) {
    lines.push(
      `### ${result.host} (${result.siteId})`,
      "",
      `- Configured GSC property: \`${result.configuredGscSiteUrl}\``,
      `- Listed in service account view: \`${result.listedSiteUrl ?? "not_listed"}\``,
      `- Permission level: \`${result.permissionLevel ?? "not_listed"}\``,
      `- Access state: \`${result.accessState}\``,
      `- Required action: ${result.requiredAction}`,
      `- Stop condition: do not run dashboard recommendations for this site until this row disappears from a fresh \`pnpm gsc:permissions:audit\` result and \`pnpm dashboard:post-recovery\` reaches \`ready_to_act\`.`,
      "",
    );
  }

  lines.push(
    "## External Recovery Checklist",
    "",
    "1. In Search Console, open the exact configured property shown above.",
    "2. If the row is `unverified`, verify the property in Search Console or have a verified owner complete verification.",
    "3. Grant the dashboard service account owner-level access, or enough access for Search Console API metrics and sitemap reads.",
    "4. Do not change DNS, site files, CMS content, AdSense, GA4, deployments, titles, or article bodies from this packet.",
    "5. Return to this repository and run the local verification sequence below.",
    "",
    "## Verification",
    "",
    "After changing Search Console permissions, run:",
    "",
    "```powershell",
    "pnpm gsc:permissions:audit",
    "pnpm stats:update",
    "pnpm dashboard:post-recovery",
    "pnpm dashboard:artifact-integrity",
    "pnpm dashboard:acceptance data\\dashboard-verification-<YYYY-MM-DD>.json",
    "```",
    "",
    "Success condition: the fresh permission packet has no `unverified` or `not_listed` row for the target site, `data/site-stats.json` reports `gscStatus=ok`, `dashboard:post-recovery` reports `ready_to_act`, `dashboard:artifact-integrity` reports `ready=true`, and `dashboard:acceptance` reports `ready=true`.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

function summarizeHandoffStatus(
  results: GscPermissionAuditResult[],
): GscPermissionAuditArtifact["handoffStatus"] {
  if (results.length === 0) {
    return "resolved";
  }
  return results.some((result) => result.accessState !== "owner_access")
    ? "pending_external"
    : "pending_local_refresh";
}

function toAuditRow(row: StatsRow) {
  const url = typeof row.url === "string" ? row.url : "";
  const gscSiteUrl =
    typeof row.gscSiteUrl === "string" && row.gscSiteUrl.length > 0
      ? row.gscSiteUrl
      : url;
  return {
    siteId: typeof row.id === "string" ? row.id : normalizeHost(url),
    host: normalizeHost(url),
    configuredGscSiteUrl: gscSiteUrl,
    gscStatus: typeof row.gscStatus === "string" ? row.gscStatus : "unknown",
  };
}

function classifyAccessState(
  permissionLevel: string | null,
): GscPermissionAuditResult["accessState"] {
  if (!permissionLevel) {
    return "not_listed";
  }
  if (permissionLevel === "siteOwner") {
    return "owner_access";
  }
  if (permissionLevel === "siteUnverifiedUser") {
    return "unverified";
  }
  return "restricted_access";
}

function requiredActionFor(
  accessState: GscPermissionAuditResult["accessState"],
): string {
  if (accessState === "owner_access") {
    return "Re-run stats collection; current auth failure may be transient or property-specific.";
  }
  if (accessState === "restricted_access") {
    return "Grant sufficient Search Console permission to the dashboard service account, then re-run stats collection.";
  }
  if (accessState === "unverified") {
    return "Verify the Search Console property or grant owner-level access to the dashboard service account, then re-run stats collection.";
  }
  return "Add or share the configured Search Console property with the dashboard service account, then re-run stats collection.";
}

function readServiceAccountEmail(keyJson: string): string | null {
  try {
    const parsed = JSON.parse(keyJson) as { client_email?: unknown };
    return typeof parsed.client_email === "string" && parsed.client_email.length > 0
      ? parsed.client_email
      : null;
  } catch {
    return null;
  }
}

function normalizeHost(url: string): string {
  if (!url) {
    return "";
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      ?.toLowerCase() ?? "";
  }
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

function seoulDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
