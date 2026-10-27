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
