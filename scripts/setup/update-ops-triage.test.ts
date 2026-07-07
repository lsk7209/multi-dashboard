import { describe, expect, it } from "vitest";
import { buildOpsTriageReport } from "./update-ops-triage.js";

describe("update-ops-triage", () => {
  it("parses site-related AdSense and GA4 digest alerts", () => {
    const report = buildOpsTriageReport(
      [
        "# Gmail Digest",
        "",
        "- `10:00` [AdSense] yesa.kr policy issue needs attention",
        "- `10:01` [GA4] todaypharm.kr data collection stopped",
      ].join("\n"),
    );

    expect(report.counts.adsense).toBe(1);
    expect(report.counts.ga4).toBe(1);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "adsense",
          site: "yesa.kr",
          severity: "high",
        }),
        expect.objectContaining({
          kind: "ga4",
          site: "todaypharm.kr",
          severity: "medium",
        }),
      ]),
    );
  });
});
