// 대시보드 등록 사이트 SEO/AEO/GEO 체크리스트 일괄 audit (HTTP 기반, 변경 0)
// 사용: node scripts/seo-audit.mjs
import { readFileSync, writeFileSync } from "node:fs";

const PUB_ID = "ca-pub-3050601904412736";
const CONCURRENCY = 8;
const TIMEOUT_MS = 15000;
const OUT = `data/seo-audit-${new Date().toISOString().slice(0, 10)}.json`;

const stats = JSON.parse(readFileSync("data/site-stats.json", "utf8")).stats;
const sites = stats.map((s) => ({ id: s.id, name: s.name, url: s.url })).filter((s) => s.url);

async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; seo-audit/1.0)" },
    });
    const body = await r.text();
    return { status: r.status, body, finalUrl: r.url };
  } catch (e) {
    return { status: 0, body: "", error: String(e).slice(0, 80) };
  } finally {
    clearTimeout(t);
  }
}

function pick(re, html) {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

async function auditSite(site) {
  const base = site.url.endsWith("/") ? site.url : site.url + "/";
  const [home, robots, adstxt] = await Promise.all([
    fetchText(base),
    fetchText(base + "robots.txt"),
    fetchText(base + "ads.txt"),
  ]);
  const html = home.body || "";
  const headEnd = html.search(/<\/head>/i);
  const head = headEnd > -1 ? html.slice(0, headEnd) : html.slice(0, 40000);

  const title = pick(/<title[^>]*>([^<]*)<\/title>/i, head);
  const desc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i, head);
  const canonical = pick(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i, head)
    || pick(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i, head);
  const viewport = /name=["']viewport["']/i.test(head);
  const ogTitle = /property=["']og:title["']/i.test(head);
  const h1count = (html.match(/<h1[\s>]/gi) || []).length;
  const hasAdsenseScript = html.includes(PUB_ID) || /adsbygoogle\.js/i.test(html);
  const jsonLd = (html.match(/application\/ld\+json/gi) || []).length;

  const robotsBody = robots.body || "";
  const robotsOk = robots.status === 200;
  const robotsSitemap = /sitemap:/i.test(robotsBody);
  const aiBotAllow = /(GPTBot|ClaudeBot|PerplexityBot|Google-Extended)/i.test(robotsBody);
  const bytespiderBlock = /bytespider/i.test(robotsBody);

  const adsTxtOk = adstxt.status === 200 && adstxt.body.includes("pub-3050601904412736");

  const issues = [];
  if (home.status !== 200) issues.push(`home:${home.status || home.error}`);
  if (!title) issues.push("no-title");
  else if (title.length > 65) issues.push(`title-long(${title.length})`);
  if (!desc) issues.push("no-desc");
  if (!canonical) issues.push("no-canonical");
  if (!viewport) issues.push("no-viewport");
  if (h1count === 0) issues.push("no-h1");
  else if (h1count > 1) issues.push(`h1x${h1count}`);
  if (!robotsOk) issues.push("no-robots");
  else {
    if (!robotsSitemap) issues.push("robots-no-sitemap");
    if (!aiBotAllow) issues.push("robots-no-aibot");
    if (!bytespiderBlock) issues.push("robots-no-bytespider-block");
  }
  if (!hasAdsenseScript) issues.push("no-adsense-script");
  if (!adsTxtOk) issues.push("no-ads.txt");

  return {
    name: site.name, url: site.url, homeStatus: home.status,
    title, titleLen: title ? title.length : 0, hasDesc: !!desc, descLen: desc ? desc.length : 0,
    canonical: !!canonical, viewport, ogTitle, h1count, jsonLd,
    hasAdsenseScript, adsTxtOk,
    robotsOk, robotsSitemap, aiBotAllow, bytespiderBlock,
    issues,
  };
}

async function run() {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < sites.length) {
      const idx = i++;
      const r = await auditSite(sites[idx]);
      results.push(r);
      process.stderr.write(`\r${results.length}/${sites.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  results.sort((a, b) => b.issues.length - a.issues.length);
  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  process.stderr.write("\n");

  // 콘솔 요약
  const tally = {};
  for (const r of results) for (const is of r.issues) {
    const key = is.replace(/\(.*\)|x\d+|:\d+/g, "");
    tally[key] = (tally[key] || 0) + 1;
  }
  console.log("=== SEO AUDIT 요약 (84사이트) ===");
  console.log("출력:", OUT);
  console.log("\n## 이슈 유형별 사이트 수");
  Object.entries(tally).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log("\n## 이슈 많은 사이트 TOP 15");
  results.slice(0, 15).forEach((r) => console.log(`  ${r.name} [${r.issues.length}] ${r.issues.join(", ")}`));
  const clean = results.filter((r) => r.issues.length === 0).length;
  console.log(`\n이슈 0개(완벽): ${clean}/${results.length}`);
}
run();
