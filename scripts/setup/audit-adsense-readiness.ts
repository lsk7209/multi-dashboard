import { mkdir, writeFile } from "node:fs/promises";
import { google } from "googleapis";
import pLimit from "p-limit";
import { makeGoogleAuth } from "./lib/gcp.js";
import { loadLocalSecrets, readSecret } from "./lib/secrets.js";
import { loadSites, type Site } from "./lib/sites.js";
import { getErrorMessage } from "./lib/errors.js";

const ADSENSE_CLIENT_ID = "ca-pub-3050601904412736";
const ADS_TXT_LINE =
  "google.com, pub-3050601904412736, DIRECT, f08c47fec0942fa0";
const CONCURRENCY = 8;
const PAGE_LIMIT = 3;
const OUTPUT_DATE = new Date().toISOString().slice(0, 10);
const JSON_OUTPUT_PATH = `data/adsense-readiness-audit-${OUTPUT_DATE}.json`;
const MD_OUTPUT_PATH = `docs/adsense-readiness-audit-${OUTPUT_DATE}.md`;
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
} as const;

type CheckState = "pass" | "warn" | "fail" | "unknown";
type SiteVerdict = "ready" | "needs_patch" | "blocked" | "review";

interface CheckResult {
  state: CheckState;
  detail: string;
}

interface PageAudit {
  url: string;
  status?: number;
  title: CheckResult;
  description: CheckResult;
  canonical: CheckResult;
  headings: CheckResult;
  imageAlt: CheckResult;
  viewport: CheckResult;
  toc: CheckResult;
  cta: CheckResult;
  inlinks: CheckResult;
  outlinks: CheckResult;
  readableUrl: CheckResult;
  adsenseLoader: CheckResult;
  wordCount: number;
  h1Count: number;
  h2Count: number;
  h3Count: number;
}

interface SiteAudit {
  id: string;
  name: string;
  platform: string;
  url: string;
  gscSiteUrl?: string;
  verdict: SiteVerdict;
  score: number;
  pages: PageAudit[];
  robots: CheckResult;
  sitemap: CheckResult;
  gscSitemap: CheckResult;
  adsTxt: CheckResult;
  trustPages: CheckResult;
  blogIndex: CheckResult;
  issues: string[];
  nextActions: string[];
}

interface AuditReport {
  generatedAt: string;
  targetCount: number;
  summary: Record<SiteVerdict, number>;
  sites: SiteAudit[];
}

interface GscSitemapDetail {
  path?: string | null;
  lastDownloaded?: string | null;
  lastSubmitted?: string | null;
  warnings?: string | number | null;
  errors?: string | number | null;
  isPending?: boolean | null;
}

function textBetween(html: string, regex: RegExp): string | undefined {
  const match = html.match(regex);
  return decodeHtml(match?.[1]?.trim() ?? "");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(html: string): string {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function wordCount(text: string): number {
  const korean = text.match(/[가-힣]{2,}/g) ?? [];
  const latin = text.match(/[A-Za-z0-9]{2,}/g) ?? [];
  return korean.length + latin.length;
}

function extractAttribute(tag: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(
    new RegExp(`${escaped}\\s*=\\s*["']([^"']*)["']`, "i"),
  );
  return match?.[1]?.trim();
}

function visibleTermCount(text: string): number {
  const korean = text.match(/[\uAC00-\uD7A3]{2,}/g) ?? [];
  const latin = text.match(/[A-Za-z0-9]{2,}/g) ?? [];
  return korean.length + latin.length;
}

function extractHeadings(html: string, level: 1 | 2 | 3): string[] {
  const regex = new RegExp(`<h${level}[^>]*>([\\s\\S]*?)<\\/h${level}>`, "gi");
  return Array.from(html.matchAll(regex)).map((match) =>
    stripHtml(match[1] ?? ""),
  );
}

function pageHasAdsenseLoader(html: string): boolean {
  const normalized = html.toLowerCase();
  return (
    normalized.includes(
      "pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
    ) && normalized.includes(ADSENSE_CLIENT_ID)
  );
}

function checkReadableUrl(url: string): CheckResult {
  const path = new URL(url).pathname;
  if (path === "/" || path === "") {
    return { state: "pass", detail: "home" };
  }
  const segments = path.split("/").filter(Boolean);
  const unreadable = segments.some(
    (segment) =>
      segment.length > 80 ||
      /^[0-9]+$/.test(segment) ||
      /%[0-9a-f]{2}/i.test(segment),
  );
  return unreadable
    ? { state: "warn", detail: path }
    : { state: "pass", detail: path };
}

function isApprovalContentSample(url: string): boolean {
  const path = new URL(url).pathname.toLowerCase();
  if (path === "/" || path === "") {
    return true;
  }

  const excludedFragments = [
    "thank-you",
    "thanks",
    "confirmation",
    "sms-landing",
    "guide-landing",
    "unsubscribe",
    "preference",
    "/cart",
    "/checkout",
    "/my-account",
    "/login",
    "/password-reset",
    "/dashboard",
    "/wishlist",
    "registration",
  ];

  return !excludedFragments.some((fragment) => path.includes(fragment));
}

function hasKeywordNearFront(text: string, host: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  const hostTokens = host
    .replace(/^www\./, "")
    .split(/[.-]/)
    .filter((token) => token.length >= 3);
  return hostTokens.some((token) => normalized.slice(0, 80).includes(token));
}

async function fetchText(
  url: string,
): Promise<{ status: number; body: string }> {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
    headers: FETCH_HEADERS,
  });
  return { status: response.status, body: await response.text() };
}

async function discoverSitemapUrls(site: Site): Promise<string[]> {
  const candidates = [
    ...(site.sitemapUrls ?? []),
    new URL("/sitemap.xml", site.url).toString(),
    new URL("/wp-sitemap.xml", site.url).toString(),
    new URL("/sitemap_index.xml", site.url).toString(),
    new URL("/page-sitemap.xml", site.url).toString(),
    new URL("/post-sitemap.xml", site.url).toString(),
  ];
  return [...new Set(candidates)];
}

async function discoverSamplePages(site: Site): Promise<string[]> {
  const home = site.url;
  const sitemapUrls = await discoverSitemapUrls(site);
  const samples: string[] = [home];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const { status, body } = await fetchText(sitemapUrl);
      if (status < 200 || status >= 300) {
        continue;
      }
      const locs = Array.from(body.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi))
        .map((match) => decodeHtml(match[1]?.trim() ?? ""))
        .filter(Boolean);
      const pageLocs = locs.filter((loc) => {
        const path = new URL(loc).pathname.toLowerCase();
        return (
          !path.endsWith(".xml") &&
          !path.includes("sitemap") &&
          !path.includes("privacy") &&
          !path.includes("terms") &&
          !path.includes("contact") &&
          !path.includes("about") &&
          isApprovalContentSample(loc)
        );
      });
      samples.push(...pageLocs.slice(0, PAGE_LIMIT - samples.length));
      if (samples.length >= PAGE_LIMIT) {
        break;
      }
    } catch {
      continue;
    }
  }

  return [...new Set(samples)].slice(0, PAGE_LIMIT);
}

function auditPage(
  url: string,
  status: number | undefined,
  html: string,
): PageAudit {
  const host = new URL(url).hostname;
  const title = textBetween(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ?? "";
  const description =
    textBetween(
      html,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    ) ??
    textBetween(
      html,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i,
    ) ??
    "";
  const canonical =
    textBetween(
      html,
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
    ) ??
    textBetween(
      html,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i,
    ) ??
    "";
  const h1 = extractHeadings(html, 1);
  const h2 = extractHeadings(html, 2);
  const h3 = extractHeadings(html, 3);
  const imgTags = Array.from(html.matchAll(/<img\b[^>]*>/gi)).map(
    (match) => match[0],
  );
  const hasViewport =
    /<meta[^>]+name=["']viewport["'][^>]+content=["'][^"']*width=device-width/i.test(
      html,
    );
  const hasToc =
    /class=["'][^"']*(toc|table-of-contents|ez-toc|rank-math-toc)[^"']*["']/i.test(
      html,
    ) || /목차|table of contents/i.test(html);
  const missingAlt = imgTags.filter((tag) => !extractAttribute(tag, "alt"));
  const anchors = Array.from(html.matchAll(/<a\b[^>]*>/gi)).map(
    (match) => match[0],
  );
  const hrefs = anchors
    .map((tag) => extractAttribute(tag, "href"))
    .filter((href): href is string => Boolean(href));
  const internalLinks = hrefs.filter((href) => {
    try {
      const parsed = new URL(href, url);
      return (
        parsed.hostname === host && parsed.pathname !== new URL(url).pathname
      );
    } catch {
      return false;
    }
  });
  const externalLinks = hrefs.filter((href) => {
    try {
      const parsed = new URL(href, url);
      return parsed.hostname !== host && parsed.protocol.startsWith("http");
    } catch {
      return false;
    }
  });
  const visibleText = stripHtml(html);
  const ctaPattern =
    /(확인|조회|계산|신청|다운로드|비교|더 보기|바로가기|시작|예약|상담|check|start|download|compare)/i;
  const count = visibleTermCount(visibleText);
  const headingOrderWarn =
    h1.length !== 1 || (h3.length > 0 && h2.length === 0);

  return {
    url,
    ...(status ? { status } : {}),
    title: title
      ? {
          state: hasKeywordNearFront(title, host) ? "pass" : "warn",
          detail: title.slice(0, 140),
        }
      : { state: "fail", detail: "missing title" },
    description: description
      ? {
          state: hasKeywordNearFront(description, host) ? "pass" : "warn",
          detail: description.slice(0, 180),
        }
      : { state: "fail", detail: "missing description" },
    canonical: canonical
      ? { state: "pass", detail: canonical }
      : { state: "fail", detail: "missing canonical" },
    headings: headingOrderWarn
      ? {
          state: "warn",
          detail: `H1=${h1.length}, H2=${h2.length}, H3=${h3.length}`,
        }
      : {
          state: "pass",
          detail: `H1=${h1.length}, H2=${h2.length}, H3=${h3.length}`,
        },
    imageAlt:
      missingAlt.length === 0
        ? { state: "pass", detail: `${imgTags.length} images` }
        : {
            state: "warn",
            detail: `${missingAlt.length}/${imgTags.length} images missing alt`,
          },
    viewport: hasViewport
      ? { state: "pass", detail: "responsive viewport meta found" }
      : { state: "fail", detail: "missing responsive viewport meta" },
    toc:
      count >= 800 && h2.length >= 3
        ? hasToc
          ? { state: "pass", detail: "TOC marker found" }
          : { state: "warn", detail: "long article without TOC marker" }
        : { state: "pass", detail: "TOC not required for sampled page" },
    cta: ctaPattern.test(visibleText)
      ? { state: "pass", detail: "CTA-like text found" }
      : { state: "warn", detail: "no CTA-like text found" },
    inlinks:
      internalLinks.length >= 2
        ? { state: "pass", detail: `${internalLinks.length} internal links` }
        : { state: "warn", detail: `${internalLinks.length} internal links` },
    outlinks:
      externalLinks.length >= 1
        ? { state: "pass", detail: `${externalLinks.length} external links` }
        : { state: "warn", detail: `${externalLinks.length} external links` },
    readableUrl: checkReadableUrl(url),
    adsenseLoader: pageHasAdsenseLoader(html)
      ? { state: "pass", detail: "loader with publisher id found" }
      : { state: "fail", detail: "loader not found" },
    wordCount: count,
    h1Count: h1.length,
    h2Count: h2.length,
    h3Count: h3.length,
  };
}

async function auditRobots(site: Site): Promise<CheckResult> {
  try {
    const url = new URL("/robots.txt", site.url).toString();
    const { status, body } = await fetchText(url);
    if (status < 200 || status >= 300) {
      return { state: "fail", detail: `HTTP ${status}` };
    }
    const normalized = body.toLowerCase();
    const blocksRoot = robotsBlocksGoogleRoot(body);
    if (blocksRoot) {
      return { state: "fail", detail: "robots disallows root" };
    }
    return normalized.includes("sitemap:")
      ? { state: "pass", detail: "robots.txt with sitemap" }
      : { state: "warn", detail: "robots.txt without sitemap line" };
  } catch (error) {
    return { state: "unknown", detail: getErrorMessage(error) };
  }
}

function robotsBlocksGoogleRoot(body: string): boolean {
  const relevantAgents = new Set(["*", "googlebot", "mediapartners-google"]);
  let currentAgents: string[] = [];
  let seenDirectiveInGroup = false;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim().toLowerCase();
    if (!line) {
      currentAgents = [];
      seenDirectiveInGroup = false;
      continue;
    }
    const agent = line.match(/^user-agent:\s*(.+)$/)?.[1]?.trim();
    if (agent) {
      if (seenDirectiveInGroup) {
        currentAgents = [];
        seenDirectiveInGroup = false;
      }
      currentAgents.push(agent);
      continue;
    }

    const disallow = line.match(/^disallow:\s*(.*)$/)?.[1]?.trim();
    if (disallow === undefined) {
      if (line.startsWith("allow:")) {
        seenDirectiveInGroup = true;
      }
      if (!line.startsWith("allow:")) {
        currentAgents = [];
        seenDirectiveInGroup = false;
      }
      continue;
    }
    seenDirectiveInGroup = true;
    const targetsGoogle = currentAgents.some((value) =>
      relevantAgents.has(value),
    );
    if (targetsGoogle && (disallow === "/" || disallow === "/*")) {
      return true;
    }
  }

  return false;
}

async function auditSitemap(site: Site): Promise<CheckResult> {
  const sitemapUrls = await discoverSitemapUrls(site);
  for (const sitemapUrl of sitemapUrls) {
    try {
      const { status, body } = await fetchText(sitemapUrl);
      if (
        status >= 200 &&
        status < 300 &&
        /<(urlset|sitemapindex|rss|feed)/i.test(body)
      ) {
        return { state: "pass", detail: sitemapUrl };
      }
    } catch {
      continue;
    }
  }
  return { state: "fail", detail: "no public XML sitemap found" };
}

async function auditAdsTxt(site: Site): Promise<CheckResult> {
  try {
    const url = new URL("/ads.txt", site.url).toString();
    const { status, body } = await fetchText(url);
    if (status < 200 || status >= 300) {
      return { state: "fail", detail: `HTTP ${status}` };
    }
    return body.includes(ADS_TXT_LINE) || body.includes("pub-3050601904412736")
      ? { state: "pass", detail: "publisher line found" }
      : { state: "fail", detail: "publisher line missing" };
  } catch (error) {
    return { state: "unknown", detail: getErrorMessage(error) };
  }
}

async function auditTrustPages(site: Site): Promise<CheckResult> {
  const groups = {
    about: ["/about", "/about-us"],
    contact: ["/contact", "/contact-us"],
    privacy: ["/privacy", "/privacy-policy"],
    terms: ["/terms", "/terms-of-service"],
  };
  const missing: string[] = [];

  for (const [name, paths] of Object.entries(groups)) {
    let found = false;
    for (const path of paths) {
      try {
        const { status } = await fetchText(new URL(path, site.url).toString());
        if (status >= 200 && status < 300) {
          found = true;
          break;
        }
      } catch {
        continue;
      }
    }
    if (!found) {
      missing.push(name);
    }
  }

  return missing.length === 0
    ? { state: "pass", detail: "about/contact/privacy/terms reachable" }
    : { state: "fail", detail: `missing ${missing.join(", ")}` };
}

async function auditBlogIndex(site: Site): Promise<CheckResult> {
  try {
    const url = new URL("/blog/", site.url).toString();
    const { status, body } = await fetchText(url);
    if (status < 200 || status >= 300) {
      return { state: "warn", detail: `/blog/ HTTP ${status}` };
    }
    const canonical =
      textBetween(
        body,
        /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
      ) ??
      textBetween(
        body,
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i,
      ) ??
      "";
    const links = Array.from(
      body.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi),
    )
      .map((match) => match[1]?.trim())
      .filter((href): href is string => Boolean(href));
    const host = new URL(site.url).hostname;
    const postLikeLinks = links.filter((href) => {
      try {
        const parsed = new URL(href, url);
        return (
          parsed.hostname === host &&
          parsed.pathname !== "/blog/" &&
          parsed.pathname !== "/" &&
          !parsed.pathname.includes("privacy") &&
          !parsed.pathname.includes("terms") &&
          !parsed.pathname.includes("contact") &&
          !parsed.pathname.includes("about")
        );
      } catch {
        return false;
      }
    });
    if (!canonical) {
      return {
        state: "warn",
        detail: "/blog/ exists but canonical is missing",
      };
    }
    return postLikeLinks.length >= 3
      ? {
          state: "pass",
          detail: `/blog/ canonical found, ${postLikeLinks.length} internal post-like links`,
        }
      : {
          state: "warn",
          detail: `/blog/ has only ${postLikeLinks.length} post-like links`,
        };
  } catch (error) {
    return { state: "unknown", detail: getErrorMessage(error) };
  }
}

async function makeGscClient(): Promise<
  ReturnType<typeof google.searchconsole> | undefined
> {
  loadLocalSecrets();
  const keyJson = readSecret("GCP_SA_KEY_JSON");
  if (!keyJson) {
    return undefined;
  }
  const auth = makeGoogleAuth(keyJson, [
    "https://www.googleapis.com/auth/webmasters.readonly",
  ]);
  return google.searchconsole({ version: "v1", auth });
}

async function auditGscSitemap(
  client: ReturnType<typeof google.searchconsole> | undefined,
  site: Site,
): Promise<CheckResult> {
  if (!client) {
    return { state: "unknown", detail: "GCP_SA_KEY_JSON missing" };
  }
  const siteUrl = site.gscSiteUrl ?? site.url;
  try {
    const response = await client.sitemaps.list({ siteUrl });
    const sitemaps = (response.data.sitemap ?? []) as GscSitemapDetail[];
    const successful = sitemaps.find((sitemap) => {
      const errors = Number(sitemap.errors ?? 0);
      const warnings = Number(sitemap.warnings ?? 0);
      return (
        sitemap.path && sitemap.lastDownloaded && errors === 0 && warnings === 0
      );
    });
    if (successful) {
      return {
        state: "pass",
        detail: `${successful.path} lastDownloaded=${successful.lastDownloaded}`,
      };
    }
    if (sitemaps.length > 0) {
      return {
        state: "warn",
        detail: `${sitemaps.length} submitted, no clean downloaded sitemap yet`,
      };
    }
    return { state: "fail", detail: "no submitted sitemap in GSC" };
  } catch (error) {
    return { state: "unknown", detail: getErrorMessage(error) };
  }
}

function collectIssues(site: SiteAudit): string[] {
  const issues: string[] = [];
  const siteChecks = [
    ["robots", site.robots],
    ["sitemap", site.sitemap],
    ["gsc sitemap", site.gscSitemap],
    ["ads.txt", site.adsTxt],
    ["trust pages", site.trustPages],
    ["blog index", site.blogIndex],
  ] as const;
  for (const [label, check] of siteChecks) {
    if (check.state === "fail") {
      issues.push(`${label}: ${check.detail}`);
    }
  }
  for (const page of site.pages) {
    for (const [label, check] of [
      ["title", page.title],
      ["description", page.description],
      ["canonical", page.canonical],
      ["headings", page.headings],
      ["image alt", page.imageAlt],
      ["viewport", page.viewport],
      ["TOC", page.toc],
      ["CTA", page.cta],
      ["inlinks", page.inlinks],
      ["outlinks", page.outlinks],
      ["readable URL", page.readableUrl],
      ["AdSense loader", page.adsenseLoader],
    ] as const) {
      if (check.state === "fail") {
        issues.push(`${label}: ${page.url} ${check.detail}`);
      }
    }
    if (page.wordCount < 800) {
      issues.push(
        `thin page: ${page.url} visible word tokens=${page.wordCount}`,
      );
    }
  }
  return issues;
}

function makeNextActions(site: SiteAudit): string[] {
  const actions = new Set<string>();
  if (site.adsTxt.state !== "pass") {
    actions.add("Fix /ads.txt publisher authorization.");
  }
  if (site.trustPages.state !== "pass") {
    actions.add("Create or expose About, Contact, Privacy, and Terms pages.");
  }
  if (site.sitemap.state !== "pass" || site.gscSitemap.state !== "pass") {
    actions.add(
      "Fix public sitemap and submit it in GSC until downloaded without errors.",
    );
  }
  if (site.blogIndex.state !== "pass") {
    actions.add(
      "Improve /blog/ index as a crawlable card list with real post links.",
    );
  }
  if (site.pages.some((page) => page.adsenseLoader.state !== "pass")) {
    actions.add(
      "Insert the Auto Ads loader once site-wide without manual ad slots.",
    );
  }
  if (
    site.pages.some(
      (page) =>
        page.title.state !== "pass" ||
        page.description.state !== "pass" ||
        page.canonical.state !== "pass" ||
        page.headings.state !== "pass" ||
        page.imageAlt.state !== "pass" ||
        page.viewport.state !== "pass",
    )
  ) {
    actions.add(
      "Patch technical SEO templates for meta, canonical, headings, and alt text.",
    );
  }
  if (
    site.pages.some(
      (page) =>
        page.cta.state !== "pass" ||
        page.inlinks.state !== "pass" ||
        page.outlinks.state !== "pass" ||
        page.toc.state !== "pass" ||
        page.wordCount < 800,
    )
  ) {
    actions.add(
      "Queue content-quality pass: persona, TOC, CTA, internal links, credible sources.",
    );
  }
  return [...actions];
}

function scoreSite(site: SiteAudit): number {
  const checks: CheckResult[] = [
    site.robots,
    site.sitemap,
    site.gscSitemap,
    site.adsTxt,
    site.trustPages,
    site.blogIndex,
    ...site.pages.flatMap((page) => [
      page.title,
      page.description,
      page.canonical,
      page.headings,
      page.imageAlt,
      page.viewport,
      page.toc,
      page.cta,
      page.inlinks,
      page.outlinks,
      page.readableUrl,
      page.adsenseLoader,
    ]),
  ];
  const points = checks.reduce((sum, check) => {
    if (check.state === "pass") return sum + 1;
    if (check.state === "warn") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((points / checks.length) * 100);
}

function classifySite(site: SiteAudit): SiteVerdict {
  const hardFails = [site.adsTxt, site.trustPages, site.sitemap].some(
    (check) => check.state === "fail",
  );
  const loaderFail = site.pages.some(
    (page) => page.adsenseLoader.state === "fail",
  );
  const thinFail = site.pages.some((page) => page.wordCount < 500);
  if (hardFails || loaderFail) {
    return "blocked";
  }
  if (thinFail || site.score < 82) {
    return "needs_patch";
  }
  if (
    site.pages.some((page) =>
      [
        page.title,
        page.description,
        page.canonical,
        page.headings,
        page.imageAlt,
        page.viewport,
        page.toc,
        page.cta,
        page.inlinks,
        page.outlinks,
        page.readableUrl,
        page.adsenseLoader,
      ].some((check) => check.state === "warn"),
    )
  ) {
    return "review";
  }
  return "ready";
}

async function auditSite(
  site: Site,
  gscClient: ReturnType<typeof google.searchconsole> | undefined,
): Promise<SiteAudit> {
  const sampleUrls = await discoverSamplePages(site);
  const pages: PageAudit[] = [];
  for (const url of sampleUrls) {
    try {
      const { status, body } = await fetchText(url);
      pages.push(auditPage(url, status, body));
    } catch (error) {
      pages.push({
        url,
        title: { state: "unknown", detail: getErrorMessage(error) },
        description: { state: "unknown", detail: getErrorMessage(error) },
        canonical: { state: "unknown", detail: getErrorMessage(error) },
        headings: { state: "unknown", detail: getErrorMessage(error) },
        imageAlt: { state: "unknown", detail: getErrorMessage(error) },
        cta: { state: "unknown", detail: getErrorMessage(error) },
        inlinks: { state: "unknown", detail: getErrorMessage(error) },
        outlinks: { state: "unknown", detail: getErrorMessage(error) },
        readableUrl: checkReadableUrl(url),
        adsenseLoader: { state: "unknown", detail: getErrorMessage(error) },
        viewport: { state: "unknown", detail: getErrorMessage(error) },
        toc: { state: "unknown", detail: getErrorMessage(error) },
        wordCount: 0,
        h1Count: 0,
        h2Count: 0,
        h3Count: 0,
      });
    }
  }

  const audit: SiteAudit = {
    id: site.id,
    name: site.name ?? site.id,
    platform: site.platform,
    url: site.url,
    ...(site.gscSiteUrl ? { gscSiteUrl: site.gscSiteUrl } : {}),
    verdict: "review",
    score: 0,
    pages,
    robots: await auditRobots(site),
    sitemap: await auditSitemap(site),
    gscSitemap: await auditGscSitemap(gscClient, site),
    adsTxt: await auditAdsTxt(site),
    trustPages: await auditTrustPages(site),
    blogIndex: await auditBlogIndex(site),
    issues: [],
    nextActions: [],
  };
  audit.score = scoreSite(audit);
  audit.verdict = classifySite(audit);
  audit.issues = collectIssues(audit);
  audit.nextActions = makeNextActions(audit);
  return audit;
}

function renderMarkdown(report: AuditReport): string {
  const rows = report.sites
    .map(
      (site) =>
        `| ${site.id} | ${new URL(site.url).hostname} | ${site.platform} | ${site.verdict} | ${site.score} | ${site.issues.slice(0, 3).join("<br>") || "none"} | ${site.nextActions.slice(0, 3).join("<br>") || "none"} |`,
    )
    .join("\n");
  const blocked = report.sites
    .filter((site) => site.verdict === "blocked")
    .slice(0, 20)
    .map((site) => `- ${site.id}: ${site.nextActions.join("; ")}`)
    .join("\n");

  return `# AdSense Readiness Full Audit | ${OUTPUT_DATE}

Generated: ${report.generatedAt}

## Summary

- Targets: ${report.targetCount}
- Ready: ${report.summary.ready}
- Review: ${report.summary.review}
- Needs patch: ${report.summary.needs_patch}
- Blocked: ${report.summary.blocked}

## Highest Priority

${blocked || "- No blocked sites in the top issue list."}

## Full Site Matrix

| Site | Host | Stack | Verdict | Score | Top Issues | Next Actions |
| --- | --- | --- | --- | ---: | --- | --- |
${rows}

## Notes

- This audit checks public HTML and GSC sitemap list status. It does not infer actual AdSense account approval.
- Content body rewrites, article title rewrites, persona changes, and source additions are T3 editorial work and should be handled in a content workflow.
- Auto Ads loader is checked only as a site-wide script. Manual ad slot placement is intentionally out of scope.
`;
}

async function main(): Promise<void> {
  const sites = (await loadSites()).filter(
    (site) => site.enabled !== false && site.monetization !== false,
  );
  const gscClient = await makeGscClient();
  const limit = pLimit(CONCURRENCY);
  const audits = await Promise.all(
    sites.map((site) => limit(() => auditSite(site, gscClient))),
  );
  const sorted = audits.sort(
    (a, b) => a.score - b.score || a.id.localeCompare(b.id),
  );
  const summary: Record<SiteVerdict, number> = {
    ready: 0,
    review: 0,
    needs_patch: 0,
    blocked: 0,
  };
  for (const site of sorted) {
    summary[site.verdict] += 1;
  }

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    targetCount: sorted.length,
    summary,
    sites: sorted,
  };

  await mkdir("data", { recursive: true });
  await mkdir("docs", { recursive: true });
  await writeFile(
    JSON_OUTPUT_PATH,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  await writeFile(MD_OUTPUT_PATH, renderMarkdown(report), "utf8");
  console.log(
    `AdSense readiness audit complete: targets=${report.targetCount}, ready=${summary.ready}, review=${summary.review}, needs_patch=${summary.needs_patch}, blocked=${summary.blocked}, json=${JSON_OUTPUT_PATH}, markdown=${MD_OUTPUT_PATH}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
