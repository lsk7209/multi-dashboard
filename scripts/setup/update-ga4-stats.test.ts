import { describe, expect, it } from "vitest";
import { buildFailedSiteStat, findAdsenseSignal } from "./update-ga4-stats.js";

describe("buildFailedSiteStat", () => {
  it("preserves completed service telemetry when only the content phase times out", () => {
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

    const result = buildFailedSiteStat(
      site,
      previous,
      "site discparty timed out after 90s",
      "content",
    );

    expect(result).toMatchObject({
      ga4Status: "ok",
      gscStatus: "ok",
      adsenseStatus: "ok",
      adsTxtStatus: "ok",
      adsenseCollectorStatus: "ok",
      adsTxtCollectorStatus: "ok",
      collectionFailurePhase: "content",
    });
    expect(result.error).toContain("site discparty timed out after 90s");
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
