import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH = join(
  "data",
  "dashboard-actionability-local-evidence-token.json",
);

export interface DashboardLocalEvidenceToken {
  token: string;
  tokenHash: string;
  expiresAt: string;
}

export function createDashboardLocalEvidenceToken(
  now = new Date(),
): DashboardLocalEvidenceToken {
  const token = randomUUID();
  const tokenHash = hashDashboardLocalEvidenceToken(token);
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  mkdirSync(dirname(DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH), { recursive: true });
  writeFileSync(
    DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH,
    `${JSON.stringify({ tokenHash, expiresAt }, null, 2)}\n`,
  );
  return { token, tokenHash, expiresAt };
}

export function hasValidDashboardLocalEvidenceToken(
  token: string | undefined,
  now = new Date(),
): boolean {
  if (!token) {
    return false;
  }
  try {
    const parsed = JSON.parse(
      readFileSync(DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH, "utf8"),
    ) as { tokenHash?: unknown; expiresAt?: unknown };
    return (
      parsed.tokenHash === hashDashboardLocalEvidenceToken(token) &&
      typeof parsed.expiresAt === "string" &&
      Date.parse(parsed.expiresAt) > now.getTime()
    );
  } catch {
    return false;
  }
}

export function removeDashboardLocalEvidenceToken(): void {
  rmSync(DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH, { force: true });
}

export function hashDashboardLocalEvidenceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
