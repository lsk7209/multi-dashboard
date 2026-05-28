import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";

const DEFAULT_KEY_FILE = "D:\\env\\\uD0A4\uD30C\uC77C.txt";

export interface WpAdminCredentials {
  url: string;
  username: string;
  password: string;
}

export function loadLocalSecrets(): void {
  loadEnvFile(".env.setup.template");
  loadEnvFile(".env.setup.local");
  loadEnvFile(".env.local");
  loadLooseKeyFile(process.env.SETUP_KEY_FILE ?? DEFAULT_KEY_FILE);
}

export function getWpAdmin(siteId: string): WpAdminCredentials {
  const prefix = `WP_ADMIN_${toEnvKey(siteId)}`;
  const url = readSecret(`${prefix}_URL`);
  const username = readSecret(`${prefix}_USERNAME`);
  const password = readSecret(`${prefix}_PASSWORD`);

  if (!url || !username || !password) {
    throw new Error(
      `Missing WP admin credentials for ${siteId}. Expected ${prefix}_URL, ${prefix}_USERNAME, ${prefix}_PASSWORD.`,
    );
  }

  return { url, username, password };
}

export function readSecret(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : undefined;
}

function loadEnvFile(path: string): void {
  if (!existsSync(path)) {
    return;
  }

  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const parsed = parseKeyValueLine(line);
    if (parsed && !process.env[parsed.key]) {
      process.env[parsed.key] = parsed.value;
    }
  }
}

function loadLooseKeyFile(path: string): void {
  if (!existsSync(path)) {
    return;
  }

  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const parsed = parseKeyValueLine(line);
    if (parsed && !process.env[parsed.key]) {
      process.env[parsed.key] = parsed.value;
    }
  }
}

function parseKeyValueLine(line: string): { key: string; value: string } | undefined {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return undefined;
  }

  const match = trimmed.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (!match) {
    return undefined;
  }

  const key = match[1];
  if (!key) {
    return undefined;
  }
  const rawValue = match[2] ?? "";
  const value = rawValue.replace(/^["']|["']$/g, "").trim();

  return { key, value };
}

function toEnvKey(siteId: string): string {
  return siteId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}
