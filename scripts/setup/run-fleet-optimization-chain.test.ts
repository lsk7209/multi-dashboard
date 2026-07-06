import { describe, expect, it } from "vitest";
import {
  buildArtifact,
  buildFleetOptimizationChainPlan,
  isReadinessBlockingRefreshFailure,
  parseCliOptions,
} from "./run-fleet-optimization-chain.js";

describe("run-fleet-optimization-chain", () => {
  it("builds the full non-mutating dashboard-to-handoff chain", () => {
    const plan = buildFleetOptimizationChainPlan({
      generatedAt: "2026-07-05T00:00:00.000Z",
      date: "2026-07-05",
      dryRun: false,
      skipStatsUpdate: false,
      skipApiDataAudit: false,
    });

    expect(plan).toMatchObject({
      productionMutationPerformed: false,
      cmsMutationPerformed: false,
      searchConsoleMutationPerformed: false,
      adsenseMutationPerformed: false,
      titleOrBodyMutationPerformed: false,
    });
    expect(plan.commands.map((command) => command.id)).toEqual([
      "stats-update",
      "gsc-permission-audit",
      "adsense-queue",
      "vercel-api-data-inventory",
      "fleet-optimize-plan",
      "t3-title-content-handoff",
    ]);
    expect(plan.commands.find((command) => command.id === "vercel-api-data-inventory")?.args).toEqual([
      "exec",
      "tsx",
      "scripts/setup/audit-vercel-api-data-sites.ts",
    ]);
    expect(plan.commands.find((command) => command.id === "fleet-optimize-plan")?.args).toEqual([
      "exec",
      "tsx",
      "scripts/setup/create-fleet-optimization-plan.ts",
      "--date=2026-07-05",
    ]);
    expect(plan.commands.find((command) => command.id === "t3-title-content-handoff")?.args).toEqual([
      "exec",
      "tsx",
      "scripts/setup/create-t3-title-content-handoff.ts",
      "--date=2026-07-05",
    ]);
  });

  it("supports a current-snapshot fast path without stats or api-data inventory", () => {
    const options = parseCliOptions([
      "--dry-run",
      "--skip-stats-update",
      "--skip-api-data-audit",
      "--date=2026-07-05",
    ]);
    const plan = buildFleetOptimizationChainPlan({
      ...options,
      generatedAt: "2026-07-05T00:00:00.000Z",
    });

    expect(options.dryRun).toBe(true);
    expect(plan.commands.map((command) => command.id)).toEqual([
      "gsc-permission-audit",
      "adsense-queue",
      "fleet-optimize-plan",
      "t3-title-content-handoff",
    ]);
  });

  it("keeps verification failures visible in the chain artifact", () => {
    const plan = buildFleetOptimizationChainPlan({
      generatedAt: "2026-07-05T00:00:00.000Z",
      date: "2026-07-05",
      dryRun: false,
      skipStatsUpdate: false,
      skipApiDataAudit: false,
    });
    const artifact = buildArtifact(
      plan,
      [
        { id: "stats-update", status: "pass", exitCode: 0, stdoutTail: "", stderrTail: "" },
        { id: "gsc-permission-audit", status: "fail", exitCode: 1, stdoutTail: "", stderrTail: "boom" },
      ],
      {
        statsSnapshot: "2026-07-05T01:00:00.000Z",
        planSnapshot: "2026-07-04T01:00:00.000Z",
        handoffSnapshot: "",
        refreshFailedSources: ["skipped_refresh_failed:gsc:auth_error:1"],
        refreshFailureCount: 1,
        refreshFailuresBlockReadiness: true,
        planMatchesStats: false,
        handoffMatchesStats: false,
        handoffMutationFlagsFalse: false,
        handoffSiteCount: 0,
        titleHandoffCount: 0,
        contentHandoffCount: 0,
      },
      "2026-07-05T01:05:00.000Z",
    );

    expect(artifact.generatedAt).toBe("2026-07-05T01:05:00.000Z");
    expect(artifact.summary).toMatchObject({ commands: 6, pass: 1, fail: 1, skipped: 4 });
    expect(artifact.results.map((result) => result.id)).toEqual([
      "stats-update",
      "gsc-permission-audit",
      "adsense-queue",
      "vercel-api-data-inventory",
      "fleet-optimize-plan",
      "t3-title-content-handoff",
    ]);
    expect(artifact.results.at(-1)).toMatchObject({
      status: "skipped",
      stdoutTail: "not run after gsc-permission-audit failed",
    });
    expect(artifact.verification.planMatchesStats).toBe(false);
    expect(artifact.verification.refreshFailuresBlockReadiness).toBe(true);
    expect(artifact.stopCondition).toContain("does not authorize CMS edits");
  });

  it("treats telemetry/config collection issues as maintenance rather than readiness blockers", () => {
    expect(isReadinessBlockingRefreshFailure("skipped_refresh_failed:ga4:missing_config:1")).toBe(false);
    expect(
      isReadinessBlockingRefreshFailure("skipped_refresh_failed:adsense_collector:transient_error:1"),
    ).toBe(false);
    expect(
      isReadinessBlockingRefreshFailure("skipped_refresh_failed:ads_txt_collector:transient_error:1"),
    ).toBe(false);
    expect(isReadinessBlockingRefreshFailure("skipped_refresh_failed:gsc:auth_error:1")).toBe(true);
    expect(isReadinessBlockingRefreshFailure("skipped_refresh_failed:sitemap:error:1")).toBe(true);
  });
});
