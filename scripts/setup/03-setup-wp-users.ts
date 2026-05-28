import { randomUUID } from "node:crypto";
import { Listr } from "listr2";
import { getWpAdmin, loadLocalSecrets } from "./lib/secrets.js";
import { getResumableSites, markSiteStep, markStep } from "./lib/state.js";
import { loadSites, requireWordPressRestBase, type Site } from "./lib/sites.js";
import { withRetry } from "./lib/retry.js";
import { makeWpClient } from "./lib/wp.js";
import { getErrorMessage } from "./lib/errors.js";

const BOT_USERNAME = "dashboard-bot";
const APP_PWD_NAME = "multisite-dashboard";

async function processOne(site: Site): Promise<{ password: string }> {
  const admin = getWpAdmin(site.id);
  const wp = makeWpClient(site, { user: admin.username, password: admin.password });

  return withRetry(async () => {
    let userId = (await wp.findUserBySlug(BOT_USERNAME))?.id;

    if (!userId) {
      const created = await wp.createUser({
        username: BOT_USERNAME,
        email: `dashboard-bot+${site.id}@example.com`,
        password: randomUUID(),
        roles: ["editor"],
        name: "Dashboard Bot",
      });
      userId = created.id;
    } else {
      const existing = await wp.getUser(userId);
      if (!existing.roles?.includes("editor")) {
        await wp.updateUser(userId, { roles: ["editor"] });
      }
    }

    const existingPwds = await wp.listApplicationPasswords(userId);
    for (const password of existingPwds.filter((item) => item.name === APP_PWD_NAME)) {
      await wp.deleteApplicationPassword(userId, password.uuid);
    }

    const newPwd = await wp.createApplicationPassword(userId, APP_PWD_NAME);
    const auth = Buffer.from(`${BOT_USERNAME}:${newPwd.password}`).toString("base64");
    const response = await fetch(`${requireWordPressRestBase(site)}/posts?per_page=1`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!response.ok) {
      throw new Error(`WP bot verify failed ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }

    return { password: newPwd.password };
  });
}

async function main(): Promise<void> {
  loadLocalSecrets();
  const allWp = (await loadSites()).filter((site) => site.enabled && site.platform === "wordpress");
  const resume = process.argv.includes("--resume");
  const targets = resume ? await getResumableSites("wp-users", allWp.map((site) => site.id)) : allWp.map((site) => site.id);
  const passwords: Record<string, string> = {};

  await markStep("wp-users", "running");

  const tasks = new Listr(
    allWp
      .filter((site) => targets.includes(site.id))
      .map((site) => ({
        title: `WP ${site.id}`,
        task: async () => {
          try {
            const result = await processOne(site);
            passwords[site.id] = result.password;
            await markSiteStep("wp-users", site.id, "success");
          } catch (error) {
            await markSiteStep("wp-users", site.id, "failed", getErrorMessage(error));
            throw error;
          }
        },
      })),
    { concurrent: 3, exitOnError: false },
  );

  await tasks.run();
  await markStep("wp-users", "success");
  process.stdout.write(JSON.stringify({ wpPasswords: passwords }));
}

main().catch(async (error) => {
  await markStep("wp-users", "failed", getErrorMessage(error));
  console.error(error);
  process.exit(1);
});
