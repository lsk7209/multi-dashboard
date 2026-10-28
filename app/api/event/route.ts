import { affiliatePublicOptions, affiliatePublicPost } from "../../lib/affiliate-public-proxy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function OPTIONS(request: Request) { return affiliatePublicOptions(request, "event"); }
export async function POST(request: Request) { return affiliatePublicPost(request, "event"); }
