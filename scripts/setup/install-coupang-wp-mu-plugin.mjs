import { readFileSync } from "node:fs";

import { resolveSite, runRemotePhp } from "../lib/wp-ssh.mjs";

const DASHBOARD_BASE = "https://multi-dashboard-one.vercel.app";
const SLOT_KEY = "coupang-inline";
const PLUGIN_FILE = "codex-coupang-banner.php";
const TARGETS = {
  nexttech7: { pageUrlBase: "https://nexttech7.com", siteKey: "nexttech7", ssh: { host: "158.247.212.123", key: "D:/env/haemongdream-claude_key2", port: "1988", user: "nexttech", wpp: "/home/nexttech/public_html" } },
  smallhomepick: { pageUrlBase: "https://smallhomepick.com", siteKey: "smallhomepick", ssh: { host: "travel.sellerpit.kr", key: "D:/env/haemongdream-claude_key2", port: "1988", user: "nexttech", wpp: "/home/nexttech/smallhomepick.com" } },
  "petinsuer-2": { pageUrlBase: "https://petinsuer.com", siteKey: "petinsuer-2" },
  "healfood-2": { pageUrlBase: "https://healfood.kr", siteKey: "healfood-2" },
  "estat-2": { pageUrlBase: "https://estat.kr", siteKey: "estat-2" },
  "autoscares-2": { pageUrlBase: "https://autoscares.com", siteKey: "autoscares-2" },
  "dogspang-2": { pageUrlBase: "https://dogspang.kr", siteKey: "dogspang-2" },
  "notebook-klick-2": { pageUrlBase: "https://notebook.klick.kr", siteKey: "notebook-klick-2", ssh: { host: "158.247.245.11", key: "D:/env/klickkr-chemicloud-PrivateKey-nopass", port: "1988", user: "klick", wpp: "/home/klick/notebook.klick.kr" } },
  softwa: { pageUrlBase: "https://softwa.kr", siteKey: "softwa" },
};

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const selected = args.filter((item) => !item.startsWith("--"));
const stats = JSON.parse(readFileSync("data/site-stats.json", "utf8")).stats ?? [];
const ids = selected.length ? selected : Object.keys(TARGETS);

for (const id of ids) {
  const target = TARGETS[id];
  if (!target) throw new Error(`Unknown target: ${id}`);
  const site = stats.find((item) => item.id === id);
  const cfg = target.ssh ?? resolveSite(id, site?.url);
  if (!cfg) throw new Error(`${id}: SSH configuration could not be resolved`);

  if (!apply) {
    console.log(`${id}: ready (dry run; rerun with --apply to write ${PLUGIN_FILE})`);
    continue;
  }

  const payload = Buffer.from(buildPlugin(target), "utf8").toString("base64");
  const result = runRemotePhp(cfg, `<?php
require '${cfg.wpp}/wp-load.php';
$dir = WPMU_PLUGIN_DIR;
if (!is_dir($dir)) { mkdir($dir, 0755, true); }
$file = $dir . '/${PLUGIN_FILE}';
$backup = file_exists($file) ? $file . '.bak-' . gmdate('Ymd-His') : null;
if ($backup) { copy($file, $backup); }
$written = file_put_contents($file, base64_decode('${payload}'));
echo json_encode(array('ok' => $written !== false, 'file' => $file, 'backup' => $backup, 'bytes' => $written), JSON_UNESCAPED_SLASHES);
`);
  console.log(`${id}: ${result}`);
}

function buildPlugin(target) {
  return `<?php
/** Plugin Name: Codex Coupang Banner Measurement */
if (!defined('ABSPATH')) { exit; }
const CODEX_BANNER_BASE = '${DASHBOARD_BASE}';
const CODEX_BANNER_SITE = '${target.siteKey}';
const CODEX_BANNER_SLOT = '${SLOT_KEY}';
const CODEX_BANNER_PAGE_BASE = '${target.pageUrlBase}';
function codex_banner_render(): void {
  if (is_admin() || wp_doing_ajax() || is_feed() || is_404()) { return; }
  $path = isset($_SERVER['REQUEST_URI']) ? strtok((string) $_SERVER['REQUEST_URI'], '?') : '/';
  $query = http_build_query(array('siteKey' => CODEX_BANNER_SITE, 'slotKey' => CODEX_BANNER_SLOT, 'purpose' => 'public', 'pageUrl' => CODEX_BANNER_PAGE_BASE . ($path ?: '/')), '', '&', PHP_QUERY_RFC3986);
  $click = CODEX_BANNER_BASE . '/api/banner-management/click?' . $query;
  $image = CODEX_BANNER_BASE . '/api/banner-management/image?' . $query;
  echo '<aside data-banner-measurement data-banner-measurement-base="' . esc_attr(CODEX_BANNER_BASE) . '" data-banner-site-key="' . esc_attr(CODEX_BANNER_SITE) . '" data-banner-slot-key="' . esc_attr(CODEX_BANNER_SLOT) . '" style="margin:24px auto;max-width:960px;padding:0 16px">';
  echo '<a href="' . esc_url($click) . '" target="_blank" rel="sponsored nofollow noopener" style="display:flex;align-items:center;justify-content:center;min-height:92px">';
  echo '<img src="' . esc_url($image) . '" alt="Coupang Partners" width="728" height="90" loading="lazy" style="height:auto;max-width:100%">';
  echo '</a></aside><script src="' . esc_url(CODEX_BANNER_BASE . '/banner-measurement.js') . '" defer></script>';
}
add_action('wp_footer', 'codex_banner_render', 20);
`;
}
