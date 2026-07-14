import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildOpsIntelReport } from "./update-ops-intel.js";

describe("update-ops-intel", () => {
  it("preserves sitemap warning details in dashboard findings", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ops-intel-"));
    const statsPath = join(dir, "site-stats.json");
    const sitesPath = join(dir, "sites.yaml");
    await writeFile(
      statsPath,
      JSON.stringify({
        generatedAt: "2026-07-10T00:00:00.000Z",
        stats: [
          {
            id: "sample",
            name: "sample.com",
            sitemapWarnings: 1,
            sitemapErrors: 0,
            sitemapDetails: [
              {
                path: "https://sample.com/sitemap.xml",
                warnings: 1,
                errors: 0,
                submitted: 125,
                lastDownloaded: "2026-07-10T01:00:00.000Z",
                lastSubmitted: "2026-07-09T01:00:00.000Z",
              },
            ],
          },
        ],
      }),
      "utf8",
    );
    await writeFile(sitesPath, "sites: []\n", "utf8");

    const report = await buildOpsIntelReport({
      owner: "lsk7209",
      output: "test://ops-intel",
      statsPath,
      sitesPath,
      lookbackDays: 7,
      publicOnly: true,
    });

    expect(report.collection.dashboardArtifacts.status).toBe("ok");
    expect(report.findings).toEqual([
      expect.objectContaining({
        kind: "gsc",
        site: "sample",
        sourceLine: expect.stringContaining("https://sample.com/sitemap.xml"),
        recommendedAction: expect.stringContaining("submitted=125"),
      }),
    ]);
  });

  it("coalesces GA4 quota errors into one collector finding", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ops-intel-"));
    const statsPath = join(dir, "site-stats.json");
    const sitesPath = join(dir, "sites.yaml");
    await writeFile(
      statsPath,
      JSON.stringify({
        generatedAt: "2026-07-10T00:00:00.000Z",
        stats: [
          { id: "one", ga4Status: "api_error", ga4ErrorKind: "quota", ga4Error: "429 Too Many Requests" },
          { id: "two", ga4Status: "api_error", ga4ErrorKind: "quota", ga4Error: "429 Too Many Requests" },
          { id: "three", ga4Status: "api_error", ga4Error: "property mapping missing" },
        ],
      }),
      "utf8",
    );
    await writeFile(sitesPath, "sites: []\n", "utf8");

    const report = await buildOpsIntelReport({
      owner: "lsk7209",
      output: "test://ops-intel",
      statsPath,
      sitesPath,
      lookbackDays: 7,
      publicOnly: true,
    });

    expect(report.collection.ga4).toMatchObject({ status: "error", count: 2 });
    const ga4Findings = report.findings.filter((finding) => finding.kind === "ga4");
    expect(ga4Findings).toHaveLength(2);
    expect(ga4Findings).toContainEqual(expect.objectContaining({ site: "three" }));
    expect(ga4Findings).toContainEqual(
      expect.objectContaining({ count: 2, sourceLine: expect.stringContaining("quota_limited") }),
    );
  });

  it("coalesces a site collection timeout instead of emitting false service incidents", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ops-intel-"));
    const statsPath = join(dir, "site-stats.json");
    const sitesPath = join(dir, "sites.yaml");
    await writeFile(
      statsPath,
      JSON.stringify({
        generatedAt: "2026-07-14T00:31:37.699Z",
        stats: [
          {
            id: "discparty",
            name: "discparty.com",
            ga4Status: "ok",
            gscStatus: "ok",
            adsenseStatus: "ok",
            adsTxtStatus: "ok",
            collectionFailurePhase: "content",
            error:
              "stats:update site collection failed: site discparty timed out after 90s",
          },
        ],
      }),
      "utf8",
    );
    await writeFile(sitesPath, "sites: []\n", "utf8");

    const report = await buildOpsIntelReport({
      owner: "lsk7209",
      output: "test://ops-intel",
      statsPath,
      sitesPath,
      lookbackDays: 7,
      publicOnly: true,
    });

    expect(report.findings).toEqual([
      expect.objectContaining({
        kind: "other",
        severity: "high",
        site: "discparty",
        sourceLine: expect.stringContaining("status=collection_timeout"),
        recommendedAction: expect.stringContaining("content endpoint"),
      }),
    ]);
  });

  it("keeps a non-content timeout attributable to the failing service", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ops-intel-"));
    const statsPath = join(dir, "site-stats.json");
    const sitesPath = join(dir, "sites.yaml");
    await writeFile(
      statsPath,
      JSON.stringify({
        generatedAt: "2026-07-14T00:31:37.699Z",
        stats: [{
          id: "ga4-timeout",
          ga4Status: "api_error",
          gscStatus: "ok",
          collectionFailurePhase: "ga4",
          error: "stats:update site collection failed: site ga4-timeout timed out after 90s",
        }],
      }),
      "utf8",
    );
    await writeFile(sitesPath, "sites: []\n", "utf8");

    const report = await buildOpsIntelReport({
      owner: "lsk7209", output: "test://ops-intel", statsPath, sitesPath, lookbackDays: 7, publicOnly: true,
    });

    expect(report.findings).toEqual([
      expect.objectContaining({
        kind: "ga4",
        site: "ga4-timeout",
        sourceLine: expect.stringContaining("status=api_error"),
      }),
    ]);
  });
});
