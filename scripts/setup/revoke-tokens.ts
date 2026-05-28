import { getErrorMessage } from "./lib/errors.js";

async function main(): Promise<void> {
  console.log("Revoking ephemeral tokens used during setup.");
  console.log("GitHub fine-grained PAT must be revoked manually:");
  console.log("https://github.com/settings/tokens?type=beta");

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.warn("VERCEL_TOKEN is missing; Vercel revoke skipped.");
    return;
  }

  try {
    const response = await fetch("https://api.vercel.com/v3/user/tokens/current", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      console.log("Vercel token revoked.");
      return;
    }

    console.warn(`Vercel token revoke failed ${response.status}: ${await response.text()}`);
  } catch (error) {
    console.warn(`Vercel token revoke failed: ${getErrorMessage(error)}`);
  }

  console.log("Optional cleanup: rotate or remove local setup tokens from your key file.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
