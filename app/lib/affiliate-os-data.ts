import { z } from "zod";

const count = z.number().int().nonnegative();
const text = z.string().max(1000);
export const affiliateUser = z.object({ username: text, role: z.enum(["admin", "viewer"]) });
export const affiliateSession = z.object({ authenticated: z.literal(true), user: affiliateUser, csrf: z.string().min(1).max(200) });
export const affiliateLogin = z.object({ user: affiliateUser, csrf: z.string().min(1).max(200) });
export const affiliateSummary = z.object({ total: count, published_links: count, metadata: z.object({ reviewed: count }), latest: z.object({ synced_at: text }).nullable() });
export const affiliateItems = z.object({ total: count, limit: count.positive(), offset: count, items: z.array(z.object({ source_network: text, source_item_id: text, title: text.nullable(), merchant: text.nullable(), metadata_status: text, quality_state: text })).max(100) });
export const affiliatePublications = z.object({ items: z.array(z.object({ source_network: text, source_item_id: text, site_key: text, status: text, version_matched: z.union([z.boolean(), z.number()]), source_present: z.union([z.boolean(), z.number()]) })) });
export const affiliateSites = z.object({ sites: z.array(z.object({ site_key: text, label: text, active: z.union([z.boolean(), z.number()]) })) });
export const affiliateAnalytics = z.object({
  period: z.object({ from: text, to: text, timezone: z.literal("UTC") }),
  events: z.object({ impressions: count, clicks: count, ctr: z.number().nonnegative().nullable() }),
  revenue: z.array(z.object({ currency: text, status: text, attribution: text, orders: count, amount_decimal: z.string().regex(/^-?\d+(?:\.\d+)?$/).nullable(), unknown_amount_orders: count, legacy_orders: count })),
});

export type AffiliateSnapshot = {
  summary: z.infer<typeof affiliateSummary>;
  catalog: z.infer<typeof affiliateItems>;
  publications: z.infer<typeof affiliatePublications>;
  analytics: z.infer<typeof affiliateAnalytics>;
  sites: z.infer<typeof affiliateSites>;
};
