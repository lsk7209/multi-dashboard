import { Listr } from "listr2";
import { loadSites } from "./lib/sites.js";
import { markStep } from "./lib/state.js";
import { getErrorMessage } from "./lib/errors.js";

function readSiteId(): string {
  const idArg = process.argv.find((arg) => arg.startsWith("--id="));
  const id = idArg?.slice("--id=".length) ?? process.argv[2];

  if (!id) {
    throw new Error("Usage: pnpm setup:add-site --id=<siteId>");
  }

  return id;
}

async function main(): Promise<void> {
  const siteId = readSiteId();
  const site = (await loadSites()).find((item) => item.id === siteId);

  if (!site) {
    throw new Error(`Site ${siteId} not found in scripts/setup/sites.yaml`);
  }

  await markStep(`add-site:${siteId}`, "running");

  const tasks = new Listr([
    {
      title: "Validate site config",
      task: async () => {
        if (site.platform === "wordpress" && !site.wpRestBase) {
          throw new Error(`WordPress site ${siteId} needs wpRestBase`);
        }
      },
    },
    {
      title: "Next steps",
      task: async () => {
        console.log(`Run setup:wp, setup:gha, setup:vercel, and setup:verify for ${siteId}.`);
      },
    },
  ]);

  await tasks.run();
  await markStep(`add-site:${siteId}`, "success");
}

main().catch(async (error) => {
  const siteId = process.argv[2] ?? "unknown";
  await markStep(`add-site:${siteId}`, "failed", getErrorMessage(error));
  console.error(error);
  process.exit(1);
});
