import { expect, test, type Page } from "@playwright/test";

test("dashboard hash opens banner operations with focused subtabs", async ({ page }) => {
  await page.goto("/#banners");

  await expect(page.getByRole("tab", { name: /Banners/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "배너 설정 운영" })).toBeVisible();

  const subTabs = page.locator(".ops-subtabs");
  await expect(subTabs.getByRole("button", { name: "Overview" })).toHaveAttribute("aria-pressed", "true");
  await expect(subTabs.getByRole("button", { name: "Sites" })).toBeVisible();
  await expect(subTabs.getByRole("button", { name: "Setup" })).toBeVisible();
  await expect(subTabs.getByRole("button", { name: "Assign" })).toBeVisible();
  await expect(subTabs.getByRole("button", { name: "Install" })).toBeVisible();
  await expect(subTabs.getByRole("button", { name: "Diagnostics" })).toBeVisible();
});

test("banner console stays usable with more than 100 sites", async ({ page }) => {
  await mockBannerManagementState(page, createLargeBannerState(120));
  await page.goto("/#banners");

  await expect(page.locator(".ops-metric-card").filter({ hasText: "운영 사이트" })).toContainText("120");
  await expect(page.locator(".ops-metric-card").filter({ hasText: "배정 누락" })).toContainText("12");

  const siteFilter = page.locator(".ops-filter-grid").getByRole("combobox").first();
  await expect(siteFilter.locator("option")).toHaveCount(121);
  await siteFilter.selectOption("site-075");

  const subTabs = page.locator(".ops-subtabs");
  await subTabs.getByRole("button", { name: "Sites" }).click();
  await expect(page.locator(".ops-site-summary")).toContainText("site-075");
  await expect(page.locator(".ops-site-summary")).not.toContainText("site-074");

  await subTabs.getByRole("button", { name: "Assign" }).click();
  await expect(page.locator(".ops-assignment select").first().locator("option")).toHaveCount(2);
  await expect(page.locator(".ops-assignment")).toContainText("site-075.hero");

  await subTabs.getByRole("button", { name: "Install" }).click();
  await expect(page.locator(".ops-install-panel")).toContainText("site-075.hero");
  await expect(page.locator(".ops-install-code")).toContainText("/api/banner-management/image?slot=site-075.hero");
  await expect(page.locator(".ops-install-code")).toContainText("/api/banner-management/click?slot=site-075.hero");
});

async function mockBannerManagementState(page: Page, state: ReturnType<typeof createLargeBannerState>) {
  await page.route("**/api/banner-management", async (route) => {
    await route.fulfill({
      body: JSON.stringify(state),
      contentType: "application/json",
      status: 200,
    });
  });
}

function createLargeBannerState(siteCount: number) {
  const creatives = [
    {
      height: 90,
      id: "creative-primary",
      imageUrl: "https://example.com/banner-primary.png",
      name: "Primary 728x90",
      offerId: "offer-primary",
      policyStatus: "approved",
      status: "active",
      width: 728,
    },
    {
      height: 90,
      id: "creative-review",
      imageUrl: "https://example.com/banner-review.png",
      name: "Review 728x90",
      offerId: null,
      policyStatus: "review",
      status: "paused",
      width: 728,
    },
  ];
  const trackingLinks = [
    {
      id: "tracking-primary",
      offerId: "offer-primary",
      offerName: "Primary offer",
      publicUrl: "https://example.com/go",
      slug: "primary-offer",
      status: "active",
    },
    {
      id: "tracking-needs-offer",
      offerId: null,
      offerName: "Needs offer",
      publicUrl: "https://example.com/needs-offer",
      slug: "needs-offer",
      status: "active",
    },
  ];
  const placements = Array.from({ length: siteCount }, (_, index) => {
    const number = index + 1;
    const siteKey = `site-${String(number).padStart(3, "0")}`;
    const assigned = number % 10 !== 0;
    const noAd = number % 15 === 0 ? 3 : 0;
    return {
      assignedCreativeId: assigned ? "creative-primary" : null,
      assignedCreativeName: assigned ? "Primary 728x90" : null,
      assignedTrackingLinkId: assigned ? "tracking-primary" : null,
      assignedTrackingSlug: assigned ? "primary-offer" : null,
      id: `placement-${siteKey}-hero`,
      imageRequests: 100 + number,
      name: `${siteKey} hero banner`,
      noAd,
      noAdPolicy: "transparent",
      requests: 120 + number,
      siteKey,
      siteUrl: `https://${siteKey}.example.com`,
      slotKey: "hero",
      status: "active",
      type: "image_link",
    };
  });
  const siteSummaries = placements.map((placement, index) => ({
    activePlacements: 1,
    assignedPlacements: placement.assignedCreativeId ? 1 : 0,
    clicks: index,
    imageRequests: placement.imageRequests,
    lastUpdatedAt: "2026-07-03T00:00:00.000Z",
    noAd: placement.noAd,
    placements: 1,
    requests: placement.requests,
    siteKey: placement.siteKey,
    siteUrl: placement.siteUrl,
    unassignedPlacements: placement.assignedCreativeId ? 0 : 1,
  }));

  return {
    adminAuthRequired: false,
    assignments: placements
      .filter((placement) => placement.assignedCreativeId)
      .map((placement, index) => ({
        creativeName: "Primary 728x90",
        id: `assignment-${placement.siteKey}`,
        placementId: placement.id,
        placementName: placement.name,
        placementSiteKey: placement.siteKey,
        placementSiteUrl: placement.siteUrl,
        placementSlotKey: placement.slotKey,
        status: "active",
        trackingSlug: "primary-offer",
        weight: 100 + index,
      })),
    creatives,
    dbExists: true,
    dbPath: "data/monetization/ad-manage.db",
    dbUpdatedAt: "2026-07-03T00:00:00.000Z",
    persistenceNote: "Test state",
    placements,
    publicBaseUrl: "http://127.0.0.1:3000",
    siteSummaries,
    trackingLinks,
    writable: true,
  };
}
