import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_RUN_TIMEOUT_MS,
  buildFailedSiteStat,
  discoverSampleContentUrl,
  findAdsenseSignal,
  resolveAdsenseMonitoringHold,
} from "./update-ga4-stats.js";

describe("stats:update run budget", () => {
  it("allows the current fleet enough time to finish by default", () => {
    expect(DEFAULT_RUN_TIMEOUT_MS).toBe(15 * 60 * 1000);
  });
});

describe("buildFailedSiteStat", () => {
  it("preserves current service telemetry when only the content phase times out", () => {
    const previous = {
      id: "discparty",
      name: "discparty.com",
      url: "https://discparty.com/",
      ga4PropertyId: "123",
      gscSiteUrl: "https://discparty.com/",
      last1Days: {},
      last7Days: {},
      previous7Days: {},
      last30Days: {},
      gscLast7Days: {},
      gscPrevious7Days: {},
      gscLast30Days: {},
      ga4Status: "api_error",
      gscStatus: "api_error",
      adsenseStatus: "api_error",
      adsTxtStatus: "api_error",
    } as Parameters<typeof buildFailedSiteStat>[1];
    const site = {
      id: "discparty",
      url: "https://discparty.com/",
    } as Parameters<typeof buildFailedSiteStat>[0];

    const current = {
      ...previous,
      last7Days: { activeUsers: 42 },
      ga4Status: "api_error",
      gscStatus: "ok",
      adsenseStatus: "api_error",
      adsTxtStatus: "ok",
      error: "GA4 denied",
      gscLastSuccessfulFetchAt: "2026-08-26T10:00:00.000Z",
    } as Parameters<typeof buildFailedSiteStat>[4];

    const result = buildFailedSiteStat(
      site,
      previous,
      "site discparty timed out after 90s",
      "content",
      current,
    );

    expect(result).toMatchObject({
      last7Days: { activeUsers: 42 },
      ga4Status: "api_error",
      gscStatus: "ok",
      adsenseStatus: "api_error",
      adsTxtStatus: "ok",
      error: "GA4 denied",
      collectionFailurePhase: "content",
    });
    expect(result.collectionFailureError).toContain(
      "site discparty timed out after 90s",
    );
  });
});

describe("findAdsenseSignal", () => {
  it("recognizes a hydrated AdSense loader", () => {
    expect(
      findAdsenseSignal(
        '<script id="adsense-loader" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3050601904412736"></script>',
      ),
    ).toBe("pagead2");
  });
});

describe("discoverSampleContentUrl", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("follows a same-site sitemap index to find a reader page", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      const body = url.endsWith("/sitemap.xml")
        ? "<sitemapindex><sitemap><loc>https://example.com/post-sitemap.xml</loc></sitemap></sitemapindex>"
        : "<urlset><url><loc>https://example.com/blog/useful-guide</loc></url></urlset>";
      return new Response(body, { status: 200 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(
      discoverSampleContentUrl({
        id: "example",
        url: "https://example.com/",
      } as Parameters<typeof discoverSampleContentUrl>[0]),
    ).resolves.toBe("https://example.com/blog/useful-guide");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not sample a sitemap entry from another site", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        "<urlset><url><loc>https://unrelated.example/blog/article</loc></url></urlset>",
        { status: 200 },
      ),
    ) as typeof fetch;

    await expect(
      discoverSampleContentUrl({
        id: "example",
        url: "https://example.com/",
      } as Parameters<typeof discoverSampleContentUrl>[0]),
    ).resolves.toBeUndefined();
  });

  it("prefers a reader page over a top-level listing page", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        "<urlset><url><loc>https://example.com/blog</loc></url><url><loc>https://example.com/blog/useful-guide</loc></url></urlset>",
        { status: 200 },
      ),
    ) as typeof fetch;

    await expect(
      discoverSampleContentUrl({
        id: "example",
        url: "https://example.com/",
      } as Parameters<typeof discoverSampleContentUrl>[0]),
    ).resolves.toBe("https://example.com/blog/useful-guide");
  });

  it("prefers a WordPress post sitemap article over category and archive URLs", async () => {
    globalThis.fetch = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith("/sitemap_index.xml")) {
        return new Response(
          "<sitemapindex><sitemap><loc>https://example.com/post-sitemap1.xml</loc></sitemap><sitemap><loc>https://example.com/category-sitemap.xml</loc></sitemap></sitemapindex>",
          { status: 200 },
        );
      }
      if (url.endsWith("/post-sitemap1.xml")) {
        return new Response(
          "<urlset><url><loc>https://example.com/blog-2/</loc></url><url><loc>https://example.com/reader-specific-guide/</loc></url></urlset>",
          { status: 200 },
        );
      }
      return new Response(
        "<urlset><url><loc>https://example.com/category/health-wellbeing/</loc></url></urlset>",
        { status: 200 },
      );
    }) as typeof fetch;

    await expect(
      discoverSampleContentUrl({
        id: "example",
        url: "https://example.com/",
        sitemapUrls: ["https://example.com/sitemap_index.xml"],
      } as Parameters<typeof discoverSampleContentUrl>[0]),
    ).resolves.toBe("https://example.com/reader-specific-guide/");
  });
});

describe("resolveAdsenseMonitoringHold", () => {
  it.each([
    ["editorial_hold", "named editor"],
    ["launch_hold", "launch, publishing, and production-data gates"],
  ] as const)("maps %s to a policy-specific collector hold", (status, message) => {
    expect(
      resolveAdsenseMonitoringHold({ adsenseMonitoring: status }),
    ).toMatchObject({
      adsenseStatus: status,
      adsenseInstallStatus: "not_detected",
      adsenseCollectorStatus: "ok",
      adsenseError: expect.stringContaining(message),
    });
  });
});
