import { describe, expect, it } from "vitest";
import { buildApiDataFreshnessReport, renderApiDataFreshnessMarkdown } from "./check-vercel-api-data-freshness.js";

describe("buildApiDataFreshnessReport", () => {
  it("does not promote unmeasured source data into content work", () => {
    const report = buildApiDataFreshnessReport({ generatedAt: "2026-07-12T00:00:00.000Z", sites: [
      { id: "scheduled", url: "https://scheduled.example/", evidenceLevel: "scheduled-db-ingestion", collectionScripts: ["sync.ts"], recommendedCheck: "Read the DB timestamp." },
      { id: "api", url: "https://api.example/", evidenceLevel: "api-backed-content" },
      { id: "candidate", url: "https://candidate.example/", evidenceLevel: "candidate-review" },
    ] }, { generatedAt: "2026-07-12T00:01:00.000Z", stats: [
      { id: "scheduled", ga4Status: "ok", gscStatus: "ok" }, { id: "api", ga4Status: "ok", gscStatus: "ok" }, { id: "candidate", ga4Status: "ok", gscStatus: "ok" },
    ] }, "2026-07-12T00:02:00.000Z");
    expect(report.sourceDataMeasurement).toBe("not_collected");
    expect(report.summary).toMatchObject({ total: 3, sourceDataMeasured: 0, site_probe_required: 1, source_check_required: 1, manual_review: 1 });
    expect(report.sites.map((site) => site.decision)).toEqual(["site_probe_required", "source_check_required", "manual_review"]);
  });

  it("blocks incomplete dashboard evidence before a source-data conclusion", () => {
    const report = buildApiDataFreshnessReport({ generatedAt: "2026-07-12T00:00:00.000Z", sites: [{ id: "blocked", url: "https://blocked.example/", evidenceLevel: "scheduled-db-ingestion" }] }, { generatedAt: "2026-07-12T00:01:00.000Z", stats: [{ id: "blocked", ga4Status: "api_error", gscStatus: "ok" }] }, "2026-07-12T00:02:00.000Z");
    expect(report.sites[0]).toMatchObject({ decision: "dashboard_evidence_blocked", sourceDataMeasured: false });
    expect(renderApiDataFreshnessMarkdown(report)).toContain("dashboard_evidence_blocked");
  });
});
