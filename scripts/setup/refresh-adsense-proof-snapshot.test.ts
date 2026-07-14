import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { refreshAdsenseProofSnapshot } from "./refresh-adsense-proof-snapshot.js";

describe("refresh-adsense-proof-snapshot", () => {
  it("carries forward only active candidates without upgrading proof", () => {
    const dir = fixtureDirectory();
    try {
      writeJson(dir, "site-stats.json", { generatedAt: "2026-07-15T01:02:03.000Z" });
      writeQueue(dir, ["keep"], ["scope"]);
      writeJson(dir, "adsense-external-proof-continuation-2026-07-14.json", {
        collectorSnapshot: "data/site-stats.json generatedAt=old",
        scope: "prior scope",
        candidates: [
          { siteId: "keep", currentDecision: "live_apply_state_needed" },
          { siteId: "remove", currentDecision: "not_proven" },
          { siteId: "scope", currentDecision: "scope_check" },
        ],
      });

      const result = refreshAdsenseProofSnapshot({
        dataDirectory: dir,
        date: "2026-07-15",
        now: new Date("2026-07-15T02:00:00.000Z"),
      });

      expect(result.artifact.collectorSnapshot).toBe("data/site-stats.json generatedAt=2026-07-15T01:02:03.000Z");
      expect(result.artifact.candidates).toEqual([
        { siteId: "keep", currentDecision: "live_apply_state_needed" },
        { siteId: "scope", currentDecision: "scope_check" },
      ]);
      expect(result.artifact.snapshotRefresh).toMatchObject({
        retainedCandidateSiteIds: ["keep", "scope"],
        prunedCandidateSiteIds: ["remove"],
        productionMutationPerformed: false,
        adsenseConsoleChecked: false,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails rather than fabricating proof when the queue or predecessor is unavailable", () => {
    const dir = fixtureDirectory();
    try {
      writeJson(dir, "site-stats.json", { generatedAt: "2026-07-15T01:02:03.000Z" });
      expect(() => refreshAdsenseProofSnapshot({ dataDirectory: dir, date: "2026-07-15", now: new Date() }))
        .toThrow("Current AdSense remediation queue is missing");
      writeQueue(dir, ["keep"]);
      expect(() => refreshAdsenseProofSnapshot({ dataDirectory: dir, date: "2026-07-15", now: new Date() }))
        .toThrow("No valid prior external proof continuation artifact exists");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

function fixtureDirectory(): string {
  return mkdtempSync(join(tmpdir(), "adsense-proof-refresh-"));
}

function writeQueue(dir: string, ordinary: string[], scope: string[] = []): void {
  writeJson(dir, "adsense-remediation-queue-2026-07-15.json", {
    collectorSnapshot: "data/site-stats.json generatedAt=2026-07-15T01:02:03.000Z",
    productionMutationPerformed: false,
    adsenseConsoleChecked: false,
    lanes: {
      ordinary_adsense_proof: ordinary.map((siteId) => ({ siteId })),
      approved_root_subdomain_scope: scope.map((siteId) => ({ siteId })),
    },
  });
}

function writeJson(dir: string, name: string, value: unknown): void {
  writeFileSync(join(dir, name), `${JSON.stringify(value, null, 2)}\n`);
}
