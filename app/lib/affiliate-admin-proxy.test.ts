import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { affiliateAdminAsset, affiliateAdminProxy } from "./affiliate-admin-proxy";

const dashboard = "https://dashboard.example";
const api = "https://affiliate.example";
const token = "a".repeat(43);
const csrf = "b".repeat(64);
const cookie = `__Secure-affiliate_dashboard_session=${token}`;
const request = (path: string, method = "GET", headers: Record<string, string> = {}, body?: string) => new Request(`${dashboard}${path}`, { method, headers, body });
const proxy = (path: string, method = "GET", headers: Record<string, string> = {}, body?: string) => affiliateAdminProxy(request(path, method, headers, body), new URL(path, dashboard).pathname.slice(1).split("/").map(part => decodeURIComponent(part)));

beforeEach(() => {
  process.env.AFFILIATE_API_ORIGIN = api;
  process.env.AFFILIATE_DASHBOARD_ORIGIN = dashboard;
  process.env.AFFILIATE_GATEWAY_AUTH = "Basic dGVzdDp0ZXN0";
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const name of ["AFFILIATE_API_ORIGIN", "AFFILIATE_DASHBOARD_ORIGIN", "AFFILIATE_GATEWAY_AUTH", "AFFILIATE_API_CA_CERT"]) delete process.env[name];
});

describe("same-host Affiliate OS administrator proxy", () => {
  it("rejects unknown methods, encoded path tricks, missing sessions and foreign writes before network", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await proxy("/api/admin/evil", "GET", { cookie })).status).toBe(404);
    expect((await proxy("/api/admin/workspace/backups/not-an-id", "GET", { cookie })).status).toBe(404);
    expect((await proxy("/api/admin/brain/summary", "POST", { cookie, origin: dashboard })).status).toBe(404);
    expect((await proxy("/api/admin/brain/summary")).status).toBe(401);
    expect((await proxy("/api/admin/sites", "POST", { cookie, origin: "https://evil.example", "content-type": "application/json", "x-csrf-token": csrf }, "{}")).status).toBe(403);
    expect((await proxy("/api/admin/sites", "POST", { cookie, origin: dashboard, "content-type": "application/json" }, "{}")).status).toBe(403);
    expect((await proxy("/api/admin/sites", "POST", { cookie, origin: dashboard, "content-type": "text/plain", "x-csrf-token": csrf }, "{}")).status).toBe(400);
    const oversized = await proxy("/api/admin/workspace/source/files", "POST", { cookie, origin: dashboard, "content-type": "application/json", "x-csrf-token": csrf, "content-length": "4000001" }, "{}");
    expect(oversized.status).toBe(413);
    expect(await oversized.text()).toContain("4 MB");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shares login and logout cookie with the readonly BFF and forwards only selected headers", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ user: { username: "admin", role: "admin" }, csrf }, { headers: { "set-cookie": `__Host-affiliate_session=${token}; Path=/; Secure; HttpOnly` } }))
      .mockResolvedValueOnce(Response.json({ sites: [] }))
      .mockResolvedValueOnce(Response.json({ logged_out: true }));
    vi.stubGlobal("fetch", fetch);
    const login = await proxy("/api/auth/login", "POST", { origin: dashboard, "content-type": "application/json", "x-leak": "secret" }, JSON.stringify({ username: "admin", password: "pw" }));
    expect(login.status).toBe(200);
    expect(login.headers.get("set-cookie")).toContain(`${cookie}; Path=/; HttpOnly; Secure`);
    expect(await login.text()).not.toContain(token);
    const sites = await proxy("/api/admin/sites", "GET", { cookie, authorization: "Bearer hostile", "x-leak": "secret" });
    expect(sites.status).toBe(200);
    expect(fetch.mock.calls[1][1].headers.get("cookie")).toBe(`__Host-affiliate_session=${token}`);
    expect(fetch.mock.calls[1][1].headers.get("authorization")).toBe("Basic dGVzdDp0ZXN0");
    expect(fetch.mock.calls[1][1].headers.get("x-leak")).toBeNull();
    const logout = await proxy("/api/auth/logout", "POST", { cookie, origin: dashboard, "content-type": "application/json", "x-csrf-token": csrf }, "{}");
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("passes CSV downloads, enforces response limit, and never follows redirects", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response("currency,amount\nKRW,1", { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=report.csv" } }))
      .mockResolvedValueOnce(new Response("x".repeat(4_000_001), { headers: { "content-type": "text/csv" } }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://evil.example" } }));
    vi.stubGlobal("fetch", fetch);
    const path = "/api/admin/workspace/analytics.csv?from=2026-10-01";
    const csv = await proxy(path, "GET", { cookie });
    expect(csv.status).toBe(200);
    expect(csv.headers.get("content-disposition")).toContain("report.csv");
    let rejected = false;
    try { await (await proxy(path, "GET", { cookie })).arrayBuffer(); } catch { rejected = true; }
    expect(rejected).toBe(true);
    expect((await proxy(path, "GET", { cookie })).status).toBe(502);
    expect(fetch.mock.calls[0][1].redirect).toBe("error");
  });

  it("discards the browser session after a validated logout request even when upstream fails", async () => {
    const fetch = vi.fn().mockRejectedValue(Error("private upstream failure"));
    vi.stubGlobal("fetch", fetch);
    const response = await proxy("/api/auth/logout", "POST", { cookie, origin: dashboard, "content-type": "application/json", "x-csrf-token": csrf }, "{}");
    expect(response.status).toBe(502);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(response.headers.get("x-affiliate-session-cleared")).toBe("1");
    expect(await response.text()).not.toContain("private upstream failure");
  });

  it("serves only the fixed administrator assets with same-origin CSP", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response("<html></html>", { headers: { "content-type": "text/html; charset=utf-8" } }))
      .mockResolvedValueOnce(new Response("void 0;", { headers: { "content-type": "application/javascript; charset=utf-8" } }))
      .mockResolvedValueOnce(new Response("body{}", { headers: { "content-type": "text/css; charset=utf-8" } }));
    vi.stubGlobal("fetch", fetch);
    const page = await affiliateAdminAsset("/admin");
    expect(page.status).toBe(200);
    expect(page.headers.get("content-security-policy")).toContain("connect-src 'self'");
    expect(fetch.mock.calls[0][0]).toBe(`${api}/admin`);
    expect((await affiliateAdminAsset("/workspace.js")).status).toBe(200);
    expect((await affiliateAdminAsset("/workspace.css")).status).toBe(200);
  });
});
