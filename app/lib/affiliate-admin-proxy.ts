import { affiliateConfiguration, clearSessionCookie, issuedSessionCookie, sessionToken, upstreamRequest, upstreamToken, UPSTREAM_COOKIE } from "./affiliate-upstream";

const fixed: Record<string, readonly ("GET" | "POST")[]> = {
  "/api/auth/login": ["POST"], "/api/auth/session": ["GET"], "/api/auth/logout": ["POST"],
  "/api/auth/accounts": ["GET"], "/api/auth/sessions/revoke": ["POST"],
  "/api/admin/brain/summary": ["GET"], "/api/admin/brain/sync": ["POST"],
  "/api/admin/brain/publications": ["GET"], "/api/admin/brain/publication/inspect": ["POST"],
  "/api/admin/brain/publication/grant": ["POST"], "/api/admin/brain/publication/pause": ["POST"],
  "/api/admin/brain/metadata/summary": ["GET"], "/api/admin/brain/metadata/template": ["GET"],
  "/api/admin/brain/metadata/import": ["POST"], "/api/admin/brain/items": ["GET"],
  "/api/admin/brain/simulate": ["POST"], "/api/admin/overview": ["GET"],
  "/api/admin/sites": ["GET", "POST"], "/api/admin/sites/toggle": ["POST"],
  "/api/admin/links": ["GET", "POST"], "/api/admin/links/toggle": ["POST"],
  "/api/admin/import-links": ["POST"], "/api/admin/import-conversions": ["POST"],
  "/api/admin/debug-match": ["POST"],
};
const workspace: Record<string, readonly ("GET" | "POST")[]> = {
  "readiness": ["GET"], "yield-insights": ["GET"], "diagnostics": ["GET"], "jobs": ["GET"],
  "source/preview": ["POST"], "source/files": ["POST"], "source/apply": ["POST"],
  "item": ["GET"], "metadata": ["POST"], "metadata/batch": ["POST"], "simulate": ["POST"],
  "pages/status": ["GET"], "pages/preview": ["POST"], "pages/apply": ["POST"],
  "semantic/status": ["GET"], "semantic/reset": ["POST"], "semantic/index": ["POST"],
  "simulations": ["GET"], "analytics": ["GET"], "analytics.csv": ["GET"], "audit": ["GET"],
  "schedule": ["GET", "POST"], "backups": ["GET", "POST"], "backup-access": ["GET"],
  "backup-inventory": ["GET"], "storage": ["GET"], "retention/preview": ["POST"],
  "conversion-history": ["POST"],
};
const dynamic = [
  { pattern: /^jobs\/[a-f0-9-]{36}$/, methods: ["GET"] },
  { pattern: /^backups\/[a-f0-9-]{36}(?:\/(?:verify|restore-check|app-check))?$/, methods: ["GET"] },
];

function reply(status: number, error: string, cookie?: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...(cookie ? { "Set-Cookie": cookie } : {}), ...(cookie === clearSessionCookie && status >= 400 ? { "X-Affiliate-Session-Cleared": "1" } : {}) } });
}

function allowed(path: string, method: string): boolean {
  if (fixed[path]?.includes(method as "GET" | "POST")) return true;
  if (!path.startsWith("/api/admin/workspace/")) return false;
  const tail = path.slice("/api/admin/workspace/".length);
  return Boolean(workspace[tail]?.includes(method as "GET" | "POST") || dynamic.some(item => item.pattern.test(tail) && item.methods.includes(method)));
}

async function boundedBody(request: Request, max: number): Promise<string | null> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) return null;
  if (Number(request.headers.get("content-length") ?? 0) > max) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const deadline = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined); }, 8000);
  try {
    while (true) {
      const next = await reader.read();
      if (timedOut) return null;
      if (next.done) break;
      size += next.value.byteLength;
      if (size > max) { await reader.cancel(); return null; }
      chunks.push(next.value);
    }
    const value = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
    JSON.parse(value);
    return value;
  } catch { return null; }
  finally { clearTimeout(deadline); }
}

export async function affiliateAdminProxy(request: Request, parts: string[]): Promise<Response> {
  const config = affiliateConfiguration();
  if (!config) return reply(503, "Affiliate OS integration is unavailable");
  if (!parts.length || parts.some(part => !/^[a-zA-Z0-9_.-]+$/.test(part) || part === "." || part === "..")) return reply(404, "Not found");
  const url = new URL(request.url);
  if (/%2f|%5c|%2e|\\/i.test(url.pathname)) return reply(404, "Not found");
  const path = `/${parts.join("/")}`;
  if (!allowed(path, request.method)) return reply(404, "Not found");
  if (url.search.length > 2048 || [...url.searchParams].some(([key, value]) => key.length > 80 || value.length > 500 || [...key, ...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))) return reply(400, "Invalid query");
  const write = request.method === "POST";
  if (write && (request.headers.get("origin") !== config.dashboard || request.headers.get("sec-fetch-site") === "cross-site")) return reply(403, "Origin not permitted");
  const login = path === "/api/auth/login";
  const logout = path === "/api/auth/logout";
  const token = sessionToken(request);
  if (!login && !token) return reply(401, "Unauthorized");
  const csrf = request.headers.get("x-csrf-token");
  if (write && !login && !/^[a-f0-9]{64}$/.test(csrf ?? "")) return reply(403, "Invalid CSRF token");
  const requestLimit = path === "/api/admin/workspace/source/files" ? 4_000_000 : ["/api/admin/workspace/metadata/batch", "/api/admin/brain/metadata/import"].includes(path) ? 2_300_000 : 1_000_000;
  if (write && Number(request.headers.get("content-length") ?? 0) > requestLimit) return reply(413, path === "/api/admin/workspace/source/files" ? "Upload exceeds dashboard 4 MB source limit; use Affiliate OS local admin for larger files" : "Request exceeds dashboard size limit");
  const body = write ? await boundedBody(request, login ? 2048 : requestLimit) : undefined;
  if (write && body === null) return reply(400, "Invalid or oversized JSON request");
  if (login) {
    const fields = JSON.parse(body!) as Record<string, unknown>;
    if (!fields || Array.isArray(fields) || !/^[a-zA-Z0-9_.@-]{3,80}$/.test(String(fields.username ?? "")) || typeof fields.password !== "string" || !fields.password || fields.password.length > 256) return reply(400, "Invalid login request");
  }
  const headers = new Headers({ Authorization: config.gateway, Accept: "application/json, text/csv, application/octet-stream" });
  if (token && !login) headers.set("Cookie", `${UPSTREAM_COOKIE}=${token}`);
  if (write) { headers.set("Origin", config.api); headers.set("Content-Type", "application/json"); }
  if (csrf && write && !login) headers.set("X-CSRF-Token", csrf);
  const download = /^\/api\/admin\/workspace\/backups\/[a-f0-9-]{36}$/.test(path);
  const csv = path.endsWith(".csv") || path === "/api/admin/brain/metadata/template";
  const stream = download || csv;
  const maxResponse = download ? 67_108_864 : csv ? 4_000_000 : 1_000_000;
  try {
    const response = await upstreamRequest(`${config.api}${path}${url.search}`, { method: request.method as "GET" | "POST", headers, body: body ?? undefined, maxResponse, stream, timeoutMs: download ? 30_000 : 8000 }, config.ca);
    if (response.status >= 300 && response.status < 400) return reply(502, "Unexpected upstream redirect");
    const contentType = response.headers.get("content-type") ?? "";
    if (!/^(application\/json|text\/csv|application\/octet-stream)(?:;|$)/i.test(contentType)) return reply(502, "Invalid upstream response");
    if (Number(response.headers.get("content-length") ?? 0) > maxResponse) return reply(502, "Upstream response too large");
    const bytes = stream ? null : await response.arrayBuffer();
    if (bytes && bytes.byteLength > maxResponse) return reply(502, "Upstream response too large");
    const output = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Type": contentType, "X-Frame-Options": "DENY" });
    for (const name of ["content-security-policy", "content-disposition", "referrer-policy"]) {
      const value = response.headers.get(name);
      if (value && !/[\r\n]/.test(value)) output.set(name, value);
    }
    if (login && response.ok) {
      const issued = upstreamToken(response);
      const data = JSON.parse(Buffer.from(bytes!).toString("utf8")) as Record<string, unknown>;
      if (!issued || !data || typeof data.csrf !== "string" || !/^[a-f0-9]{64}$/.test(data.csrf)) return reply(502, "Invalid upstream login");
      output.set("Set-Cookie", issuedSessionCookie(issued));
    } else if (logout || path === "/api/auth/session" && response.status === 401 || path === "/api/auth/sessions/revoke" && response.headers.has("set-cookie")) {
      output.set("Set-Cookie", clearSessionCookie);
      if (logout && !response.ok) output.set("X-Affiliate-Session-Cleared", "1");
    }
    let size = 0;
    const payload = stream && response.body ? response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        size += chunk.byteLength;
        if (size > maxResponse) throw Error("Upstream response too large");
        controller.enqueue(chunk);
      },
    })) : bytes;
    return new Response(payload, { status: response.status, headers: output });
  } catch {
    return reply(502, "Affiliate OS request failed", logout ? clearSessionCookie : undefined);
  }
}

export async function affiliateAdminAsset(path: "/admin" | "/workspace.js" | "/workspace.css"): Promise<Response> {
  const config = affiliateConfiguration();
  if (!config) return reply(503, "Affiliate OS integration is unavailable");
  try {
    const response = await upstreamRequest(`${config.api}${path}`, { method: "GET", headers: new Headers({ Authorization: config.gateway }), maxResponse: 1_000_000 }, config.ca);
    if (!response.ok) return reply(502, "Affiliate OS asset unavailable");
    const type = path === "/admin" ? "text/html" : path.endsWith(".js") ? "application/javascript" : "text/css";
    if (!response.headers.get("content-type")?.startsWith(type)) return reply(502, "Invalid asset response");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 1_000_000) return reply(502, "Asset too large");
    return new Response(bytes, { headers: { "Content-Type": response.headers.get("content-type")!, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; object-src 'none'" } });
  } catch { return reply(502, "Affiliate OS asset unavailable"); }
}
