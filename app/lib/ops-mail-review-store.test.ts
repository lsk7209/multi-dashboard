import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "../api/ops-mail-review/route.js";

const ORIGINAL_ENV = {
  OPS_MAIL_REVIEW_ADMIN_TOKEN: process.env.OPS_MAIL_REVIEW_ADMIN_TOKEN,
  OPS_MAIL_REVIEW_STATE: process.env.OPS_MAIL_REVIEW_STATE,
  VERCEL: process.env.VERCEL,
};

let tempDir: string;

describe("ops-mail-review route", () => {
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "ops-mail-review-"));
    process.env.OPS_MAIL_REVIEW_STATE = join(tempDir, "state.json");
    delete process.env.OPS_MAIL_REVIEW_ADMIN_TOKEN;
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
    const state = (await GET().json()) as {
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
  restoreOptionalEnv("OPS_MAIL_REVIEW_ADMIN_TOKEN", ORIGINAL_ENV.OPS_MAIL_REVIEW_ADMIN_TOKEN);
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
