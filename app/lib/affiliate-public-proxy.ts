import { affiliateConfiguration, upstreamRequest } from "./affiliate-upstream";

const SITE = "campgogo";
const ORIGIN = "https://campgogo.kr";
const PAGE = "/blog/camping-coffee-complete";
const REVISION = "camp-coffee-r1";
const AUTO_REVISION = "camp-auto-r1";
const AUTO_LINK = "5c7f400a-5d4b-4eea-863a-eedbdcfb982f";
const ASSET_LIMIT = 256 * 1024;
const RESPONSE_LIMIT = 256 * 1024;

function reply(status: number, stage: string, cors = false): Response {
  return Response.json({ error: stage }, { status, headers: headers("application/json; charset=utf-8", cors) });
}

function headers(type: string, cors = false): Headers {
  const result = new Headers({ "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  if (cors) {
    result.set("Access-Control-Allow-Origin", ORIGIN);
    result.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    result.set("Access-Control-Allow-Headers", "Content-Type");
    result.set("Vary", "Origin");
  }
  return result;
}

async function boundedBytes(stream: ReadableStream<Uint8Array> | null, max: number): Promise<Uint8Array | null | false> {
  if (!stream) return null;
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        while (true) {
          const next = await reader.read();
          if (next.done) return Buffer.concat(chunks);
          size += next.value.byteLength;
          if (size > max) { void reader.cancel().catch(() => undefined); return false; }
          chunks.push(next.value);
        }
      })(),
      new Promise<null>(resolve => { timer = setTimeout(() => { void reader.cancel().catch(() => undefined); resolve(null); }, 8000); }),
    ]);
  } catch { return null; }
  finally { if (timer) clearTimeout(timer); }
}

function exactPilotQuery(request: Request, path: string): boolean {
  const url = new URL(request.url);
  return url.pathname === path && [...url.searchParams].length === 1 && url.searchParams.getAll("site_key").length === 1 && url.searchParams.get("site_key") === SITE;
}

function validPayload(value: unknown, kind: "recommend" | "event"): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  const allowed = kind === "recommend" ? ["path", "title", "description", "headings", "tags", "categories", "content_excerpt", "disable", "delivery_mode", "paragraphs"] : ["kind", "event_id", "event_token"];
  if (Object.keys(data).some(key => !allowed.includes(key))) return false;
  if (kind === "event") return typeof data.kind === "string" && ["view", "click"].includes(data.kind) && typeof data.event_id === "string" && /^[0-9a-f-]{36}$/i.test(data.event_id) && typeof data.event_token === "string" && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(data.event_token) && data.event_token.length <= 1200;
  if (Object.hasOwn(data, "delivery_mode")) {
    if (data.delivery_mode !== "auto_inline" || typeof data.path !== "string" || data.path.length > 300 ||
      !data.path.startsWith("/blog/") || data.path === "/blog/" || /[?#\\]|%2f|%5c|%2e|\/\//i.test(data.path) ||
      [...data.path].some(char => char.charCodeAt(0) < 33 || char.charCodeAt(0) === 127) ||
      data.path.split("/").some(part => part === "." || part === "..") ||
      !Array.isArray(data.paragraphs) || data.paragraphs.length > 20) return false;
    const ids = new Set<string>();
    for (const row of data.paragraphs) {
      if (!row || typeof row !== "object" || Array.isArray(row) || Object.keys(row).some(key => !["id", "text"].includes(key)) ||
        typeof row.id !== "string" || !/^p(?:0|[1-9]\d{0,2})$/.test(row.id) || Number(row.id.slice(1)) >= 160 || ids.has(row.id) ||
        typeof row.text !== "string" || row.text.length > 240) return false;
      ids.add(row.id);
    }
  } else if (data.path !== PAGE || Object.hasOwn(data, "paragraphs")) return false;
  if (typeof data.title !== "string" || !data.title.trim() || data.title.length > 300 || data.disable !== undefined && typeof data.disable !== "boolean") return false;
  return ["description", "headings", "tags", "categories", "content_excerpt"].every(key => data[key] === undefined || typeof data[key] === "string" && data[key].length <= (key === "content_excerpt" ? 1500 : key === "description" || key === "headings" ? 600 : 300));
}

export async function affiliatePublicAsset(request: Request, path: "/widget.js" | "/widget.css"): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname !== path || url.search) return reply(404, "Not found");
  const config = affiliateConfiguration();
  if (!config) return reply(503, "Asset unavailable");
  const type = path.endsWith(".js") ? "application/javascript" : "text/css";
  try {
    const response = await upstreamRequest(`${config.api}${path}`, { method: "GET", headers: new Headers({ Authorization: config.gateway, Accept: type }), maxResponse: ASSET_LIMIT, timeoutMs: 8000 }, config.ca);
    if (!response.ok || !new RegExp(`^${type}(?:\\s*;|$)`, "i").test(response.headers.get("content-type") ?? "") || Number(response.headers.get("content-length") ?? 0) > ASSET_LIMIT) return reply(502, "Asset unavailable");
    const bytes = await boundedBytes(response.body, ASSET_LIMIT);
    return bytes ? new Response(Buffer.from(bytes), { headers: headers(`${type}; charset=utf-8`) }) : reply(502, "Asset unavailable");
  } catch { return reply(502, "Asset unavailable"); }
}

export function affiliatePublicOptions(request: Request, kind: "recommend" | "event"): Response {
  if (request.headers.get("origin") !== ORIGIN) return reply(403, "Origin not permitted");
  if (!exactPilotQuery(request, `/api/${kind}`)) return reply(400, "Invalid pilot query");
  return new Response(null, { status: 204, headers: headers("application/json; charset=utf-8", true) });
}

export async function affiliatePublicPost(request: Request, kind: "recommend" | "event"): Promise<Response> {
  if (request.method !== "POST") return reply(405, "Method not allowed");
  if (request.headers.get("origin") !== ORIGIN) return reply(403, "Origin not permitted");
  if (!exactPilotQuery(request, `/api/${kind}`)) return reply(400, "Invalid pilot query", true);
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^(text\/plain|application\/json)(?:\s*;\s*charset=utf-8)?$/i.test(contentType)) return reply(415, "Invalid content type", true);
  const max = kind === "recommend" ? 32768 : 4096;
  if (Number(request.headers.get("content-length") ?? 0) > max) return reply(413, "Request too large", true);
  const bytes = await boundedBytes(request.body, max);
  if (bytes === false) return reply(413, "Request too large", true);
  if (!bytes) return reply(400, "Invalid or oversized request", true);
  let body: string;
  let input: Record<string, unknown>;
  try {
    body = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    input = JSON.parse(body);
    if (!validPayload(input, kind)) return reply(400, "Invalid pilot request", true);
  } catch { return reply(400, "Invalid pilot request", true); }
  const config = affiliateConfiguration();
  if (!config) return reply(503, "Service unavailable", true);
  try {
    const response = await upstreamRequest(`${config.api}/api/${kind}?site_key=${SITE}`, { method: "POST", headers: new Headers({ Authorization: config.gateway, Origin: ORIGIN, "Content-Type": "application/json", Accept: "application/json" }), body, maxResponse: RESPONSE_LIMIT, timeoutMs: 8000 }, config.ca);
    if (response.status >= 300 && response.status < 400 || !/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "") || Number(response.headers.get("content-length") ?? 0) > RESPONSE_LIMIT) return reply(502, "Service unavailable", true);
    const result = await boundedBytes(response.body, RESPONSE_LIMIT);
    if (!result) return reply(502, "Service unavailable", true);
    if (!response.ok) return reply([400, 403, 404, 410, 429, 503].includes(response.status) ? response.status : 502, "Request rejected", true);
    try {
      const payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(result));
      if (kind === "recommend") {
        if (!payload || !Array.isArray(payload.links)) return reply(502, "Service unavailable", true);
        // Fail closed if runtime pilot configuration is absent or a redirect leaks
        // through. Empty/paused results do not expose a product and remain valid.
        const auto = input.delivery_mode === "auto_inline";
        if (auto && (payload.delivery_mode !== "auto_inline" || payload.auto_revision !== AUTO_REVISION ||
          payload.links.length && (!(input.paragraphs as { id: string }[]).some(row => row.id === payload.placement?.paragraph_id) || payload.links[0]?.id !== AUTO_LINK)))
          return reply(502, "Auto policy unavailable", true);
        if (payload.links.length && (payload.site_key !== SITE || !auto && payload.pilot_revision !== REVISION || payload.links.length > 1 ||
          payload.links.some((link: { tracking_mode?: string; click_path?: unknown } | null) => !link || link.tracking_mode !== "direct" || link.click_path !== null)))
          return reply(502, "Pilot policy unavailable", true);
      }
    } catch { return reply(502, "Service unavailable", true); }
    return new Response(Buffer.from(result), { status: 200, headers: headers("application/json; charset=utf-8", true) });
  } catch { return reply(502, "Service unavailable", true); }
}
