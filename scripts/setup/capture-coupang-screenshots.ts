import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { chromium, type Page } from "@playwright/test";

type Target = {
  domain: string;
  siteKey: string;
  url: string;
};

const TARGETS: Target[] = [
  { siteKey: "todaypharm", domain: "todaypharm.kr", url: "https://todaypharm.kr/" },
  { siteKey: "tennisfrens", domain: "tennisfrens.com", url: "https://tennisfrens.com/" },
  { siteKey: "picklefriend", domain: "picklefriend.kr", url: "https://picklefriend.kr/" },
  { siteKey: "dogswhere", domain: "dogswhere.com", url: "https://dogswhere.com/" },
  { siteKey: "cartain-2", domain: "cartain.kr", url: "https://cartain.kr/" },
  { siteKey: "temon", domain: "temon.kr", url: "https://temon.kr/" },
  { siteKey: "roadways", domain: "roadways.kr", url: "https://roadways.kr/" },
  { siteKey: "dullegilgogo", domain: "dullegilgogo.kr", url: "https://dullegilgogo.kr/" },
  { siteKey: "campgogo", domain: "campgogo.kr", url: "https://campgogo.kr/" },
];

const OUT_DIR = join("output", "coupang-screenshots", "2026-07-03");
const AD_HOST_PATTERNS = [
  "googlesyndication.com",
  "googleadservices.com",
  "doubleclick.net",
  "adservice.google.",
  "google-analytics.com",
  "googletagmanager.com",
  "adnxs.com",
  "taboola.com",
  "criteo.com",
  "hong2010.co.kr",
];

type CaptureResult = {
  adNodes?: number;
  domain: string;
  hasDisclosure?: boolean;
  screenshot?: string;
  siteKey: string;
  status: "ok" | "error";
  url: string;
  visualNotes?: string[];
};

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    viewport: { width: 1365, height: 1180 },
  });
  await context.route("**/*", (route) => {
    const requestUrl = route.request().url().toLowerCase();
    if (AD_HOST_PATTERNS.some((pattern) => requestUrl.includes(pattern))) {
      return route.abort();
    }
    return route.continue();
  });

  const results: CaptureResult[] = [];
  for (const target of TARGETS) {
    const page = await context.newPage();
    try {
      await page.goto(target.url, { timeout: 45_000, waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
      await dismissCookieBars(page);
      await hideVisualNoise(page);

      const adLink = page.locator('a[href*="/api/banner-management/click"]').first();
      await adLink.waitFor({ state: "visible", timeout: 20_000 });
      await adLink.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1_200);
      await hideVisualNoise(page);

      const screenshot = join(OUT_DIR, `${target.siteKey}-${target.domain}.png`);
      await page.screenshot({ fullPage: false, path: screenshot });
      const adNodes = await page.locator('a[href*="/api/banner-management/click"], img[src*="/api/banner-management/image"]').count();
      const hasDisclosure = (await page.locator("body").innerText()).includes("쿠팡 파트너스");
      const visualNotes = await collectVisualNotes(page);
      results.push({
        ...target,
        adNodes,
        hasDisclosure,
        screenshot,
        status: "ok",
        visualNotes,
      });
    } catch (error) {
      results.push({
        ...target,
        status: "error",
        visualNotes: [error instanceof Error ? error.message : String(error)],
      });
    } finally {
      await page.close();
    }
  }

  await browser.close();
  const manifestPath = join(OUT_DIR, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), targets: results }, null, 2));
  console.log(`wrote=${manifestPath}`);
  console.log(`ok=${results.filter((result) => result.status === "ok").length} total=${results.length}`);
  console.log(`dir=${OUT_DIR}`);
  console.log(`zipHint=${join("output", "coupang-screenshots", `${basename(OUT_DIR)}.zip`)}`);
}

async function dismissCookieBars(page: Page): Promise<void> {
  const labels = ["동의", "수락", "확인", "Accept", "I agree"];
  for (const label of labels) {
    const button = page.getByRole("button", { name: new RegExp(label, "i") }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => undefined);
    }
  }
}

async function hideVisualNoise(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      iframe,
      ins.adsbygoogle,
      [id^="google_ads"],
      [id*="google_ads_iframe"],
      [id*="aswift"],
      [class*="adsbygoogle"],
      [data-ad-client],
      [aria-label*="advertisement" i] {
        display: none !important;
        visibility: hidden !important;
      }
    `,
  });
  await page.evaluate(() => {
    const clickSelector = 'a[href*="/api/banner-management/click"]';
    for (const element of Array.from(document.body.querySelectorAll<HTMLElement>("body *"))) {
      if (element.closest(clickSelector)) continue;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const isFixedOverlay =
        (style.position === "fixed" || style.position === "sticky") &&
        Number.parseInt(style.zIndex || "0", 10) >= 1000 &&
        rect.width > window.innerWidth * 0.25 &&
        rect.height > 40;
      const text = element.innerText || "";
      const looksLikeCookieBar = /cookie|쿠키|동의|수락|집단,\s*사회/i.test(text) && rect.height > 30;
      if (isFixedOverlay || looksLikeCookieBar) {
        element.style.setProperty("display", "none", "important");
        element.style.setProperty("visibility", "hidden", "important");
      }
    }
  });
}

async function collectVisualNotes(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const notes: string[] = [];
    const bodyText = document.body.innerText || "";
    if (bodyText.includes("????") || bodyText.includes("���")) notes.push("body-text-garbled");
    const adImages = Array.from(document.querySelectorAll<HTMLImageElement>('img[src*="/api/banner-management/image"]'));
    for (const image of adImages) {
      if (image.naturalWidth === 0 || image.naturalHeight === 0) notes.push("ad-image-not-loaded");
    }
    return notes;
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
