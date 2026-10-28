import { expect, test } from "@playwright/test";

const key = "multi-dashboard.affiliate-admin-url.v1";

test("two menus open the server workspace and Affiliate OS page", async ({ page }) => {
  await page.goto("/");
  const menu = page.getByRole("navigation", { name: "주 메뉴" });
  await expect(menu.getByRole("link")).toHaveText(["서버별 사이트", "제휴마케팅"]);
  await expect(menu.getByRole("link", { name: "서버별 사이트" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("tab")).toHaveCount(0);
  await menu.getByRole("link", { name: "제휴마케팅", exact: true }).click();
  await expect(page).toHaveURL(/\/affiliate-marketing$/);
  await expect(page.getByRole("heading", { level: 1, name: "제휴마케팅" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "제휴마케팅", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Affiliate OS 관리자 열기" })).toHaveAttribute("href", "http://127.0.0.1:18787/admin");
  await expect(page.getByRole("heading", { name: "원장과 운영 현황", exact: true })).toBeVisible();
});

for (const route of ["/affiliate", "/banner-management"]) {
  test(`retired ${route} redirects to new marketing workspace`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/affiliate-marketing$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("제휴마케팅");
  });
}

test("settings persist, reject unsafe HTTP and reset without changing services", async ({ page }) => {
  await page.goto("/affiliate-marketing");
  await page.getByText("접속 주소 설정", { exact: true }).click();
  const input = page.getByLabel("Affiliate OS 관리자 주소", { exact: true });
  const save = page.getByRole("button", { name: "접속 주소 저장", exact: true });
  const link = page.getByRole("link", { name: "Affiliate OS 관리자 열기" });
  await input.fill("http://unsafe.example.com/admin"); await save.click();
  await expect(page.getByRole("region", { name: "관리자 접속", exact: true }).getByRole("status")).toContainText("HTTPS 주소");
  await expect(link).toHaveAttribute("href", "http://127.0.0.1:18787/admin");
  await input.fill("https://affiliate.example.com/admin"); await save.click();
  await expect(link).toHaveAttribute("href", "https://affiliate.example.com/admin");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await page.reload();
  await expect(link).toHaveAttribute("href", "https://affiliate.example.com/admin");
  await page.getByText("접속 주소 설정", { exact: true }).click();
  await page.getByRole("button", { name: "기본 주소로 복원" }).click();
  await expect(link).toHaveAttribute("href", "http://127.0.0.1:18787/admin");
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
});

test("corrupt stored URL falls back safely", async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, "javascript:alert(1)"), key);
  await page.goto("/affiliate-marketing");
  await expect(page.getByRole("link", { name: "Affiliate OS 관리자 열기" })).toHaveAttribute("href", "http://127.0.0.1:18787/admin");
  await expect(page.getByRole("region", { name: "관리자 접속", exact: true }).getByRole("status")).toContainText("저장된 주소가 올바르지 않아");
});

test("unavailable storage reports save failure", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(Storage.prototype, "setItem", { value: () => { throw new Error("blocked"); } }); });
  await page.goto("/affiliate-marketing");
  await page.getByText("접속 주소 설정", { exact: true }).click();
  await page.getByLabel("Affiliate OS 관리자 주소", { exact: true }).fill("https://affiliate.example.com/admin");
  await page.getByRole("button", { name: "접속 주소 저장", exact: true }).click();
  await expect(page.getByRole("region", { name: "관리자 접속", exact: true }).getByRole("status")).toContainText("주소를 저장하지 못했습니다");
  await expect(page.getByRole("link", { name: "Affiliate OS 관리자 열기" })).toHaveAttribute("href", "http://127.0.0.1:18787/admin");
});
