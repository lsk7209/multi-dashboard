import { affiliateAdminAsset } from "../lib/affiliate-admin-proxy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() { return affiliateAdminAsset("/workspace.css"); }
