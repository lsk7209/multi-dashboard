import { google } from "googleapis";

export function makeGoogleAuth(keyJson: string, scopes: string[]) {
  const credentials = parseServiceAccountKey(keyJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes,
  });
}

export function parseServiceAccountKey(keyJson: string): Record<string, string> {
  const trimmed = keyJson.trim();

  if (!trimmed.startsWith("{")) {
    throw new Error("GCP_SA_KEY_JSON must contain raw service-account JSON when injected by op.");
  }

  return JSON.parse(trimmed) as Record<string, string>;
}
