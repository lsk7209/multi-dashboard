import { describe, expect, it } from "vitest";
import { buildOpsTriageReportFromIntel } from "./update-ops-triage.js";

describe("update-ops-triage", () => {
  it("builds triage from direct ops intel instead of gmail digest", () => {
    const report = buildOpsTriageReportFromIntel({
      generatedAt: "2026-07-08T00:00:00.000Z",
      source: "direct",
      owner: "lsk7209",
      collection: {
        githubActions: { status: "skipped", detail: "Token unavailable.", count: 0 },
      },
      findings: [
        {
          id: "adsense-yesa",
          kind: "adsense",
          severity: "high",
          priority: 80,
          site: "yesa.kr",
          sourceLine: "direct:dashboard site=yesa.kr kind=adsense status=policy",
          title: "yesa.kr: AdSense direct collector signal policy",
          recommendedAction: "Verify AdSense direct evidence.",
        },
        {
          id: "ga4-todaypharm",
          kind: "ga4",
          severity: "medium",
          priority: 50,
          site: "todaypharm.kr",
          sourceLine: "direct:dashboard site=todaypharm.kr kind=ga4 status=api_error",
          title: "todaypharm.kr: GA4 direct collector signal api_error",
          recommendedAction: "Verify GA4 direct evidence.",
        },
      ],
    });

    expect(report.source).toBe("direct");
    expect(report.sourcePath).toBe("test://ops-intel");
    expect(report.digestUrl).toBeNull();
    expect(report.collection).toEqual({
      githubActions: { status: "skipped", detail: "Token unavailable.", count: 0 },
    });
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
