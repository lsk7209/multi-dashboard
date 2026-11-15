import { describe, expect, it, vi } from "vitest";
import type { BetaAnalyticsDataClient } from "@google-analytics/data";
import {
  fetchGa4Metrics,
  fetchPreviousGa4Metrics,
  fetchGa4TrafficBreakdown,
  fetchGa4TrafficKeywords,
} from "./update-ga4-stats.js";

const coinyoFilter = {
  filter: {
    fieldName: "hostName",
    inListFilter: {
      values: ["coinyo.kr", "www.coinyo.kr"],
      caseSensitive: false,
    },
  },
};

function mockClient() {
  const runReport = vi.fn(async (request: { dimensionFilter?: unknown; dateRanges: Array<{ startDate: string; endDate: string }> }) => {
    // A shared property contains 10 coinyo users and 89 migration-host users.
    const users = request.dimensionFilter ? 10 : 99;
    return [{ rows: [{ metricValues: [
      { value: String(users) },
      { value: "15" },
      { value: "20" },
      { value: "25" },
    ] }] }];
  });
  return { client: { runReport } as unknown as BetaAnalyticsDataClient, runReport };
}

async function requestAllGa4Paths(client: BetaAnalyticsDataClient, siteUrl: string) {
  const daily = await fetchGa4Metrics(client, "536352221", 1, siteUrl);
  await fetchGa4Metrics(client, "536352221", 7, siteUrl);
  await fetchGa4Metrics(client, "536352221", 14, siteUrl);
  await fetchGa4Metrics(client, "536352221", 30, siteUrl);
  await fetchPreviousGa4Metrics(client, "536352221", siteUrl);
  await fetchGa4TrafficKeywords(client, "536352221", 7, siteUrl);
  await fetchGa4TrafficBreakdown(client, "536352221", "sourceMedium", siteUrl);
  await fetchGa4TrafficBreakdown(client, "536352221", "landingPage", siteUrl);
  return daily;
}

describe("coinyo GA4 hostname isolation", () => {
  it("rejects an omitted site URL before any GA4 request", async () => {
    const { client, runReport } = mockClient();

    // @ts-expect-error The URL is intentionally omitted to check the runtime boundary.
    await expect(fetchGa4Metrics(client, "536352221", 1)).rejects.toThrow();
    // @ts-expect-error The URL is intentionally omitted to check the runtime boundary.
    await expect(fetchPreviousGa4Metrics(client, "536352221")).rejects.toThrow();
    // @ts-expect-error The URL is intentionally omitted to check the runtime boundary.
    await expect(fetchGa4TrafficKeywords(client, "536352221", 7)).rejects.toThrow();
    // @ts-expect-error The URL is intentionally omitted to check the runtime boundary.
    await expect(fetchGa4TrafficBreakdown(client, "536352221", "sourceMedium")).rejects.toThrow();
    expect(runReport).not.toHaveBeenCalled();
  });

  it.each(["", "not-a-url"])(
    "rejects malformed site URL %j before any GA4 request",
    async (siteUrl) => {
      const { client, runReport } = mockClient();
      await expect(fetchGa4Metrics(client, "536352221", 1, siteUrl)).rejects.toThrow();
      await expect(fetchPreviousGa4Metrics(client, "536352221", siteUrl)).rejects.toThrow();
      await expect(fetchGa4TrafficKeywords(client, "536352221", 7, siteUrl)).rejects.toThrow();
      await expect(fetchGa4TrafficBreakdown(client, "536352221", "sourceMedium", siteUrl)).rejects.toThrow();
      expect(runReport).not.toHaveBeenCalled();
    },
  );

  it.each(["https://coinyo.kr/", "https://www.coinyo.kr/"])(
    "filters every GA4 request for %s before aggregation",
    async (siteUrl) => {
      const { client, runReport } = mockClient();
      const daily = await requestAllGa4Paths(client, siteUrl);

      expect(daily.activeUsers).toBe(10);
      expect(runReport).toHaveBeenCalledTimes(10);
      for (const [request] of runReport.mock.calls) {
        expect(request).toMatchObject({
          property: "properties/536352221",
          dimensionFilter: coinyoFilter,
        });
        expect(request).not.toHaveProperty("dimensions.0.name", "hostName");
      }
      expect(runReport.mock.calls.map(([request]) => request.dateRanges[0])).toEqual([
        { startDate: "1daysAgo", endDate: "yesterday" },
        { startDate: "7daysAgo", endDate: "yesterday" },
        { startDate: "14daysAgo", endDate: "yesterday" },
        { startDate: "30daysAgo", endDate: "yesterday" },
        { startDate: "14daysAgo", endDate: "8daysAgo" },
        { startDate: "7daysAgo", endDate: "yesterday" },
        { startDate: "7daysAgo", endDate: "yesterday" },
        { startDate: "14daysAgo", endDate: "8daysAgo" },
        { startDate: "7daysAgo", endDate: "yesterday" },
        { startDate: "14daysAgo", endDate: "8daysAgo" },
      ]);
    },
  );

  it.each(["https://another.example/", "https://alt.coinyo.kr/"])(
    "keeps non-coinyo GA4 requests unfiltered for %s",
    async (siteUrl) => {
      const { client, runReport } = mockClient();
      const daily = await requestAllGa4Paths(client, siteUrl);

      expect(daily.activeUsers).toBe(99);
      expect(runReport).toHaveBeenCalledTimes(10);
      for (const [request] of runReport.mock.calls) {
        expect(request).not.toHaveProperty("dimensionFilter");
      }
    },
  );
});
