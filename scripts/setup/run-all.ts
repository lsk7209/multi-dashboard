import { execFileSync } from "node:child_process";
import { Listr } from "listr2";
import { loadState } from "./lib/state.js";
import { getErrorMessage } from "./lib/errors.js";

interface RunContext {
  wpPasswords?: Record<string, string>;
}

function runTsx(script: string, options?: { env?: Record<string, string>; capture?: boolean }): string {
  const output = execFileSync("tsx", [script], {
    encoding: "utf8",
    stdio: options?.capture ? "pipe" : "inherit",
    env: { ...process.env, ...(options?.env ?? {}) },
  });

  return output ?? "";
}

function parseLastJsonObject(output: string): Record<string, unknown> {
  const match = output.match(/\{[\s\S]*\}\s*$/);
  if (!match) {
    throw new Error("Could not find JSON payload in setup:wp output.");
  }

  return JSON.parse(match[0]) as Record<string, unknown>;
}

async function main(): Promise<void> {
  const resume = process.argv.includes("--resume");
  const state = await loadState();
  const stepDone = (id: string): boolean => resume && state.steps[id]?.status === "success";

  const tasks = new Listr<RunContext>(
    [
      {
        title: "Preflight",
        task: async () => {
          runTsx("scripts/setup/preflight.ts");
        },
      },
      {
        title: "GSC verify reminder",
        skip: () => (stepDone("gsc") ? "already done" : false),
        task: async () => {
          runTsx("scripts/setup/01-register-gsc-users.ts");
        },
      },
      {
        title: "GA4 binding",
        skip: () => (stepDone("ga4") ? "already done" : false),
        task: async () => {
          runTsx("scripts/setup/02-register-ga4-bindings.ts");
        },
      },
      {
        title: "WP users + App Password",
        skip: () => (stepDone("wp-users") ? "already done" : false),
        task: async (ctx) => {
          const args = resume ? ["scripts/setup/03-setup-wp-users.ts", "--resume"] : ["scripts/setup/03-setup-wp-users.ts"];
          const out = execFileSync("tsx", args, { encoding: "utf8" });
          const parsed = parseLastJsonObject(out);
          ctx.wpPasswords = parsed.wpPasswords as Record<string, string>;
        },
      },
      {
        title: "GitHub Actions secrets",
        skip: () => (stepDone("gha-secrets") ? "already done" : false),
        task: async (ctx) => {
          runTsx("scripts/setup/04-set-gha-secrets.ts", {
            env: { WP_PASSWORDS_JSON: JSON.stringify(ctx.wpPasswords ?? {}) },
          });
        },
      },
      {
        title: "Vercel envs",
        skip: () => (stepDone("vercel") ? "already done" : false),
        task: async () => {
          runTsx("scripts/setup/05-set-vercel-envs.ts");
        },
      },
      {
        title: "Verify all sites",
        task: async () => {
          runTsx("scripts/setup/06-verify-readiness.ts");
        },
      },
    ],
    { exitOnError: true },
  );

  try {
    await tasks.run();
    console.log("Setup complete.");
    console.log("Next: pnpm setup:revoke, then manually revoke GitHub fine-grained PAT if needed.");
  } catch (error) {
    console.error(`Setup failed. Resume with: pnpm setup:resume. ${getErrorMessage(error)}`);
    process.exit(1);
  }
}

main();
