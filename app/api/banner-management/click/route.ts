import {
  recordBannerClickAsync,
  recordQualifiedBannerEventAsync,
  resolveBannerPlacementAsync,
} from "../../../lib/banner-management-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const resolved = await resolveBannerPlacementAsync({
    pageUrl: url.searchParams.get("pageUrl") ?? undefined,
    placementId: url.searchParams.get("placementId") ?? undefined,
    purpose: parseBannerPurpose(url.searchParams.get("purpose")),
    recordResolutionEvents: false,
    referrer: request.headers.get("referer") ?? undefined,
    siteKey: url.searchParams.get("siteKey") ?? undefined,
    slot: url.searchParams.get("slot") ?? undefined,
    slotKey: url.searchParams.get("slotKey") ?? undefined,
  });

  if (!resolved) {
    return Response.json({ error: "No active banner is configured for this slot." }, { status: 404 });
  }

  await recordBannerClickAsync({
    assignmentId: resolved.assignmentId,
    metadata: buildClickMetadata(request),
    pageUrl: url.searchParams.get("pageUrl") ?? undefined,
    placementId: resolved.placement.id,
    referrer: request.headers.get("referer") ?? undefined,
    trackingLinkId: resolved.trackingLink.id,
  });

  const sessionId = url.searchParams.get("sid");
  if (sessionId && !isAutomatedRequest(request)) {
    await recordQualifiedBannerEventAsync({
      assignmentId: resolved.assignmentId,
      eventType: "click",
      placementId: resolved.placement.id,
      sessionId,
      trackingLinkId: resolved.trackingLink.id,
    });
  }

  return Response.redirect(resolved.trackingLink.publicUrl, 302);
}

function isAutomatedRequest(request: Request): boolean {
  return /bot|crawler|spider|headless|lighthouse|prerender|curl|wget/i.test(request.headers.get("user-agent") ?? "");
}

function parseBannerPurpose(value: string | null): "approval_screenshot" | "public" | undefined {
  if (value === "approval_screenshot") return "approval_screenshot";
  if (value === "public") return "public";
  return undefined;
}

function buildClickMetadata(request: Request): Record<string, string | null> {
  return {
    accept: request.headers.get("accept"),
    secFetchDest: request.headers.get("sec-fetch-dest"),
    secFetchMode: request.headers.get("sec-fetch-mode"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    userAgent: request.headers.get("user-agent"),
  };
}
