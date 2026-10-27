export const DEFAULT_AFFILIATE_ADMIN_URL = "http://127.0.0.1:18787/admin";
export const AFFILIATE_ADMIN_STORAGE_KEY = "multi-dashboard.affiliate-admin-url.v1";

/** Navigation only: no server-side fetch, credentials or API proxy. */
export function validateAffiliateAdminUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) return null;
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/admin") return null;
    return url.href;
  } catch { return null; }
}
