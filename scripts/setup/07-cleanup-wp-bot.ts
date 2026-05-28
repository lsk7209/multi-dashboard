import { Listr } from "listr2";
import { Octokit } from "@octokit/rest";
import { getWpAdmin } from "./lib/secrets.js";
import { loadGithubEnv } from "./lib/env.js";
import { loadSites } from "./lib/sites.js";
import { makeWpClient } from "./lib/wp.js";
import { markSiteStep, markStep } from "./lib/state.js";
import { getErrorMessage } from "./lib/errors.js";

const BOT_USERNAME = "dashboard-bot";

async function main(): Promise<void> {
  const targetSiteId = process.argv[2];
  const env = loadGithubEnv();
  const octokit = new Octokit({ auth: env.GH_TOKEN });
  const sites = (await loadSites()).filter(
    (site) => site.platform === "wordpress" && (!targetSiteId || site.id === targetSiteId),
  );

  await markStep("cleanup-wp", "running");

  const tasks = new Listr(
    sites.map((site) => ({
      title: `Cleanup ${site.id}`,
      task: async () => {
        const secretName = `WP_PWD_${site.id.toUpperCase().replace(/-/g, "_")}`;

        try {
          const admin = getWpAdmin(site.id);
          const wp = makeWpClient(site, { user: admin.username, password: admin.password });
          const user = await wp.findUserBySlug(BOT_USERNAME);

          if (user) {
            const passwords = await wp.listApplicationPasswords(user.id);
            for (const password of passwords) {
              await wp.deleteApplicationPassword(user.id, password.uuid);
            }
            await wp.deleteUser(user.id, { reassign: 1, force: true });
          }
        } catch (error) {
          console.warn(`WP cleanup failed for ${site.id}: ${getErrorMessage(error)}`);
        }

        try {
          await octokit.actions.deleteRepoSecret({
            owner: env.GH_OWNER,
            repo: env.GH_REPO,
            secret_name: secretName,
          });
          await markSiteStep("cleanup-wp", site.id, "success");
        } catch (error) {
          await markSiteStep("cleanup-wp", site.id, "failed", getErrorMessage(error));
          console.warn(`GHA secret delete failed for ${secretName}: ${getErrorMessage(error)}`);
        }
      },
    })),
    { concurrent: 3, exitOnError: false },
  );

  await tasks.run();
  await markStep("cleanup-wp", "success");
}

main().catch(async (error) => {
  await markStep("cleanup-wp", "failed", getErrorMessage(error));
  console.error(error);
  process.exit(1);
});
