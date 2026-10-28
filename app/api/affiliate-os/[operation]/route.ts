import { affiliateOsRequest } from "../../../lib/affiliate-os-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ operation: string }> };

export async function GET(request: Request, context: Context) {
  return affiliateOsRequest(request, (await context.params).operation);
}

export async function POST(request: Request, context: Context) {
  return affiliateOsRequest(request, (await context.params).operation);
}
