import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { chromium, type Page } from "@playwright/test";

type CoupangChannelStatus =
  | "not_registered"
  | "registered"
  | "screenshot_submitted"
  | "approved"
  | "rejected"
  | "paused";

type Registry = {
  channels: Array<{
    captureEnabled?: boolean;
    channelType?: string;
    domain: string;
    siteId: string;
    status: CoupangChannelStatus;
  }>;
};

type Target = {
  domain: string;
  siteKey: string;
  status: CoupangChannelStatus;
  url: string;
};

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

const REGISTRY_PATH = join("data", "coupang-channel-registry.json");
const OUT_DIR = join("output", "coupang-screenshots", getDateStamp());
const ALLOWED_STATUSES = new Set<CoupangChannelStatus>([
  "registered",
  "screenshot_submitted",
  "approved",
]);
const REQUIRED_DISCLOSURE =
  "이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";
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

async function main(): Promise<void> {
  const targets = loadTargets();
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
  for (const target of targets) {
    console.log(`capture:start site=${target.siteKey} url=${target.url}`);
    const page = await context.newPage();
    try {
      await page.goto(target.url, { timeout: 25_000, waitUntil: "domcontentloaded" });
      await page.waitForLoadState("load", { timeout: 8_000 }).catch(() => undefined);
      await dismissCookieBars(page);
      await retryAfterNavigation(() => hideVisualNoise(page));

      await page.locator('a[href*="/api/banner-management/click"]').first().waitFor({ state: "attached", timeout: 12_000 });
      const visibleBlock = await retryAfterNavigation(() => scrollVisibleCoupangBlockIntoView(page));
      if (!visibleBlock.found) {
        throw new Error(`No visibly rendered Coupang block found. links=${visibleBlock.linkCount}`);
      }
      await retryAfterNavigation(() => forceLoadCoupangImages(page));
      await page.waitForTimeout(1_000);
      await retryAfterNavigation(() => hideVisualNoise(page));
      await waitForCoupangImages(page);

      const visibleAfterScroll = await retryAfterNavigation(() => getVisibleCoupangBlock(page));
      if (!visibleAfterScroll?.found) {
        throw new Error("Coupang block disappeared after scrolling.");
      }
      if (visibleAfterScroll.width < 120 || visibleAfterScroll.height < 40) {
        throw new Error(
          `Coupang block is too small for approval evidence. width=${visibleAfterScroll.width} height=${visibleAfterScroll.height}`,
        );
      }

      const screenshot = join(OUT_DIR, `${target.siteKey}-${target.domain}.png`);
      await page.screenshot({ fullPage: false, path: screenshot });
      const bodyText = await page.locator("body").innerText();
      const adNodes = await page
        .locator('a[href*="/api/banner-management/click"], img[src*="/api/banner-management/image"]')
        .count();
      const hasDisclosure = bodyText.includes(REQUIRED_DISCLOSURE);
      const visualNotes = await retryAfterNavigation(() => collectVisualNotes(page));
      if (!hasDisclosure) visualNotes.push("required-disclosure-not-found");

      results.push({
        ...target,
        adNodes,
        hasDisclosure,
        screenshot,
        status: "ok",
        visualNotes,
      });
      console.log(`capture:ok site=${target.siteKey} file=${screenshot}`);
    } catch (error) {
      results.push({
        ...target,
        status: "error",
        visualNotes: [error instanceof Error ? error.message : String(error)],
      });
      console.log(`capture:error site=${target.siteKey} reason=${error instanceof Error ? error.message : error}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  const manifestPath = join(OUT_DIR, "manifest.json");
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        requiredDisclosure: REQUIRED_DISCLOSURE,
        targets: results,
      },
      null,
      2,
    ),
  );
  console.log(`wrote=${manifestPath}`);
  console.log(`ok=${results.filter((result) => result.status === "ok").length} total=${results.length}`);
  console.log(`dir=${OUT_DIR}`);
  console.log(`zipHint=${join("output", "coupang-screenshots", `${basename(OUT_DIR)}.zip`)}`);
}

function loadTargets(): Target[] {
  if (!existsSync(REGISTRY_PATH)) {
    throw new Error(`Missing Coupang channel registry: ${REGISTRY_PATH}`);
  }
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as Registry;
  return registry.channels
    .filter((channel) => ALLOWED_STATUSES.has(channel.status))
    .filter((channel) => !["blog", "social"].includes(channel.channelType ?? "website"))
    .filter((channel) => channel.captureEnabled !== false)
    .map((channel) => ({
      domain: channel.domain,
      siteKey: channel.siteId,
      status: channel.status,
      url: `https://${channel.domain}/`,
    }))
    .sort((left, right) => left.domain.localeCompare(right.domain));
}

function getDateStamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function dismissCookieBars(page: Page): Promise<void> {
  const labels = ["동의", "허용", "확인", "Accept", "I agree"];
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
      [data-ad-client] {
        display: none !important;
        visibility: hidden !important;
      }
    `,
  });
}

async function scrollVisibleCoupangBlockIntoView(page: Page): Promise<{
  found: boolean;
  linkCount: number;
}> {
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/api/banner-management/click"]'));
    for (const link of links) {
      if (!isRendered(link)) continue;
      const block = link.closest("aside") ?? link;
      block.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });
      return { found: true, linkCount: links.length };
    }
    return { found: false, linkCount: links.length };

    function isRendered(element: HTMLElement): boolean {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    }
  });
}

async function getVisibleCoupangBlock(page: Page): Promise<{
  found: boolean;
  height: number;
  width: number;
} | null> {
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/api/banner-management/click"]'));
    for (const link of links) {
      const style = window.getComputedStyle(link);
      const block = link.closest("aside") ?? link;
      const rect = block.getBoundingClientRect();
      if (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      ) {
        return { found: true, height: rect.height, width: rect.width };
      }
    }
    return { found: false, height: 0, width: 0 };
  });
}

async function forceLoadCoupangImages(page: Page): Promise<void> {
  await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll<HTMLImageElement>('img[src*="/api/banner-management/image"]'));
    for (const image of images) {
      image.loading = "eager";
      image.decoding = "sync";
      const src = image.currentSrc || image.src;
      image.src = "";
      image.src = src;
    }
  });
}

async function waitForCoupangImages(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () => {
        const images = Array.from(document.querySelectorAll<HTMLImageElement>('img[src*="/api/banner-management/image"]'));
        return images.length > 0 && images.some((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
      },
      undefined,
      { timeout: 10_000 },
    )
    .catch(() => undefined);
}

async function retryAfterNavigation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Execution context was destroyed") && !message.includes("navigation")) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    return operation();
  }
}

async function collectVisualNotes(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const notes: string[] = [];
    const bodyText = document.body.innerText || "";
    if (bodyText.includes("????") || bodyText.includes("占쏙옙")) notes.push("body-text-garbled");
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
