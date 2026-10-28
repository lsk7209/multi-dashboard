import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { affiliateOsRequest } from "./affiliate-os-api";

const dashboard = "https://dashboard.example";
const api = "https://affiliate.example";
const token = "a".repeat(43);
const csrf = "b".repeat(64);

function request(operation: string, method = "GET", headers: Record<string, string> = {}, body?: string) {
  return new Request(`${dashboard}/api/affiliate-os/${operation}`, { method, headers, body });
}

beforeEach(() => {
  process.env.AFFILIATE_API_ORIGIN = api;
  process.env.AFFILIATE_DASHBOARD_ORIGIN = dashboard;
  process.env.AFFILIATE_GATEWAY_AUTH = "Basic dGVzdDp0ZXN0";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.AFFILIATE_API_ORIGIN;
  delete process.env.AFFILIATE_DASHBOARD_ORIGIN;
  delete process.env.AFFILIATE_GATEWAY_AUTH;
});

describe("Affiliate OS BFF", () => {
  it("fails closed on missing configuration, unknown routes, and missing sessions", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    delete process.env.AFFILIATE_GATEWAY_AUTH;
    expect((await affiliateOsRequest(request("summary"), "summary")).status).toBe(503);
    process.env.AFFILIATE_GATEWAY_AUTH = "Basic dGVzdDp0ZXN0";
    expect((await affiliateOsRequest(request("unknown"), "unknown")).status).toBe(404);
    expect((await affiliateOsRequest(request("session"), "session")).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects foreign origin and malformed login before any network call", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const wrong = request("login", "POST", { origin: "https://evil.example", "content-type": "application/json" }, JSON.stringify({ username: "admin", password: "password" }));
    expect((await affiliateOsRequest(wrong, "login")).status).toBe(403);
    const oversized = request("login", "POST", { origin: dashboard, "content-type": "application/json" }, JSON.stringify({ username: "admin", password: "x".repeat(2100) }));
    expect((await affiliateOsRequest(oversized, "login")).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("exchanges a valid upstream login cookie without exposing it in JSON", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ user: { username: "admin", role: "admin" }, csrf }, {
      headers: { "set-cookie": `__Host-affiliate_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict` },
    }));
    vi.stubGlobal("fetch", fetch);
    const response = await affiliateOsRequest(request("login", "POST", { origin: dashboard, "content-type": "application/json", "x-injected": "secret" }, JSON.stringify({ username: "admin", password: "password", extra: "ignored" })), "login");
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(`__Secure-affiliate_dashboard_session=${token}`);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly; Secure; SameSite=Strict; Max-Age=28800");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.stringify(await response.json())).not.toContain(token);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${api}/api/auth/login`);
    expect(options.headers.get("origin")).toBe(api);
    expect(options.headers.get("authorization")).toBe("Basic dGVzdDp0ZXN0");
    expect(options.headers.get("x-injected")).toBeNull();
    expect(JSON.parse(options.body)).toEqual({ username: "admin", password: "password" });
  });

  it("forwards only valid session cookie and whitelisted bounded query", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ items: [] }));
    vi.stubGlobal("fetch", fetch);
    const response = await affiliateOsRequest(request("items?limit=40&q=lamp", "GET", { cookie: `other=secret; __Secure-affiliate_dashboard_session=${token}`, authorization: "Bearer evil" }), "items");
    expect(response.status).toBe(200);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${api}/api/admin/brain/items?limit=40&q=lamp`);
    expect(options.headers.get("cookie")).toBe(`__Host-affiliate_session=${token}`);
    expect(options.headers.get("authorization")).toBe("Basic dGVzdDp0ZXN0");
    expect(options.redirect).toBe("error");
    expect(options.cache).toBe("no-store");
    expect((await affiliateOsRequest(request("items?limit=201", "GET", { cookie: `__Secure-affiliate_dashboard_session=${token}` }), "items")).status).toBe(400);
    expect((await affiliateOsRequest(request("items?limit=101", "GET", { cookie: `__Secure-affiliate_dashboard_session=${token}` }), "items")).status).toBe(400);
    expect((await affiliateOsRequest(request("items?offset=2000001", "GET", { cookie: `__Secure-affiliate_dashboard_session=${token}` }), "items")).status).toBe(400);
    expect((await affiliateOsRequest(request("items?url=https://evil.example", "GET", { cookie: `__Secure-affiliate_dashboard_session=${token}` }), "items")).status).toBe(400);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("sends CSRF only to logout and clears the browser cookie", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ logged_out: true }));
    vi.stubGlobal("fetch", fetch);
    const response = await affiliateOsRequest(request("logout", "POST", { origin: dashboard, cookie: `__Secure-affiliate_dashboard_session=${token}`, "x-csrf-token": csrf }), "logout");
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(response.headers.get("x-affiliate-session-cleared")).toBeNull();
    expect(fetch.mock.calls[0][1].headers.get("x-csrf-token")).toBe(csrf);
  });

  it("clears a validated logout cookie on upstream failure and logs only safe categories", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const fetch = vi.fn().mockRejectedValue(Error(`private URL and credential ${token}`));
      vi.stubGlobal("fetch", fetch);
      const headers = { origin: dashboard, cookie: `__Secure-affiliate_dashboard_session=${token}`, "x-csrf-token": csrf };
      const failed = await affiliateOsRequest(request("logout", "POST", headers), "logout");
      expect(failed.status).toBe(502);
      expect(failed.headers.get("set-cookie")).toContain("Max-Age=0");
      expect(failed.headers.get("x-affiliate-session-cleared")).toBe("1");
      expect(warning).toHaveBeenCalledWith("[affiliate-os]", { operation: "logout", category: "transport_failure" });
      expect(JSON.stringify(warning.mock.calls)).not.toContain(token);
      fetch.mockResolvedValue(Response.json({ error: "private upstream response" }, { status: 500 }));
      const rejected = await affiliateOsRequest(request("logout", "POST", headers), "logout");
      expect(rejected.headers.get("set-cookie")).toContain("Max-Age=0");
      const invalid = await affiliateOsRequest(request("logout", "POST", { ...headers, origin: "https://evil.example" }), "logout");
      expect(invalid.status).toBe(403);
      expect(invalid.headers.get("set-cookie")).toBeNull();
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally { warning.mockRestore(); }
  });

  it("sanitizes upstream errors and rejects oversized responses", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ error: "backend secret" }, { status: 403 }));
    vi.stubGlobal("fetch", fetch);
    const headers = { cookie: `__Secure-affiliate_dashboard_session=${token}` };
    const denied = await affiliateOsRequest(request("summary", "GET", headers), "summary");
    expect(denied.status).toBe(403);
    expect(await denied.text()).not.toContain("backend secret");
    fetch.mockResolvedValue(Response.json({ data: "x".repeat(1_000_000) }));
    expect((await affiliateOsRequest(request("summary", "GET", headers), "summary")).status).toBe(502);
    fetch.mockRejectedValue(Error("secret network address"));
    const failure = await affiliateOsRequest(request("summary", "GET", headers), "summary");
    expect(failure.status).toBe(502);
    expect(await failure.text()).not.toContain("secret network address");
  });

  it("does not issue a browser cookie for malformed auth responses", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ user: { username: "admin" } }, {
      headers: { "set-cookie": `__Host-affiliate_session=${token}; Path=/; HttpOnly; Secure` },
    }));
    vi.stubGlobal("fetch", fetch);
    const login = await affiliateOsRequest(request("login", "POST", { origin: dashboard, "content-type": "application/json" }, JSON.stringify({ username: "admin", password: "password" })), "login");
    expect(login.status).toBe(502);
    expect(login.headers.get("set-cookie")).toBeNull();
    fetch.mockResolvedValue(Response.json({ authenticated: true, user: { username: "admin", role: "admin" } }));
    const session = await affiliateOsRequest(request("session", "GET", { cookie: `__Secure-affiliate_dashboard_session=${token}` }), "session");
    expect(session.status).toBe(502);
  });
});
