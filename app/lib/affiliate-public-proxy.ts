import { affiliateConfiguration, upstreamRequest } from "./affiliate-upstream";
import fleetSites from "./affiliate-fleet-sites.json";

const SITE = "campgogo";
const PAGE = "/blog/camping-coffee-complete";
const REVISION = "camp-coffee-r1";
const AUTO_REVISION = "camp-auto-r1";
const AUTO_LINK = "5c7f400a-5d4b-4eea-863a-eedbdcfb982f";
const ASSET_LIMIT = 256 * 1024;
const RESPONSE_LIMIT = 256 * 1024;
const sites: Record<string, string> = fleetSites;

function siteForOrigin(request: Request): { origin: string; site: string } | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" || url.origin !== origin || url.port || url.username || url.password) return null;
    const site = Object.hasOwn(sites, url.hostname) ? sites[url.hostname] : undefined;
    return site ? { origin, site } : null;
  } catch { return null; }
}

function reply(status: number, stage: string, origin?: string): Response {
  return Response.json({ error: stage }, { status, headers: headers("application/json; charset=utf-8", origin) });
}

function headers(type: string, origin?: string): Headers {
  const result = new Headers({ "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  if (origin) {
    result.set("Access-Control-Allow-Origin", origin);
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

function exactSiteQuery(request: Request, path: string, site: string): boolean {
  const url = new URL(request.url);
  return url.pathname === path && [...url.searchParams].length === 1 && url.searchParams.getAll("site_key").length === 1 && url.searchParams.get("site_key") === site;
}

function validArticlePath(path: unknown, category: boolean): path is string {
  if (typeof path !== "string" || path.length > 300 || !path.startsWith("/") || path === "/" ||
    /[?#\\]|%2f|%5c|%2e|\/\//i.test(path) ||
    [...path].some(char => char.charCodeAt(0) < 33 || char.charCodeAt(0) === 127) ||
    path.split("/").some(part => part === "." || part === "..")) return false;
  if (!category) return path.startsWith("/blog/") && path !== "/blog/";
  return !/(?:^|\/)(?:api|admin|wp-admin|wp-login\.php|auth|account|my-account|cart|checkout|login|register)(?:\/|$)/i.test(path);
}

function validPayload(value: unknown, kind: "recommend" | "event", site: string): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  const allowed = kind === "recommend" ? ["path", "title", "description", "headings", "tags", "categories", "content_excerpt", "disable", "delivery_mode", "paragraphs"] : ["kind", "event_id", "event_token"];
  if (Object.keys(data).some(key => !allowed.includes(key))) return false;
  if (kind === "event") return typeof data.kind === "string" && ["view", "click"].includes(data.kind) && typeof data.event_id === "string" && /^[0-9a-f-]{36}$/i.test(data.event_id) && typeof data.event_token === "string" && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(data.event_token) && data.event_token.length <= 1200;
  if (Object.hasOwn(data, "delivery_mode")) {
    if ((data.delivery_mode !== "category_card" && (site !== SITE || data.delivery_mode !== "auto_inline")) ||
      !validArticlePath(data.path, data.delivery_mode === "category_card") ||
      data.delivery_mode === "auto_inline" && (!Array.isArray(data.paragraphs) || data.paragraphs.length > 20) ||
      data.delivery_mode === "category_card" && (Object.hasOwn(data, "paragraphs") || typeof data.categories !== "string" || data.categories.length > 100)) return false;
    const ids = new Set<string>();
    for (const row of (data.delivery_mode === "auto_inline" ? data.paragraphs as { id: string; text: string }[] : [])) {
      if (!row || typeof row !== "object" || Array.isArray(row) || Object.keys(row).some(key => !["id", "text"].includes(key)) ||
        typeof row.id !== "string" || !/^p(?:0|[1-9]\d{0,2})$/.test(row.id) || Number(row.id.slice(1)) >= 160 || ids.has(row.id) ||
        typeof row.text !== "string" || row.text.length > 240) return false;
      ids.add(row.id);
    }
  } else if (site !== SITE || data.path !== PAGE || Object.hasOwn(data, "paragraphs")) return false;
  if (typeof data.title !== "string" || !data.title.trim() || data.title.length > 300 || data.disable !== undefined && typeof data.disable !== "boolean") return false;
  return ["description", "headings", "tags", "categories", "content_excerpt"].every(key => data[key] === undefined || typeof data[key] === "string" && data[key].length <= (key === "content_excerpt" ? 1500 : key === "description" || key === "headings" ? 600 : 300));
}

export async function affiliatePublicAsset(request: Request, path: "/widget.js" | "/widget.css" | "/category-widget.js"): Promise<Response> {
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
  const caller = siteForOrigin(request);
  if (!caller || kind === "event" && caller.site !== SITE) return reply(403, "Origin not permitted");
  if (!exactSiteQuery(request, `/api/${kind}`, caller.site)) return reply(400, "Invalid site query", caller.origin);
  return new Response(null, { status: 204, headers: headers("application/json; charset=utf-8", caller.origin) });
}

export async function affiliatePublicPost(request: Request, kind: "recommend" | "event"): Promise<Response> {
  if (request.method !== "POST") return reply(405, "Method not allowed");
  const caller = siteForOrigin(request);
  if (!caller || kind === "event" && caller.site !== SITE) return reply(403, "Origin not permitted");
  if (!exactSiteQuery(request, `/api/${kind}`, caller.site)) return reply(400, "Invalid site query", caller.origin);
  const { site, origin } = caller;
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^(text\/plain|application\/json)(?:\s*;\s*charset=utf-8)?$/i.test(contentType)) return reply(415, "Invalid content type", origin);
  const max = kind === "recommend" ? 32768 : 4096;
  if (Number(request.headers.get("content-length") ?? 0) > max) return reply(413, "Request too large", origin);
  const bytes = await boundedBytes(request.body, max);
  if (bytes === false) return reply(413, "Request too large", origin);
  if (!bytes) return reply(400, "Invalid or oversized request", origin);
  let body: string;
  let input: Record<string, unknown>;
  try {
    body = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    input = JSON.parse(body);
    if (!validPayload(input, kind, site)) return reply(400, "Invalid site request", origin);
  } catch { return reply(400, "Invalid site request", origin); }
  const config = affiliateConfiguration();
  if (!config) return reply(503, "Service unavailable", origin);
  try {
    const response = await upstreamRequest(`${config.api}/api/${kind}?site_key=${encodeURIComponent(site)}`, { method: "POST", headers: new Headers({ Authorization: config.gateway, Origin: origin, "Content-Type": "application/json", Accept: "application/json" }), body, maxResponse: RESPONSE_LIMIT, timeoutMs: 8000 }, config.ca);
    if (response.status >= 300 && response.status < 400 || !/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "") || Number(response.headers.get("content-length") ?? 0) > RESPONSE_LIMIT) return reply(502, "Service unavailable", origin);
    const result = await boundedBytes(response.body, RESPONSE_LIMIT);
    if (!result) return reply(502, "Service unavailable", origin);
    if (!response.ok) return reply([400, 403, 404, 410, 429, 503].includes(response.status) ? response.status : 502, "Request rejected", origin);
    try {
      const payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(result));
      if (kind === "recommend") {
        if (!payload || !Array.isArray(payload.links)) return reply(502, "Service unavailable", origin);
        // Fail closed if runtime pilot configuration is absent or a redirect leaks
        // through. Empty/paused results do not expose a product and remain valid.
        const auto = input.delivery_mode === "auto_inline";
        const category = input.delivery_mode === "category_card";
        if (category && (payload.site_key !== site || payload.category !== (input.categories as string).normalize("NFKC").replace(/\s+/gu, " ").trim() ||
          payload.delivery_mode !== "category_card" || typeof payload.category_enabled !== "boolean" ||
          !Number.isSafeInteger(payload.category_revision) || payload.category_revision < 0 ||
          payload.category_enabled && payload.category_revision < 1 ||
          payload.links.length > 1 || payload.links.length && (!payload.category_enabled || payload.category_revision < 1 ||
            !payload.links.every((link: { affiliate_url?: unknown; tracking_mode?: unknown; click_path?: unknown } | null) => {
              if (!link || link.tracking_mode !== "direct" || link.click_path !== null || typeof link.affiliate_url !== "string") return false;
              try { const url = new URL(link.affiliate_url); return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password; }
              catch { return false; }
            })))) return reply(502, "Category policy unavailable", origin);
        if (auto && (payload.delivery_mode !== "auto_inline" || payload.auto_revision !== AUTO_REVISION ||
          payload.links.length && (!(input.paragraphs as { id: string }[]).some(row => row.id === payload.placement?.paragraph_id) || payload.links[0]?.id !== AUTO_LINK)))
          return reply(502, "Auto policy unavailable", origin);
        if (!category && payload.links.length && (payload.site_key !== SITE || !auto && payload.pilot_revision !== REVISION || payload.links.length > 1 ||
          payload.links.some((link: { tracking_mode?: string; click_path?: unknown } | null) => !link || link.tracking_mode !== "direct" || link.click_path !== null)))
          return reply(502, "Pilot policy unavailable", origin);
      }
    } catch { return reply(502, "Service unavailable", origin); }
    return new Response(Buffer.from(result), { status: 200, headers: headers("application/json; charset=utf-8", origin) });
  } catch { return reply(502, "Service unavailable", origin); }
}
