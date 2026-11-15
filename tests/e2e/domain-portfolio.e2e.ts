import {test,expect} from "@playwright/test";

test("domain review tab lists only unlinked and paused-only holdings and sorts expiry",async({page})=>{
  await page.goto("/");
  await page.getByRole("navigation",{name:"주 메뉴"}).getByRole("link",{name:"미사용·확인 필요 도메인",exact:true}).click();
  await expect(page).toHaveURL(/\/domains$/);
  const table=page.getByRole("table",{name:"미사용·확인 필요 도메인",exact:true});
  await expect(table.getByRole("rowheader")).toHaveCount(7);
  for(const domain of ["kabi.kr","nowtip.kr","weddingfairfinder.com","chatgipt.kr","educaer.com","homeimer.com","luxurytraver.com"]) await expect(table.getByRole("rowheader",{name:domain,exact:true})).toBeVisible();
  await expect(table).not.toContainText("nekau.com");
  await expect(table).not.toContainText("sellerpit.kr");
  const dates=()=>table.locator("tbody tr").evaluateAll(rows=>rows.map(row=>row.children[4]!.textContent!.trim()));
  const ascending=await dates();
  expect(ascending).toEqual([...ascending].sort());
  await table.getByRole("columnheader",{name:/만료일/}).getByRole("link").click();
  await expect(table.getByRole("columnheader",{name:/만료일/})).toHaveAttribute("aria-sort","descending");
  expect(await dates()).toEqual([...ascending].sort().reverse());
  await page.screenshot({path:test.info().outputPath("domains-desktop.png")});
  await page.setViewportSize({width:390,height:844});
  await table.getByRole("columnheader",{name:/만료일/}).scrollIntoViewIfNeeded();
  await page.screenshot({path:test.info().outputPath("domains-mobile.png")});
});

test("site expiry header sorts both ways and Name.com evidence stays operator attributed",async({page})=>{
  await page.goto("/");
  const table=page.getByRole("table",{name:"사이트 운영 통계",exact:true});
  const header=table.getByRole("columnheader",{name:/도메인 만료일/});
  await header.getByRole("button").click();
  await expect(header).toHaveAttribute("aria-sort","ascending");
  const dates=()=>table.locator("tbody tr:not(.workspace-detail-row)").evaluateAll(rows=>rows.map(row=>row.lastElementChild!.firstElementChild!.textContent!.trim()));
  const ascending=await dates();
  const known=ascending.filter(date=>date!=="미확인");
  expect(known).toEqual([...known].sort());
  expect(ascending.slice(known.length).every(date=>date==="미확인")).toBe(true);
  await header.getByRole("button").click();
  await expect(header).toHaveAttribute("aria-sort","descending");
  const descending=await dates();
  expect(descending.filter(date=>date!=="미확인")).toEqual([...known].reverse());
  expect(descending.slice(known.length).every(date=>date==="미확인")).toBe(true);
  await page.getByRole("searchbox").fill("nekau.com");
  await expect(table.getByRole("rowheader")).toHaveCount(2);
  await expect(table).toContainText("2027-06-20");
  await expect(table).toContainText("사용자 제공 갱신 예정일 기준");
  await page.getByRole("button",{name:"상세 보기 nekau.com",exact:true}).click();
  await expect(page.locator("#detail-nekau-com")).toContainText("Name.com");
  await expect(page.locator("#detail-nekau-com")).toContainText("사용자 제공");
  await expect(page.locator("#detail-nekau-com")).toContainText("자동연장: 미확인");
});
