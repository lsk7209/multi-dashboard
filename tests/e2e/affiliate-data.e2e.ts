import { expect, test } from "@playwright/test";

// API fixtures verify UI behavior only, never production integration or revenue.
test("unconfigured API reports the gap without showing invented counts", async ({ page }) => {
  await page.route("**/api/affiliate-os/session", route => route.fulfill({ status: 503, json: { error: "not_configured" } }));
  await page.goto("/affiliate-marketing");
  await expect(page.getByRole("region", { name: "원장과 운영 현황", exact: true }).getByRole("alert")).toContainText("아직 설정되지 않았습니다");
  await expect(page.locator(".affiliate-live-metrics")).toHaveCount(0);
});

test("authenticated fixture data, search, exact money and logout", async ({ page }) => {
  let loggedIn = false;
  const csrf = "fixture-only-csrf";
  const user = { username: "fixture-viewer", role: "viewer" };
  await page.route("**/api/affiliate-os/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const operation = url.pathname.split("/").pop();
    if (operation === "session") return route.fulfill({ status: loggedIn ? 200 : 401, json: loggedIn ? { authenticated: true, user, csrf } : { authenticated: false } });
    if (operation === "login") { expect(request.postDataJSON()).toEqual({ username: "fixture-viewer", password: "fixture-password" }); loggedIn = true; return route.fulfill({ json: { user, csrf } }); }
    if (operation === "logout") { expect(request.headers()["x-csrf-token"]).toBe(csrf); loggedIn = false; return route.fulfill({ json: { logged_out: true } }); }
    if (operation === "summary") return route.fulfill({ json: { total: 2, published_links: 0, metadata: { reviewed: 1 }, latest: null } });
    if (operation === "items") return route.fulfill({ json: { total: url.searchParams.get("q") ? 0 : 2, offset: 0, limit: 20, items: url.searchParams.get("q") ? [] : [{ source_network: "fixture-network", source_item_id: "fixture-item", title: "검토용 상품", merchant: null, metadata_status: "reviewed", quality_state: "ready" }] } });
    if (operation === "publications") return route.fulfill({ json: { items: [] } });
    if (operation === "sites") return route.fulfill({ json: { sites: [] } });
    if (operation === "analytics") return route.fulfill({ json: { period: { from: "2026-10-01", to: "2026-10-28", timezone: "UTC" }, events: { impressions: 0, clicks: 0, ctr: null }, revenue: [{ currency: "USD", status: "pending", attribution: "unattributed", orders: 1, amount_decimal: "0.123456789012345678", unknown_amount_orders: 0, legacy_orders: 0 }] } });
    throw new Error(`Unexpected operation ${operation}`);
  });
  await page.goto("/affiliate-marketing");
  await page.getByLabel("계정", { exact: true }).fill("fixture-viewer");
  await page.getByLabel("비밀번호", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Affiliate OS 로그인", exact: true }).click();
  await expect(page.getByText("fixture-viewer · 조회 계정")).toBeVisible();
  await expect(page.getByRole("cell", { name: "검토용 상품 fixture-item", exact: true })).toBeVisible();
  await expect(page.getByText("0.123456789012345678", { exact: true })).toBeVisible();
  await expect(page.getByText("아직 사이트별 승인 기록이 없습니다.")).toBeVisible();
  await page.getByLabel("상품명·판매처·분류", { exact: true }).fill("없음");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.getByText("검색 결과가 없습니다.")).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain("fixture-password");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain("fixture-only-csrf");
  await page.route("**/api/affiliate-os/logout", route => route.fulfill({ status: 502, headers: { "X-Affiliate-Session-Cleared": "1" }, json: { error: "upstream_failure" } }));
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page.getByRole("button", { name: "Affiliate OS 로그인", exact: true })).toBeVisible();
  await expect(page.locator(".affiliate-live-metrics")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "원장과 운영 현황", exact: true }).getByRole("alert")).toContainText("서버의 세션 종료 응답은 확인하지 못했습니다");
});

test("browser transport failure keeps the login state so logout can be retried", async ({ page }) => {
  await page.route("**/api/affiliate-os/**", route => {
    const operation = new URL(route.request().url()).pathname.split("/").pop();
    if (operation === "session") return route.fulfill({ json: { authenticated: true, user: { username: "fixture-admin", role: "admin" }, csrf: "a".repeat(64) } });
    if (operation === "logout") return route.abort("failed");
    return route.fulfill({ status: 502, json: { error: "fixture_unavailable" } });
  });
  await page.goto("/affiliate-marketing");
  const logout = page.getByRole("button", { name: "로그아웃", exact: true });
  await expect(logout).toBeVisible();
  await logout.click();
  await expect(logout).toBeEnabled();
  await expect(page.getByRole("button", { name: "Affiliate OS 로그인", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "원장과 운영 현황", exact: true }).getByRole("alert")).toContainText("다시 시도하세요");
});

test("malformed or failed API does not render zero as a successful result", async ({ page }) => {
  await page.route("**/api/affiliate-os/session", route => route.fulfill({ json: { authenticated: true, user: { username: "fixture-viewer", role: "viewer" }, csrf: "fixture-csrf" } }));
  await page.route("**/api/affiliate-os/summary", route => route.fulfill({ json: { total: -1 } }));
  await page.route(/\/api\/affiliate-os\/(items|publications|analytics|sites)/, route => route.fulfill({ status: 502, json: { error: "unavailable" } }));
  await page.goto("/affiliate-marketing");
  await expect(page.getByRole("region", { name: "원장과 운영 현황", exact: true }).getByRole("alert")).toContainText("불러오지 못했습니다");
  await expect(page.locator(".affiliate-live-metrics")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "새로고침", exact: true })).toBeEnabled();
});
