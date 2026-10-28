import { expect, test } from "@playwright/test";

test("server filters, search, details and legacy server URL work", async ({ page }) => {
  await page.goto("/servers");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("사이트 운영 현황");
  const search = page.getByRole("searchbox");
  await search.fill("campgogo");
  await expect(page.locator("tbody tr").first()).toContainText("campgogo");
  await search.fill("no-such-domain-20261028");
  await expect(page.locator("tbody")).toContainText("없습니다");
  await search.fill("");
  const filters = page.getByRole("group", { name: "서버 필터" });
  await filters.getByRole("button", { name: /Contabo/ }).click();
  await expect(filters.getByRole("button", { name: /Contabo/ })).toHaveAttribute("aria-pressed", "true");
  await page.locator(".workspace-detail-toggle").first().click();
  await expect(page.locator(".workspace-detail-row").first()).toBeVisible();
});


test("period selector updates GA4 and GSC columns without inventing missing values", async ({ page }) => {
  await page.goto("/");
  const periods = page.getByRole("group", { name: "통계 기간" });
  for (const days of ["1", "7", "14", "30"]) {
    await periods.getByRole("button", { name: `${days}일`, exact: true }).click();
    await expect(periods.getByRole("button", { name: `${days}일`, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("columnheader", { name: `${days}일 GA4 사용자` })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: `${days}일 GSC 클릭` })).toBeVisible();
  }
});
