import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET as adminPage } from "../admin/route";
import { GET as adminScript } from "../workspace.js/route";
import { GET as adminStyle } from "../workspace.css/route";
import { GET as adminGet } from "../api/admin/[...path]/route";
import { GET as authGet, POST as authPost } from "../api/auth/[...path]/route";

const dashboard = "https://dashboard.example";
const api = "https://affiliate.example";
const token = "a".repeat(43);
const csrf = "b".repeat(64);

beforeEach(() => {
  process.env.AFFILIATE_API_ORIGIN = api;
  process.env.AFFILIATE_DASHBOARD_ORIGIN = dashboard;
  process.env.AFFILIATE_GATEWAY_AUTH = "Basic dGVzdDp0ZXN0";
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const name of ["AFFILIATE_API_ORIGIN", "AFFILIATE_DASHBOARD_ORIGIN", "AFFILIATE_GATEWAY_AUTH"]) delete process.env[name];
});

it("wires the same-host administrator document, script, stylesheet and auth/admin handlers", async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(new Response('<a href="#catalog">링크 라이브러리</a><script src="/workspace.js"></script>', { headers: { "content-type": "text/html; charset=utf-8" } }))
    .mockResolvedValueOnce(new Response("void 0;", { headers: { "content-type": "application/javascript; charset=utf-8" } }))
    .mockResolvedValueOnce(new Response("body{}", { headers: { "content-type": "text/css; charset=utf-8" } }))
    .mockResolvedValueOnce(Response.json({ authenticated: true, user: { username: "admin", role: "admin" }, csrf }))
    .mockResolvedValueOnce(Response.json({ sites: [] }));
  vi.stubGlobal("fetch", fetch);
  expect((await adminPage()).status).toBe(200);
  expect((await adminScript()).headers.get("content-type")).toContain("application/javascript");
  expect((await adminStyle()).headers.get("content-type")).toContain("text/css");
  const session = await authGet(new Request(`${dashboard}/api/auth/session`, { headers: { cookie: `__Secure-affiliate_dashboard_session=${token}` } }), { params: Promise.resolve({ path: ["session"] }) });
  expect(session.status).toBe(200);
  const sites = await adminGet(new Request(`${dashboard}/api/admin/sites`, { headers: { cookie: `__Secure-affiliate_dashboard_session=${token}` } }), { params: Promise.resolve({ path: ["sites"] }) });
  expect(sites.status).toBe(200);
  expect(fetch.mock.calls.map(call => call[0])).toEqual([`${api}/admin`, `${api}/workspace.js`, `${api}/workspace.css`, `${api}/api/auth/session`, `${api}/api/admin/sites`]);
  expect((await authPost(new Request(`${dashboard}/api/auth/session`, { method: "POST", headers: { origin: dashboard } }), { params: Promise.resolve({ path: ["session"] }) })).status).toBe(404);
});
