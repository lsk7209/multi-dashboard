import {
  assignBannerPlacementAsync,
  assertBannerAdminAuthorized,
  createBannerCreativeAsync,
  createBannerPlacementAsync,
  createBannerTrackingLinkAsync,
  getBannerManagementStateAsync,
  isBannerAdminUnauthorizedError,
  isBannerWriteDisabledError,
  updateBannerCreativeAsync,
  updateBannerPlacementAsync,
  updateBannerTrackingLinkAsync,
} from "../../lib/banner-management-store.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BannerAction =
  | "createPlacement"
  | "updatePlacement"
  | "createCreative"
  | "updateCreative"
  | "createTrackingLink"
  | "updateTrackingLink"
  | "assignPlacement";

type BannerRequestBody = {
  action?: BannerAction;
  id?: string;
  placementId?: string;
  creativeId?: string;
  trackingLinkId?: string;
  name?: string;
  siteKey?: string;
  slotKey?: string;
  siteUrl?: string | null;
  type?: string;
  noAdPolicy?: string;
  status?: string;
  imageUrl?: string;
  offerId?: string | null;
  offerName?: string | null;
  width?: number | null;
  height?: number | null;
  policyStatus?: string;
  slug?: string;
  publicUrl?: string;
  weight?: number;
};

export async function GET() {
  try {
    return Response.json(await getBannerManagementStateAsync());
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertBannerAdminAuthorized(request);
    const body = (await request.json()) as BannerRequestBody;

    switch (body.action) {
      case "createPlacement":
        return Response.json(
          await createBannerPlacementAsync({
            name: body.name ?? "",
            noAdPolicy: body.noAdPolicy,
            siteKey: body.siteKey,
            siteUrl: body.siteUrl,
            slotKey: body.slotKey,
            status: body.status,
            type: body.type,
          }),
          { status: 201 },
        );
      case "updatePlacement":
        return Response.json(
          await updateBannerPlacementAsync({
            id: body.id ?? "",
            name: body.name,
            noAdPolicy: body.noAdPolicy,
            siteKey: body.siteKey,
            siteUrl: body.siteUrl,
            slotKey: body.slotKey,
            status: body.status,
            type: body.type,
          }),
        );
      case "createCreative":
        return Response.json(
          await createBannerCreativeAsync({
            height: body.height,
            imageUrl: body.imageUrl ?? "",
            name: body.name ?? "",
            offerId: body.offerId,
            policyStatus: body.policyStatus,
            status: body.status,
            width: body.width,
          }),
          { status: 201 },
        );
      case "updateCreative":
        return Response.json(
          await updateBannerCreativeAsync({
            height: body.height,
            id: body.id ?? "",
            imageUrl: body.imageUrl,
            name: body.name,
            offerId: body.offerId,
            policyStatus: body.policyStatus,
            status: body.status,
            width: body.width,
          }),
        );
      case "createTrackingLink":
        return Response.json(
          await createBannerTrackingLinkAsync({
            offerId: body.offerId,
            offerName: body.offerName,
            publicUrl: body.publicUrl ?? "",
            slug: body.slug ?? "",
            status: body.status,
          }),
          { status: 201 },
        );
      case "updateTrackingLink":
        return Response.json(
          await updateBannerTrackingLinkAsync({
            id: body.id ?? "",
            offerId: body.offerId,
            offerName: body.offerName,
            publicUrl: body.publicUrl,
            slug: body.slug,
            status: body.status,
          }),
        );
      case "assignPlacement":
        return Response.json(
          await assignBannerPlacementAsync({
            creativeId: body.creativeId ?? "",
            placementId: body.placementId ?? "",
            trackingLinkId: body.trackingLinkId ?? "",
            weight: body.weight,
          }),
          { status: 201 },
        );
      default:
        return Response.json({ error: "Unknown banner management action." }, { status: 400 });
    }
  } catch (error) {
    return Response.json(
      { error: errorMessage(error) },
      { status: isBannerAdminUnauthorizedError(error) ? 401 : isBannerWriteDisabledError(error) ? 403 : 500 },
    );
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Banner management request failed.";
}
