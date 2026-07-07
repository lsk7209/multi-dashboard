import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "../api/ops-mail-review/route.js";

const ORIGINAL_ENV = {
  MONETIZATION_BANNER_LIBSQL_AUTH_TOKEN: process.env.MONETIZATION_BANNER_LIBSQL_AUTH_TOKEN,
  MONETIZATION_BANNER_LIBSQL_URL: process.env.MONETIZATION_BANNER_LIBSQL_URL,
  OPS_MAIL_REVIEW_ADMIN_TOKEN: process.env.OPS_MAIL_REVIEW_ADMIN_TOKEN,
  OPS_MAIL_REVIEW_LIBSQL_AUTH_TOKEN: process.env.OPS_MAIL_REVIEW_LIBSQL_AUTH_TOKEN,
  OPS_MAIL_REVIEW_LIBSQL_URL: process.env.OPS_MAIL_REVIEW_LIBSQL_URL,
  OPS_MAIL_REVIEW_STATE: process.env.OPS_MAIL_REVIEW_STATE,
  VERCEL: process.env.VERCEL,
};

let tempDir: string;

describe("ops-mail-review route", () => {
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "ops-mail-review-"));
    process.env.OPS_MAIL_REVIEW_STATE = join(tempDir, "state.json");
    delete process.env.MONETIZATION_BANNER_LIBSQL_AUTH_TOKEN;
    delete process.env.MONETIZATION_BANNER_LIBSQL_URL;
    delete process.env.OPS_MAIL_REVIEW_ADMIN_TOKEN;
    delete process.env.OPS_MAIL_REVIEW_LIBSQL_AUTH_TOKEN;
    delete process.env.OPS_MAIL_REVIEW_LIBSQL_URL;
    delete process.env.VERCEL;
  });

  afterEach(() => {
    restoreEnv();
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("saves review status and note", async () => {
    const response = await POST(
      new Request("http://localhost/api/ops-mail-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          findingId: "adsense-yesa",
          status: "fixed",
          note: "ads.txt and policy evidence checked",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const getResponse = await GET();
    const state = (await getResponse.json()) as {
      entries: Record<string, { status: string; note: string }>;
    };
    expect(state.entries["adsense-yesa"]).toMatchObject({
      status: "fixed",
      note: "ads.txt and policy evidence checked",
    });
  });

  it("requires the configured write token", async () => {
    process.env.OPS_MAIL_REVIEW_ADMIN_TOKEN = "secret-token";

    const response = await POST(
      new Request("http://localhost/api/ops-mail-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          findingId: "ga4-site",
          status: "reviewing",
        }),
      }),
    );

    expect(response.status).toBe(401);
  });
});

function restoreEnv() {
  restoreOptionalEnv("MONETIZATION_BANNER_LIBSQL_AUTH_TOKEN", ORIGINAL_ENV.MONETIZATION_BANNER_LIBSQL_AUTH_TOKEN);
  restoreOptionalEnv("MONETIZATION_BANNER_LIBSQL_URL", ORIGINAL_ENV.MONETIZATION_BANNER_LIBSQL_URL);
  restoreOptionalEnv("OPS_MAIL_REVIEW_ADMIN_TOKEN", ORIGINAL_ENV.OPS_MAIL_REVIEW_ADMIN_TOKEN);
  restoreOptionalEnv("OPS_MAIL_REVIEW_LIBSQL_AUTH_TOKEN", ORIGINAL_ENV.OPS_MAIL_REVIEW_LIBSQL_AUTH_TOKEN);
  restoreOptionalEnv("OPS_MAIL_REVIEW_LIBSQL_URL", ORIGINAL_ENV.OPS_MAIL_REVIEW_LIBSQL_URL);
  restoreOptionalEnv("OPS_MAIL_REVIEW_STATE", ORIGINAL_ENV.OPS_MAIL_REVIEW_STATE);
  restoreOptionalEnv("VERCEL", ORIGINAL_ENV.VERCEL);
}

function restoreOptionalEnv(key: keyof typeof ORIGINAL_ENV, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
