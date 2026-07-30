import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverSampleContentUrl } from "./update-ga4-stats.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("discoverSampleContentUrl", () => {
  it("uses the configured reader-content sample before sitemap discovery", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      discoverSampleContentUrl({
        id: "reader-scoped",
        enabled: true,
        platform: "static",
        url: "https://example.com/",
        monetization: true,
        adsenseSampleUrls: ["https://example.com/articles/reader-guide"],
      }),
    ).resolves.toBe("https://example.com/articles/reader-guide");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
