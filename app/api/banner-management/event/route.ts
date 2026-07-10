import {
  isQualifiedBannerMeasurementEnabled,
  recordQualifiedBannerEventAsync,
  resolveBannerPlacementAsync,
} from "../../../lib/banner-management-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EventPayload = {
  eventType?: unknown;
  sessionId?: unknown;
  siteKey?: unknown;
  slotKey?: unknown;
};

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new Response(null, { headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  if (!isQualifiedBannerMeasurementEnabled()) {
    return Response.json({ error: "Qualified banner measurement is not configured." }, { status: 503 });
  }
  if (isAutomatedRequest(request)) {
    return Response.json({ error: "Automated requests are not measured." }, { status: 400 });
  }

  const payload = await readPayload(request);
  if (!payload || payload.eventType !== "impression" || !isText(payload.sessionId)) {
    return Response.json({ error: "Invalid banner measurement payload." }, { status: 400 });
  }
  const resolved = await resolveBannerPlacementAsync({
    recordResolutionEvents: false,
    siteKey: isText(payload.siteKey) ? payload.siteKey : undefined,
    slotKey: isText(payload.slotKey) ? payload.slotKey : undefined,
  });
  if (!resolved) return Response.json({ error: "No active banner is configured for this slot." }, { status: 404 });

  const origin = request.headers.get("origin");
  if (!isPlacementOrigin(origin, resolved.placement.siteUrl)) {
    return Response.json({ error: "Banner measurement origin is not registered for this placement." }, { status: 403 });
  }

  const recorded = await recordQualifiedBannerEventAsync({
    assignmentId: resolved.assignmentId,
    eventType: "impression",
    placementId: resolved.placement.id,
    sessionId: payload.sessionId,
    trackingLinkId: resolved.trackingLink.id,
  });
  return Response.json({ recorded }, { headers: corsHeaders(origin) });
}

async function readPayload(request: Request): Promise<EventPayload | null> {
  try {
    return (await request.json()) as EventPayload;
  } catch {
    return null;
  }
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlacementOrigin(origin: string | null, siteUrl: string | null): boolean {
  if (!origin || !siteUrl) return false;
  try {
    return new URL(origin).origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): HeadersInit {
  return origin
    ? {
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Origin": origin,
        Vary: "Origin",
      }
    : {};
}

function isAutomatedRequest(request: Request): boolean {
  return /bot|crawler|spider|headless|lighthouse|prerender|curl|wget/i.test(request.headers.get("user-agent") ?? "");
}
