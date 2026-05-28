import { Listr } from "listr2";
import { loadSetupEnv } from "./lib/env.js";
import { VercelClient } from "./lib/vercel.js";
import { markSiteStep, markStep } from "./lib/state.js";
import { withRetry } from "./lib/retry.js";
import { getErrorMessage } from "./lib/errors.js";

async function main(): Promise<void> {
  const env = loadSetupEnv();
  const client = new VercelClient(env.VERCEL_TOKEN, env.VERCEL_PROJECT_ID);

  await markStep("vercel", "running");

  const envs: Record<string, string> = {
    TURSO_URL_WRITE: env.TURSO_URL_WRITE,
    TURSO_TOKEN_WRITE: env.TURSO_TOKEN_WRITE,
    TURSO_URL_READ: env.TURSO_URL_READ,
    TURSO_TOKEN_READ: env.TURSO_TOKEN_READ,
    NAVER_API_KEY: env.NAVER_API_KEY,
    BOK_API_KEY: env.BOK_API_KEY,
    AUTH_SECRET: env.AUTH_SECRET,
    AUTH_GOOGLE_ID: env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: env.AUTH_GOOGLE_SECRET,
    ADMIN_EMAIL_WHITELIST: env.ADMIN_EMAIL_WHITELIST,
    CRON_SECRET: env.CRON_SECRET,
    INTERNAL_KEY: env.INTERNAL_KEY,
    APP_URL: env.APP_URL,
  };

  const tasks = new Listr(
    Object.entries(envs).map(([key, value]) => ({
      title: `Vercel env ${key}`,
      task: async () => {
        try {
          await withRetry(() => client.upsertEnv({ key, value }));
          await markSiteStep("vercel", key, "success");
        } catch (error) {
          await markSiteStep("vercel", key, "failed", getErrorMessage(error));
          throw error;
        }
      },
    })),
    { concurrent: 3, exitOnError: false },
  );

  await tasks.run();
  await markStep("vercel", "success");
}

main().catch(async (error) => {
  await markStep("vercel", "failed", getErrorMessage(error));
  console.error(error);
  process.exit(1);
});
