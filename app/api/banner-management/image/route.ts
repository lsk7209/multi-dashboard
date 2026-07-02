import {
  recordBannerImageRequest,
  resolveBannerPlacement,
} from "../../../lib/banner-management-store.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TRANSPARENT_GIF = Uint8Array.from(
  Buffer.from("R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==", "base64"),
);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const resolved = resolveBannerPlacement({
    pageUrl: url.searchParams.get("pageUrl") ?? undefined,
    placementId: url.searchParams.get("placementId") ?? undefined,
    referrer: request.headers.get("referer") ?? undefined,
    siteKey: url.searchParams.get("siteKey") ?? undefined,
    slot: url.searchParams.get("slot") ?? undefined,
    slotKey: url.searchParams.get("slotKey") ?? undefined,
  });

  if (!resolved) {
    return new Response(TRANSPARENT_GIF, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "image/gif",
      },
    });
  }

  recordBannerImageRequest({
    assignmentId: resolved.assignmentId,
    pageUrl: url.searchParams.get("pageUrl") ?? undefined,
    placementId: resolved.placement.id,
    referrer: request.headers.get("referer") ?? undefined,
    trackingLinkId: resolved.trackingLink.id,
  });

  return Response.redirect(resolved.creative.imageUrl, 302);
}
