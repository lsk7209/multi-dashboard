import { affiliatePublicAsset } from "../lib/affiliate-public-proxy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return affiliatePublicAsset(request, "/widget.css"); }
