import { Listr } from "listr2";
import { loadSetupEnv } from "./lib/env.js";
import { encryptSecret, makeOctokitVerified, triggerWorkflowDryRun } from "./lib/github.js";
import { markSiteStep, markStep } from "./lib/state.js";
import { withRetry } from "./lib/retry.js";
import { getErrorMessage } from "./lib/errors.js";

function parseWpPasswords(): Record<string, string> {
  const raw = process.env.WP_PASSWORDS_JSON;
  if (!raw) {
    return {};
  }

  return JSON.parse(raw) as Record<string, string>;
}

async function main(): Promise<void> {
  const env = loadSetupEnv();
  const wpPasswords = parseWpPasswords();
  const octokit = await makeOctokitVerified(env.GH_TOKEN, env.GH_OWNER, env.GH_REPO);
  const { data: publicKey } = await octokit.actions.getRepoPublicKey({ owner: env.GH_OWNER, repo: env.GH_REPO });

  await markStep("gha-secrets", "running");

  const allSecrets: Record<string, string> = {
    GCP_SA_KEY_JSON: env.GCP_SA_KEY_JSON,
    TURSO_URL: env.TURSO_URL_WRITE,
    TURSO_AUTH_TOKEN: env.TURSO_TOKEN_WRITE,
    NAVER_API_KEY: env.NAVER_API_KEY,
    BOK_API_KEY: env.BOK_API_KEY,
  };

  for (const [siteId, password] of Object.entries(wpPasswords)) {
    allSecrets[`WP_PWD_${siteId.toUpperCase().replace(/-/g, "_")}`] = password;
  }

  const tasks = new Listr(
    Object.entries(allSecrets).map(([name, value]) => ({
      title: `Secret ${name}`,
      task: async () => {
        try {
          await withRetry(async () => {
            const encryptedValue = await encryptSecret(value, publicKey.key);
            await octokit.actions.createOrUpdateRepoSecret({
              owner: env.GH_OWNER,
              repo: env.GH_REPO,
              secret_name: name,
              encrypted_value: encryptedValue,
              key_id: publicKey.key_id,
            });
          });
          await markSiteStep("gha-secrets", name, "success");
        } catch (error) {
          await markSiteStep("gha-secrets", name, "failed", getErrorMessage(error));
          throw error;
        }
      },
    })),
    { concurrent: 5, exitOnError: false },
  );

  await tasks.run();
  console.log(triggerWorkflowDryRun(env.GH_OWNER, env.GH_REPO));
  await markStep("gha-secrets", "success");
}

main().catch(async (error) => {
  await markStep("gha-secrets", "failed", getErrorMessage(error));
  console.error(error);
  process.exit(1);
});
