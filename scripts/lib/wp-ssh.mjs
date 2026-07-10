import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const SSH_CONFIG_PATH = "D:/env/chemicloud_ssh.txt";
const ENV_DIR = "D:/env";
const KEY_LINE = /-i\s+"?([^"\s]+)"?/;

export function resolveSite(siteIdOrDomain, urlFromStats) {
  const blocks = parseSshConfig();
  let domain = siteIdOrDomain;
  if (urlFromStats) {
    try {
      domain = new URL(urlFromStats).hostname.replace(/^www\./, "");
    } catch {
      domain = siteIdOrDomain;
    }
  }
  const base = domain.split(".")[0];
  let block = blocks.find((item) => item.SITE?.replace(/^www\./, "") === domain);
  if (!block && !domain.includes(".")) {
    block = blocks.find((item) => item.SITE?.split("/")[0].trim().includes(base));
  }
  if (!block?.HOST || !block.USERNAME || !block.WP_PATH) return null;

  const keyHint = normalizeKeyPath(block.PRIVATE_KEY_NOPASS || block.SSH_KEY_PATH || block.sshKeyPath || block._keyHint);
  const key = (keyHint && existsSync(keyHint) ? keyHint : null) || findKey(base, block.USERNAME, keyHint);
  if (!key) return null;
  return { domain, host: block.HOST, key, port: block.PORT || "1988", user: block.USERNAME, wpp: block.WP_PATH };
}

export function runRemotePhp(cfg, php, { timeoutSec = 40 } = {}) {
  const args = [
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    "-o", `ConnectTimeout=${Math.min(timeoutSec, 25)}`,
    "-o", "BatchMode=yes",
    "-p", String(cfg.port),
    "-i", cfg.key,
    `${cfg.user}@${cfg.host}`,
    "php",
  ];
  return execFileSync("ssh", args, {
    encoding: "utf8",
    input: php,
    maxBuffer: 8 * 1024 * 1024,
    timeout: timeoutSec * 1000,
  }).replace(/\uFEFF/g, "").trim();
}

function parseSshConfig() {
  const lines = readFileSync(SSH_CONFIG_PATH, "utf8").split(/\r?\n/);
  const blocks = [];
  let current = null;
  for (const line of lines) {
    const kv = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    const keyHint = line.match(KEY_LINE);
    if (kv) {
      const [, key, value] = kv;
      if (key === "SITE") {
        if (current) blocks.push(current);
        current = { SITE: value, _keyHint: null };
      } else if (current && !(key in current)) {
        current[key] = value;
      }
    } else if (keyHint && current && !current._keyHint) {
      current._keyHint = keyHint[1].replace(/\\/g, "/");
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

function findKey(domainBase, username, keyHint) {
  const files = readdirSync(ENV_DIR);
  for (const base of [domainBase, username].filter(Boolean)) {
    const hit = files.find((file) => file.toLowerCase().startsWith(base.toLowerCase()) && !file.endsWith(".pub") && !file.includes(".bak") && /key/i.test(file));
    if (hit) return `${ENV_DIR}/${hit}`;
  }
  return keyHint && existsSync(keyHint) ? keyHint : null;
}

function normalizeKeyPath(value) {
  return value ? String(value).replace(/\\/g, "/") : null;
}
