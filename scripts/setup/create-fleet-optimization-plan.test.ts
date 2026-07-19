import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildRefreshFailedSources,
  currentArtifactPath,
  summarizeConnectorStatus,
} from "./create-fleet-optimization-plan.js";

describe("create-fleet-optimization-plan dashboard evidence", () => {
  it("records actual connector failures instead of a hard-coded refresh timeout", () => {
    const rows = [
      row(),
      row({ ga4Status: "missing_config" }),
      row({ gscStatus: "auth_error" }),
      row({
        adsenseStatus: "api_error",
        adsenseCollectorStatus: "transient_error",
      }),
      row({ monetization: false }),
    ];

    expect(buildRefreshFailedSources(rows)).toEqual([
      "skipped_refresh_failed:ga4:missing_config:1",
      "skipped_refresh_failed:gsc:auth_error:1",
      "skipped_refresh_failed:adsense:api_error:1",
      "skipped_refresh_failed:adsense_collector:transient_error:1",
    ]);
  });

  it("records a readiness-blocking source when the current AdSense queue artifact is missing", () => {
    expect(buildRefreshFailedSources([row()], { adsenseQueueMissing: true })).toContain(
      "skipped_refresh_failed:adsense_queue:missing_current:1",
    );
    expect(
      buildRefreshFailedSources([row({ monetization: false })], { adsenseQueueMissing: true }),
    ).not.toContain("skipped_refresh_failed:adsense_queue:missing_current:1");
  });

  it("does not mistake a site-level sitemap finding for a dashboard refresh failure", () => {
    expect(buildRefreshFailedSources([row({ sitemapErrors: 1 })])).toEqual([]);
  });

  it("summarizes connector statuses and treats non-monetized rows as disabled", () => {
    const summary = summarizeConnectorStatus([
      row(),
      row({ monetization: false }),
    ]);

    expect(summary.adsenseStatus).toMatchObject({ ok: 1, disabled: 1 });
    expect(summary.adsTxtStatus).toMatchObject({ ok: 1, disabled: 1 });
    expect(summary.ga4Status).toMatchObject({ ok: 2 });
  });

  it("uses only remediation queue artifacts from the current stats snapshot", () => {
    const dir = mkdtempSync(join(tmpdir(), "fleet-plan-"));
    const currentSnapshot = "data/site-stats.json generatedAt=2026-07-05T08:58:06.464Z";
    try {
      writeArtifact(dir, "adsense-remediation-queue-2026-07-04.json", {
        collectorSnapshot: "data/site-stats.json generatedAt=2026-07-04T23:35:58.534Z",
      });
      writeArtifact(dir, "adsense-remediation-queue-2026-07-05.json", {
        collectorSnapshot: currentSnapshot,
      });

      expect(
        currentArtifactPath(dir, "adsense-remediation-queue-", currentSnapshot),
      ).toBe(join(dir, "adsense-remediation-queue-2026-07-05.json"));
      expect(
        currentArtifactPath(
          dir,
          "adsense-remediation-queue-",
          "data/site-stats.json generatedAt=missing",
        ),
      ).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

function row(overrides: Record<string, unknown> = {}) {
  return {
    ga4Status: "ok",
    gscStatus: "ok",
    adsenseStatus: "ok",
    adsenseCollectorStatus: "ok",
    adsTxtStatus: "ok",
    adsTxtCollectorStatus: "ok",
    sitemapErrors: 0,
    ...overrides,
  };
}

function writeArtifact(dir: string, name: string, artifact: Record<string, unknown>) {
  writeFileSync(join(dir, name), `${JSON.stringify(artifact)}\n`);
}
