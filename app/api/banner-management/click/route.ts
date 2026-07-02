import {
  recordBannerClickAsync,
  resolveBannerPlacementAsync,
} from "../../../lib/banner-management-store.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const resolved = await resolveBannerPlacementAsync({
    pageUrl: url.searchParams.get("pageUrl") ?? undefined,
    placementId: url.searchParams.get("placementId") ?? undefined,
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
    pageUrl: url.searchParams.get("pageUrl") ?? undefined,
    placementId: resolved.placement.id,
    referrer: request.headers.get("referer") ?? undefined,
    trackingLinkId: resolved.trackingLink.id,
  });

  return Response.redirect(resolved.trackingLink.publicUrl, 302);
}
