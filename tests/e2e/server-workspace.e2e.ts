import { expect, test } from "@playwright/test";

test("server filters, search, details and legacy server URL work", async ({ page }) => {
  await page.goto("/servers");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("사이트 운영 현황");
  const search = page.getByRole("searchbox");
  await search.fill("campgogo");
  await expect(page.locator("tbody tr").first()).toContainText("campgogo");
  await search.fill("no-such-domain-20261028");
  await expect(page.getByRole("table",{name:"사이트 운영 통계",exact:true}).locator("tbody")).toContainText("없습니다");
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

test("operator core and paused lists remain separate from public host failures", async ({ page }) => {
  await page.goto("/");
  const filters = page.getByRole("group", {name:"서버 필터"});
  await filters.getByRole("button", {name:"운영 보류24",exact:true}).click();
  const table = page.getByRole("table", {name:"사이트 운영 통계",exact:true});
  await expect(table.getByRole("rowheader")).toHaveCount(24);
  await expect(table).toContainText("mbti.tasko.kr");
  await expect(table).toContainText("food.2mlab.kr");
  await expect(page.getByRole("button", {name:/접속 확인 0/})).toBeVisible();
  await filters.getByRole("button", {name:"핵심 운영106",exact:true}).click();
  await expect(table.getByRole("rowheader")).toHaveCount(106);
  const failedCore = table.getByRole("row").filter({has:page.getByRole("link",{name:"knewstory.kr ↗",exact:true})});
  await expect(failedCore).toContainText("핵심 운영");
  await expect(failedCore).toContainText("410");
  await page.getByRole("button",{name:"상세 보기 spinkorea.kr",exact:true}).click();
  await expect(page.locator("#detail-spinkorea-kr")).toContainText("HostingKR");
  await expect(page.locator("#detail-spinkorea-kr")).toContainText("자동연장: 꺼짐");
  await expect(page.getByRole("table",{name:"핵심 도메인 만료 예정",exact:true}).getByRole("row")).toHaveCount(19);
  await page.getByRole("heading",{name:"사이트 운영 현황",exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:test.info().outputPath("portfolio-desktop.png")});
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole("heading",{name:"사이트 운영 현황",exact:true})).toBeVisible();
  await expect(filters.getByRole("button",{name:"운영 보류24",exact:true})).toBeVisible();
  await page.getByRole("heading",{name:"사이트 운영 현황",exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:test.info().outputPath("portfolio-mobile.png")});
});
