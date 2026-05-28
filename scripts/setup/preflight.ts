import { loadLocalSecrets, readSecret } from "./lib/secrets.js";
import { loadSites } from "./lib/sites.js";

const REQUIRED_KEYS = [
  "GCP_SA_KEY_JSON",
  "GCP_SA_EMAIL",
  "GH_TOKEN",
  "GH_OWNER",
  "GH_REPO",
  "VERCEL_TOKEN",
  "VERCEL_PROJECT_ID",
  "TURSO_URL_WRITE",
  "TURSO_TOKEN_WRITE",
  "TURSO_URL_READ",
  "TURSO_TOKEN_READ",
  "NAVER_API_KEY",
  "BOK_API_KEY",
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "ADMIN_EMAIL_WHITELIST",
  "CRON_SECRET",
  "INTERNAL_KEY",
  "APP_URL",
] as const;

type Scope = "dashboard" | "all";

function readScope(): Scope {
  const arg = process.argv.find((item) => item.startsWith("--scope="));
  const scope = arg?.slice("--scope=".length);

  if (scope === "dashboard" || scope === "all") {
    return scope;
  }

  return "all";
}

function toEnvKey(siteId: string): string {
  return siteId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

async function main(): Promise<void> {
  loadLocalSecrets();

  const scope = readScope();
  const sites = await loadSites();
  const enabledSites = sites.filter((site) => site.enabled);
  const missing: string[] = [];

  if (scope === "all") {
    for (const key of REQUIRED_KEYS) {
      if (!readSecret(key)) {
        missing.push(key);
      }
    }
  }

  if (enabledSites.length === 0) {
    missing.push("scripts/setup/sites.yaml: at least one enabled site");
  }

  for (const site of enabledSites.filter((item) => scope === "all" && item.platform === "wordpress")) {
    const prefix = `WP_ADMIN_${toEnvKey(site.id)}`;
    for (const suffix of ["URL", "USERNAME", "PASSWORD"]) {
      const key = `${prefix}_${suffix}`;
      if (!readSecret(key)) {
        missing.push(key);
      }
    }

    if (!site.wpRestBase) {
      missing.push(`scripts/setup/sites.yaml: ${site.id}.wpRestBase`);
    }
  }

  if (missing.length > 0) {
    console.error("Preflight failed. Missing:");
    for (const item of missing.slice(0, 80)) {
      console.error(`- ${item}`);
    }
    if (missing.length > 80) {
      console.error(`- ...and ${missing.length - 80} more`);
    }
    process.exit(1);
  }

  console.log(`Preflight passed (${scope}). ${enabledSites.length} enabled site(s) ready.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
