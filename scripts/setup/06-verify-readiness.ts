import { appendFile } from "node:fs/promises";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { google } from "googleapis";
import { Listr } from "listr2";
import { loadSetupEnv } from "./lib/env.js";
import { makeGoogleAuth } from "./lib/gcp.js";
import { loadEnabledSites } from "./lib/sites.js";
import { getWpAdmin, loadLocalSecrets } from "./lib/secrets.js";
import { makeWpClient } from "./lib/wp.js";
import { markSiteStep, markStep } from "./lib/state.js";
import { compactError, getErrorMessage } from "./lib/errors.js";

type CheckName = "gsc" | "ga4" | "adsense" | "wp";
type CheckResult = Record<CheckName, string>;

const dryRun = process.argv.includes("--dry-run");

async function appendLog(message: string): Promise<void> {
  await appendFile("setup.log", `${new Date().toISOString()} ${message}\n`);
}

async function checkApi(
  apiName: Exclude<CheckName, "wp">,
  site: Awaited<ReturnType<typeof loadEnabledSites>>[number],
  clients: {
    searchConsole: ReturnType<typeof google.webmasters>;
    analyticsData: BetaAnalyticsDataClient;
  },
): Promise<void> {
  if (dryRun) {
    return;
  }

  if (apiName === "gsc") {
    const siteUrl = site.gscSiteUrl ?? site.url;
    await clients.searchConsole.sites.get({ siteUrl });
    return;
  }

  if (apiName === "ga4") {
    if (!site.ga4PropertyId) {
      throw new Error("Missing ga4PropertyId");
    }

    await clients.analyticsData.runReport({
      property: `properties/${site.ga4PropertyId}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      metrics: [{ name: "activeUsers" }],
    });
    return;
  }

  const adsTxtUrl = new URL("/ads.txt", site.url).toString();
  const response = await fetch(adsTxtUrl);
  if (!response.ok) {
    throw new Error(`ads.txt unavailable: ${response.status}`);
  }

  const body = await response.text();
  if (!body.includes("google.com") || !body.includes("pub-")) {
    throw new Error("ads.txt does not include a Google publisher entry");
  }
}

async function checkWp(siteId: string): Promise<void> {
  if (dryRun) {
    return;
  }

  const admin = getWpAdmin(siteId);
  const wp = makeWpClient(
    {
      id: siteId,
      enabled: true,
      monetization: true,
      platform: "wordpress",
      url: admin.url,
      wpRestBase: `${admin.url.replace(/\/$/, "")}/wp-json/wp/v2`,
    },
    { user: admin.username, password: admin.password },
  );
  await wp.findUserBySlug("dashboard-bot");
}

function formatResult(result: CheckResult): string {
  return `gsc:${result.gsc} ga4:${result.ga4} adsense:${result.adsense} wp:${result.wp}`;
}

async function main(): Promise<void> {
  loadLocalSecrets();
  const env = dryRun ? undefined : loadSetupEnv();
  const auth = env
    ? makeGoogleAuth(env.GCP_SA_KEY_JSON, [
        "https://www.googleapis.com/auth/webmasters.readonly",
        "https://www.googleapis.com/auth/analytics.readonly",
      ])
    : undefined;
  const clients = auth
    ? {
        searchConsole: google.webmasters({ version: "v3", auth }),
        analyticsData: new BetaAnalyticsDataClient({ auth }),
      }
    : undefined;
  const sites = await loadEnabledSites();

  await markStep("verify", "running");

  const tasks = new Listr(
    sites.map((site) => ({
      title: site.id,
      task: async (ctx, task) => {
        const result: CheckResult = {
          gsc: "-",
          ga4: "-",
          adsense: "-",
          wp: site.platform === "wordpress" ? "-" : "n/a",
        };

        for (const apiName of ["gsc", "ga4", "adsense"] as const) {
          try {
            task.output = `Checking ${apiName}`;
            if (!clients) {
              await checkApi(apiName, site, {
                searchConsole: undefined as never,
                analyticsData: undefined as never,
              });
            } else {
              await checkApi(apiName, site, clients);
            }
            result[apiName] = "ok";
          } catch (error) {
            result[apiName] = "fail";
            await appendLog(`${site.id}/${apiName}: ${getErrorMessage(error)}`);
          }
        }

        if (site.platform === "wordpress") {
          try {
            task.output = "Checking wp";
            await checkWp(site.id);
            result.wp = "ok";
          } catch (error) {
            result.wp = "fail";
            await appendLog(`${site.id}/wp: ${getErrorMessage(error)}`);
          }
        }

        ctx[site.id] = result;
        task.title = `${site.id} - ${formatResult(result)}`;
        const failed = Object.values(result).includes("fail");
        await markSiteStep(
          "verify",
          site.id,
          failed ? "failed" : "success",
          failed ? compactError(result) : undefined,
        );
      },
    })),
    {
      concurrent: 5,
      exitOnError: false,
      rendererOptions: { collapseSubtasks: false },
    },
  );

  await tasks.run();
  await markStep("verify", "success");
}

main().catch(async (error) => {
  await markStep("verify", "failed", getErrorMessage(error));
  console.error(error);
  process.exit(1);
});
