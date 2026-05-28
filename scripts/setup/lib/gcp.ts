import { google } from "googleapis";
import { existsSync, readFileSync } from "node:fs";

export function makeGoogleAuth(keyJson: string, scopes: string[]) {
  const credentials = parseServiceAccountKey(keyJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes,
  });
}

export function parseServiceAccountKey(keyJson: string): Record<string, string> {
  const trimmed = keyJson.trim();
  const content = trimmed.startsWith("{") ? trimmed : readKeyFile(trimmed);

  return JSON.parse(content) as Record<string, string>;
}

function readKeyFile(path: string): string {
  if (!existsSync(path)) {
    throw new Error("GCP_SA_KEY_JSON must contain raw service-account JSON or a readable JSON file path.");
  }

  return readFileSync(path, "utf8");
}
