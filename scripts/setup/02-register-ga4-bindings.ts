import { Listr } from "listr2";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { loadSetupEnv } from "./lib/env.js";
import { makeGoogleAuth } from "./lib/gcp.js";
import { loadEnabledSites } from "./lib/sites.js";
import { markStep, markSiteStep } from "./lib/state.js";
import { withRetry } from "./lib/retry.js";
import { getErrorMessage } from "./lib/errors.js";

async function main(): Promise<void> {
  const env = loadSetupEnv();
  const auth = makeGoogleAuth(env.GCP_SA_KEY_JSON, ["https://www.googleapis.com/auth/analytics.readonly"]);
  const client = new BetaAnalyticsDataClient({ auth });
  const sites = (await loadEnabledSites()).filter((site) => site.ga4PropertyId);

  await markStep("ga4", "running");

  const tasks = new Listr(
    sites.map((site) => ({
      title: `GA4 ${site.id}`,
      task: async () => {
        try {
          await withRetry(async () => {
            await client.runReport({
              property: `properties/${site.ga4PropertyId}`,
              dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
              metrics: [{ name: "activeUsers" }],
            });
          });
          await markSiteStep("ga4", site.id, "success");
        } catch (error) {
          await markSiteStep("ga4", site.id, "failed", getErrorMessage(error));
          throw error;
        }
      },
    })),
    { concurrent: 3, exitOnError: false },
  );

  await tasks.run();
  await markStep("ga4", "success");
}

main().catch(async (error) => {
  await markStep("ga4", "failed", getErrorMessage(error));
  console.error(error);
  process.exit(1);
});
