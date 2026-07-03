import { expect, test } from "@playwright/test";

test("top navigation opens the dedicated affiliate operations page", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("link", { name: "제휴" }).click();

  await expect(page).toHaveURL(/\/affiliate$/);
  await expect(
    page.locator(".header-menu").getByRole("link", { name: "제휴" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1, name: "제휴" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "제휴 운영 저장소" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "우선순위 항목" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "배너 적용 준비" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "프로그램 저장소" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "운영 규칙" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "리플알바 고단가 후보" })).toBeVisible();
  await expect(page.locator("body")).toContainText("LinkPrice");
  await expect(page.locator("body")).toContainText("Adpick");
  await expect(page.locator("body")).toContainText("API");
});

test("affiliate inventory is excluded from dashboard tabs", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("tab", { name: /제휴/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "제휴" })).toHaveAttribute(
    "href",
    "/affiliate",
  );
});
