import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createDashboardLocalEvidenceToken,
  DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH,
  hashDashboardLocalEvidenceToken,
  hasValidDashboardLocalEvidenceToken,
  removeDashboardLocalEvidenceToken,
} from "./dashboard-local-evidence-token.js";

describe("dashboard-local-evidence-token", () => {
  it("creates, validates, and removes a short-lived local evidence token", () => {
    rmSync(DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH, { force: true });

    const created = createDashboardLocalEvidenceToken(
      new Date("2026-07-05T22:00:00.000Z"),
    );

    expect(typeof created.token).toBe("string");
    expect(created.token).not.toBe("");
    expect(created.tokenHash).toBe(hashDashboardLocalEvidenceToken(created.token));
    expect(created.expiresAt).toBe("2026-07-05T22:05:00.000Z");
    expect(existsSync(DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH)).toBe(true);
    expect(
      hasValidDashboardLocalEvidenceToken(
        created.token,
        new Date("2026-07-05T22:04:59.000Z"),
      ),
    ).toBe(true);

    removeDashboardLocalEvidenceToken();

    expect(existsSync(DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH)).toBe(false);
    expect(
      hasValidDashboardLocalEvidenceToken(
        created.token,
        new Date("2026-07-05T22:04:59.000Z"),
      ),
    ).toBe(false);
  });

  it("rejects missing, mismatched, expired, and malformed token files", () => {
    rmSync(DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH, { force: true });

    expect(hasValidDashboardLocalEvidenceToken(undefined)).toBe(false);
    expect(hasValidDashboardLocalEvidenceToken("token")).toBe(false);

    writeFileSync(
      DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH,
      `${JSON.stringify(
        {
          tokenHash: hashDashboardLocalEvidenceToken("expected"),
          expiresAt: "2026-07-05T22:05:00.000Z",
        },
        null,
        2,
      )}\n`,
    );
    expect(
      hasValidDashboardLocalEvidenceToken(
        "wrong",
        new Date("2026-07-05T22:04:00.000Z"),
      ),
    ).toBe(false);
    expect(
      hasValidDashboardLocalEvidenceToken(
        "expected",
        new Date("2026-07-05T22:05:00.000Z"),
      ),
    ).toBe(false);

    writeFileSync(DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH, "not-json\n");
    expect(hasValidDashboardLocalEvidenceToken("expected")).toBe(false);

    rmSync(DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH, { force: true });
  });

  it("writes only hashed token contract fields", () => {
    rmSync(DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH, { force: true });

    const created = createDashboardLocalEvidenceToken();
    const rawFile = readFileSync(DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH, "utf8");
    const parsed = JSON.parse(
      rawFile,
    ) as Record<string, unknown>;

    expect(Object.keys(parsed).sort()).toEqual(["expiresAt", "tokenHash"]);
    expect(parsed.tokenHash).toBe(created.tokenHash);
    expect(parsed.expiresAt).toBe(created.expiresAt);
    expect(rawFile).not.toContain(created.token);

    removeDashboardLocalEvidenceToken();
  });
});
