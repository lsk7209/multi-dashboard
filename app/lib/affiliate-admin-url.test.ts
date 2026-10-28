import { describe, expect, it } from "vitest";
import { DEFAULT_AFFILIATE_ADMIN_URL, validateAffiliateAdminUrl } from "./affiliate-admin-url";

describe("Affiliate OS admin navigation boundary", () => {
  it.each([DEFAULT_AFFILIATE_ADMIN_URL, "http://localhost:18787/admin", "http://[::1]:18787/admin", "https://affiliate.example.com/admin"])("accepts an HTTPS admin or local tunnel: %s", value => {
    expect(validateAffiliateAdminUrl(` ${value} `)).toBe(value);
  });
  it.each(["", "//evil.example/admin", "javascript:alert(1)", "data:text/html,test", "file:///admin", "http://affiliate.example.com/admin", "http://127.0.0.1.example.com/admin", "https://user:password@example.com/admin", "https://example.com/admin?token=secret", "https://example.com/admin#secret", "https://example.com/", "https://example.com/api/admin", "https://example.com/admin/"])("rejects unsafe or unintended destinations: %s", value => {
    expect(validateAffiliateAdminUrl(value)).toBeNull();
  });
});
