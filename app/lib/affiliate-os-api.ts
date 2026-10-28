import { affiliateConfiguration, clearSessionCookie, issuedSessionCookie, sessionToken, upstreamRequest, upstreamToken, UPSTREAM_COOKIE } from "./affiliate-upstream";
const MAX_RESPONSE = 1_000_000;
class UpstreamResponseError extends Error {
  constructor(readonly category: "invalid_content_type" | "oversized_response" | "empty_response") { super(category); }
}
const OPERATIONS: Record<string, { path: string; method: "GET" | "POST"; query?: readonly string[] }> = {
  login: { path: "/api/auth/login", method: "POST" },
  session: { path: "/api/auth/session", method: "GET" },
  logout: { path: "/api/auth/logout", method: "POST" },
  summary: { path: "/api/admin/brain/summary", method: "GET" },
  items: { path: "/api/admin/brain/items", method: "GET", query: ["q", "network", "quality", "limit", "offset"] },
  publications: { path: "/api/admin/brain/publications", method: "GET", query: ["site_key"] },
  analytics: { path: "/api/admin/workspace/analytics", method: "GET", query: ["from", "to", "site_key"] },
  sites: { path: "/api/admin/sites", method: "GET" },
};


function json(status: number, value: unknown, cookie?: string): Response {
  const headers = new Headers({ "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff" });
  if (cookie) headers.set("Set-Cookie", cookie);
  if (cookie === clearSessionCookie && status >= 400) headers.set("X-Affiliate-Session-Cleared", "1");
  return new Response(JSON.stringify(value), { status, headers });
}


function queryString(request: Request, keys: readonly string[] = []): string | null {
  const search = new URL(request.url).search;
  if (search.length > 1024) return null;
  const input = new URLSearchParams(search);
  const output = new URLSearchParams();
  for (const [key, value] of input) {
    if (!keys.includes(key) || output.has(key) || value.length > 120 || [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return null;
    if ((key === "limit" && (!/^\d{1,3}$/.test(value) || Number(value) > 100)) ||
        (key === "offset" && (!/^\d{1,7}$/.test(value) || Number(value) > 2_000_000)) ||
        (["from", "to"].includes(key) && !/^\d{4}-\d{2}-\d{2}$/.test(value))) return null;
    output.set(key, value);
  }
  return output.toString();
}

async function loginBody(request: Request): Promise<string | null> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  if (Number(request.headers.get("content-length") ?? 0) > 2048) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined); }, 8000);
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 2048) { await reader.cancel(); return null; }
      chunks.push(next.value);
    }
  } catch { return null; }
  finally { clearTimeout(timer); }
  if (timedOut) return null;
  try {
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const { username, password } = body as Record<string, unknown>;
    if (typeof username !== "string" || !/^[a-zA-Z0-9_.@-]{3,80}$/.test(username) || typeof password !== "string" || password.length < 1 || password.length > 256) return null;
    return JSON.stringify({ username, password });
  } catch { return null; }
}

async function boundedJson(response: Response): Promise<unknown> {
  if (!response.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new UpstreamResponseError("invalid_content_type");
  if (Number(response.headers.get("content-length") ?? 0) > MAX_RESPONSE) throw new UpstreamResponseError("oversized_response");
  const reader = response.body?.getReader();
  if (!reader) throw new UpstreamResponseError("empty_response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined); }, 8000);
  try {
    while (true) {
      const next = await reader.read();
      if (timedOut) throw new DOMException("Upstream response timed out", "TimeoutError");
      if (next.done) break;
      size += next.value.byteLength;
      if (size > MAX_RESPONSE) { await reader.cancel(); throw new UpstreamResponseError("oversized_response"); }
      chunks.push(next.value);
    }
  } finally { clearTimeout(timer); }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
}


function validAuthResponse(data: unknown, operation: "login" | "session"): boolean {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const record = data as Record<string, unknown>;
  if (operation === "session" && record.authenticated !== true) return false;
  const user = record.user;
  return Boolean(user && typeof user === "object" && !Array.isArray(user) &&
    typeof (user as Record<string, unknown>).username === "string" &&
    ["admin", "viewer"].includes(String((user as Record<string, unknown>).role)) &&
    typeof record.csrf === "string" && /^[a-f0-9]{64}$/.test(record.csrf));
}

const clearCookie = clearSessionCookie;

export async function affiliateOsRequest(request: Request, operation: string): Promise<Response> {
  const config = affiliateConfiguration();
  if (!config) return json(503, { error: "Affiliate OS integration is unavailable" });
  const target = OPERATIONS[operation];
  if (!target || request.method !== target.method) return json(404, { error: "Not found" });
  if (target.method === "POST" && (request.headers.get("origin") !== config.dashboard || request.headers.get("sec-fetch-site") === "cross-site")) return json(403, { error: "Origin not permitted" });
  const query = queryString(request, target.query);
  if (query === null) return json(400, { error: "Invalid query" });
  const token = sessionToken(request);
  if (operation !== "login" && !token) return json(401, { authenticated: false, error: "Unauthorized" });
  const body = operation === "login" ? await loginBody(request) : undefined;
  if (operation === "login" && !body) return json(400, { error: "Invalid login request" });
  const csrf = request.headers.get("x-csrf-token");
  if (operation === "logout" && (!csrf || !/^[a-f0-9]{64}$/.test(csrf))) return json(403, { error: "Invalid CSRF token" });
  const headers = new Headers({ Authorization: config.gateway, Accept: "application/json" });
  if (token && operation !== "login") headers.set("Cookie", `${UPSTREAM_COOKIE}=${token}`);
  if (target.method === "POST") headers.set("Origin", config.api);
  if (body) headers.set("Content-Type", "application/json");
  if (operation === "logout") headers.set("X-CSRF-Token", csrf!);
  try {
    const response = await upstreamRequest(`${config.api}${target.path}${query ? `?${query}` : ""}`, { method: target.method, headers, body: body ?? undefined, maxResponse: MAX_RESPONSE }, config.ca);
    const data = await boundedJson(response);
    if (operation === "login" && response.ok) {
      const issued = upstreamToken(response);
      if (!issued || !validAuthResponse(data, "login")) return json(502, { error: "Invalid upstream response" });
      return json(200, data, issuedSessionCookie(issued));
    }
    if (operation === "logout" && response.ok) return json(200, data, clearCookie);
    if (operation === "session" && response.status === 401) return json(401, { authenticated: false, error: "Unauthorized" }, clearCookie);
    if (operation === "session" && response.ok && !validAuthResponse(data, "session")) return json(502, { error: "Invalid upstream response" });
    if (response.ok) return json(response.status, data);
    const status = [400, 401, 403, 404, 409, 415, 429].includes(response.status) ? response.status : 502;
    if (response.status >= 500 || response.status === 403) console.warn("[affiliate-os]", { operation, category: "upstream_status", status: response.status });
    return json(status, { error: status === 429 ? "Rate limited" : status === 401 ? "Unauthorized" : "Affiliate OS request failed" }, operation === "logout" ? clearCookie : undefined);
  } catch (error) {
    const timeout = error instanceof Error && error.name === "TimeoutError";
    const category = timeout ? "timeout" : error instanceof UpstreamResponseError ? error.category : error instanceof SyntaxError ? "invalid_json" : "transport_failure";
    console.warn("[affiliate-os]", { operation, category });
    return json(timeout ? 504 : 502, { error: "Affiliate OS request failed" }, operation === "logout" ? clearCookie : undefined);
  }
}
