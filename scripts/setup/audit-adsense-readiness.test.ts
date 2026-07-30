import { describe, expect, it } from "vitest";
import {
  buildReadinessSampleUrls,
  isAdsenseLoaderRequiredForPage,
} from "./audit-adsense-readiness.js";

const readerScopedSite = {
  id: "reader-scoped",
  enabled: true,
  platform: "static" as const,
  url: "https://example.com/",
  monetization: true,
  adsenseSampleUrls: ["https://example.com/articles/reader-guide"],
};

describe("reader-scoped AdSense readiness", () => {
  it("prioritizes configured reader samples before discovered sitemap pages", () => {
    expect(
      buildReadinessSampleUrls(
        readerScopedSite,
        ["https://example.com/blog", "https://example.com/articles/other"],
        4,
      ),
    ).toEqual([
      "https://example.com/",
      "https://example.com/articles/reader-guide",
      "https://example.com/blog",
      "https://example.com/articles/other",
    ]);
  });

  it("requires the loader on configured reader samples, not the homepage", () => {
    expect(
      isAdsenseLoaderRequiredForPage(readerScopedSite, "https://example.com/"),
    ).toBe(false);
    expect(
      isAdsenseLoaderRequiredForPage(
        readerScopedSite,
        "https://example.com/articles/reader-guide/",
      ),
    ).toBe(true);
  });
});
