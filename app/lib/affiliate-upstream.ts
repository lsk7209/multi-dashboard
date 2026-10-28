import https from "node:https";

export const COOKIE = "__Secure-affiliate_dashboard_session";
export const UPSTREAM_COOKIE = "__Host-affiliate_session";

function origin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === value && !url.username && !url.password ? value : null;
  } catch { return null; }
}

export function affiliateConfiguration() {
  const api = origin(process.env.AFFILIATE_API_ORIGIN);
  const dashboard = origin(process.env.AFFILIATE_DASHBOARD_ORIGIN);
  const gateway = process.env.AFFILIATE_GATEWAY_AUTH;
  const ca = process.env.AFFILIATE_API_CA_CERT;
  if (!api || !dashboard || !gateway || !/^Basic [A-Za-z0-9+/]+={0,2}$/.test(gateway) || gateway.length > 1024) return null;
  if (ca && (!/^-----BEGIN CERTIFICATE-----\r?\n(?:[A-Za-z0-9+/=]+\r?\n)+-----END CERTIFICATE-----\r?\n?$/.test(ca) || ca.length > 16384)) return null;
  return { api, dashboard, gateway, ca: ca || undefined };
}

export function sessionToken(request: Request): string | null {
  const raw = request.headers.get("cookie") ?? "";
  if (raw.length > 8192) return null;
  const matches = raw.split(";").map(part => part.trim()).filter(part => part.startsWith(`${COOKIE}=`));
  if (matches.length !== 1) return null;
  const token = matches[0]!.slice(COOKIE.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export const clearSessionCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
export const issuedSessionCookie = (token: string) => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;

export function upstreamToken(response: Response): string | null {
  const cookie = response.headers.get("set-cookie") ?? "";
  const matches = [...cookie.matchAll(new RegExp(`(?:^|,\\s*)${UPSTREAM_COOKIE}=([A-Za-z0-9_-]{43})(?:;|$)`, "g"))];
  return matches.length === 1 ? matches[0]?.[1] ?? null : null;
}

export async function upstreamRequest(url: string, init: { method: "GET" | "POST"; headers: Headers; body?: string | undefined; maxResponse: number; stream?: boolean; timeoutMs?: number }, ca?: string | null): Promise<Response> {
  const timeoutMs = init.timeoutMs ?? 8000;
  if (!ca) return fetch(url, { method: init.method, headers: init.headers, ...(init.body ? { body: init.body } : {}), redirect: "error", cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const outboundHeaders: Record<string, string> = {};
    init.headers.forEach((value, key) => { outboundHeaders[key] = value; });
    const req = https.request(target, { method: init.method, headers: outboundHeaders, ca, rejectUnauthorized: true }, res => {
      if ((res.statusCode ?? 0) >= 300 && (res.statusCode ?? 0) < 400) { req.destroy(new Error("redirect_rejected")); return; }
      if (init.stream) {
        let size = 0;
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            let closed = false;
            res.on("data", (chunk: Buffer) => {
              if (closed) return;
              size += chunk.length;
              if (size > init.maxResponse) { closed = true; controller.error(new Error("oversized_response")); req.destroy(); return; }
              controller.enqueue(chunk);
            });
            res.on("end", () => { if (!closed) { closed = true; controller.close(); } });
            res.on("error", error => { if (!closed) { closed = true; controller.error(error); } });
            res.on("aborted", () => { if (!closed) { closed = true; controller.error(new Error("upstream_aborted")); } });
          },
          cancel() { req.destroy(); },
        });
        resolve(new Response(body, { status: res.statusCode ?? 502, headers: res.headers as HeadersInit }));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > init.maxResponse) { req.destroy(new Error("oversized_response")); return; }
        chunks.push(chunk);
      });
      res.on("end", () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode ?? 502, headers: res.headers as HeadersInit })));
      res.on("error", reject);
    });
    const deadline = setTimeout(() => req.destroy(new DOMException("Upstream timed out", "TimeoutError")), timeoutMs);
    req.on("close", () => clearTimeout(deadline));
    req.on("error", reject);
    if (init.body) req.write(init.body);
    req.end();
  });
}
