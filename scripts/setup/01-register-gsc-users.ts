import { Listr } from "listr2";
import { loadSetupEnv } from "./lib/env.js";
import { loadEnabledSites } from "./lib/sites.js";
import { markStep, markSiteStep } from "./lib/state.js";
import { getErrorMessage } from "./lib/errors.js";

async function main(): Promise<void> {
  const env = loadSetupEnv();
  const sites = await loadEnabledSites();

  await markStep("gsc", "running");

  const tasks = new Listr(
    sites.map((site) => ({
      title: `GSC ${site.id}`,
      task: async (_ctx, task) => {
        const target = site.gscSiteUrl ?? site.url;
        task.output = `Add ${env.GCP_SA_EMAIL} to ${target}`;
        await markSiteStep("gsc", site.id, "skipped", "Manual GSC owner/user registration required.");
      },
    })),
    { concurrent: 5, exitOnError: false, rendererOptions: { collapseSubtasks: false } },
  );

  await tasks.run();
  await markStep("gsc", "success");
  console.log("GSC user registration is manual. Add the service account email shown above, then run setup:verify.");
}

main().catch(async (error) => {
  await markStep("gsc", "failed", getErrorMessage(error));
  console.error(error);
  process.exit(1);
});
