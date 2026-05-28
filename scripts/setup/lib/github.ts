import { execFileSync } from "node:child_process";
import { Octokit } from "@octokit/rest";
import sodium from "libsodium-wrappers";
import { getErrorMessage } from "./errors.js";

export async function makeOctokitVerified(token: string, owner: string, repo: string): Promise<Octokit> {
  if (!token.startsWith("github_pat_")) {
    throw new Error("PAT must be fine-grained (github_pat_...). Classic PAT is too broad.");
  }

  const octokit = new Octokit({ auth: token });

  try {
    await octokit.actions.getRepoPublicKey({ owner, repo });
  } catch (error) {
    throw new Error(`PAT cannot access ${owner}/${repo} secrets. Check scope: ${getErrorMessage(error)}`);
  }

  return octokit;
}

export async function encryptSecret(value: string, publicKey: string): Promise<string> {
  await sodium.ready;
  const binKey = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
  const enc = sodium.crypto_box_seal(sodium.from_string(value), binKey);
  return sodium.to_base64(enc, sodium.base64_variants.ORIGINAL);
}

export function triggerWorkflowDryRun(owner: string, repo: string): string {
  try {
    execFileSync(
      "gh",
      ["workflow", "run", "etl-daily.yml", "--field", "days=1", "-R", `${owner}/${repo}`],
      { stdio: "pipe" },
    );
    return `Workflow triggered. Check: gh run list -R ${owner}/${repo}`;
  } catch (error) {
    return `Dry-run trigger skipped or failed: ${getErrorMessage(error)}`;
  }
}
