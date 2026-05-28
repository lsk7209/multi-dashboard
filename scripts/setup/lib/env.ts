import { z } from "zod";
import { loadLocalSecrets } from "./secrets.js";

const setupEnvSchema = z.object({
  GCP_SA_KEY_JSON: z.string().min(1),
  GCP_SA_EMAIL: z.string().email(),
  GH_TOKEN: z.string().min(1),
  GH_OWNER: z.string().min(1),
  GH_REPO: z.string().min(1),
  VERCEL_TOKEN: z.string().min(1),
  VERCEL_PROJECT_ID: z.string().min(1),
  TURSO_URL_WRITE: z.string().min(1),
  TURSO_TOKEN_WRITE: z.string().min(1),
  TURSO_URL_READ: z.string().min(1),
  TURSO_TOKEN_READ: z.string().min(1),
  NAVER_API_KEY: z.string().min(1),
  BOK_API_KEY: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  ADMIN_EMAIL_WHITELIST: z.string().min(1),
  CRON_SECRET: z.string().min(32),
  INTERNAL_KEY: z.string().min(32),
  APP_URL: z.string().url(),
});

export type SetupEnv = z.infer<typeof setupEnvSchema>;

export function loadSetupEnv(): SetupEnv {
  loadLocalSecrets();
  return setupEnvSchema.parse(process.env);
}

export function loadGithubEnv(): Pick<SetupEnv, "GH_TOKEN" | "GH_OWNER" | "GH_REPO"> {
  loadLocalSecrets();
  return setupEnvSchema.pick({ GH_TOKEN: true, GH_OWNER: true, GH_REPO: true }).parse(process.env);
}
