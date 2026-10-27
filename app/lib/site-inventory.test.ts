import { describe, expect, it } from "vitest";
import { classifyHost, currentStagingTargets, exactApproval, hostingDisagreement, migrationAwareHost } from "./site-inventory";

describe("hosting and approval reconciliation", () => {
  it("keeps fresh private stage evidence separate from the public serving host", () => {
    const checkedAt = "2026-10-27T09:00:00Z";
    const stages = [{ domain: "example.com", host: "contabo", checkedAt },
      { domain: "other.com", host: "contabo", checkedAt },
      { domain: "example.com", host: "ovh", checkedAt: "2026-10-01T00:00:00Z" },
      { domain: "example.com", host: "ovh", checkedAt: "2026-10-28T00:00:00Z" }];
    expect(currentStagingTargets("example.com", stages, Date.parse(checkedAt))).toEqual([{ host: "contabo", checkedAt }]);
    expect(currentStagingTargets("example.com", stages, Date.parse("2026-11-10"))).toEqual([]);
    expect(classifyHost([], ["abc.vercel-dns.com"], true)).toBe("vercel");
  });
  it("keeps migrated sites separate from retained source routes without guessing a Turbo destination", () => {
    expect(migrationAwareHost("kickstart", [], true)).toBe("turbo_pending");
    expect(migrationAwareHost("unknown", ["turbo2"], true)).toBe("turbo2");
    expect(migrationAwareHost("kickstart", ["turbo1", "turbo2"], true)).toBe("turbo_pending");
    expect(migrationAwareHost("ovh", [], true)).toBe("ovh");
    expect(migrationAwareHost("kickstart", [], false)).toBe("kickstart");
  });
  it("recognizes live addresses including Turbo2 cPanel proxy", () => {
    expect(classifyHost(["51.79.206.71"], [], false)).toBe("ovh");
    expect(classifyHost(["13.140.77.84"], [], false)).toBe("contabo");
    expect(classifyHost(["158.247.209.217"], [], false)).toBe("turbo2");
    expect(classifyHost(["158.247.212.123"], [], false)).toBe("turbo1");
  });
  it("does not infer hosting from app framework or unrelated CNAME", () => {
    expect(classifyHost(["1.2.3.4"], ["not-vercel-dns.com"], false)).toBe("unknown");
    expect(classifyHost([], ["abc.vercel-dns.com"], false)).toBe("vercel");
    expect(classifyHost(["51.79.206.71", "158.247.212.123"], [], false)).toBe("unknown");
  });
  it("distinguishes CDN routing variation from differing hosting origins", () => {
    expect(hostingDisagreement("vercel", ["216.150.16.193"], ["216.150.1.1"], true)).toBe(false);
    expect(hostingDisagreement("ovh", ["51.79.206.71"], ["216.198.79.1"], true)).toBe(true);
    expect(hostingDisagreement("vercel", ["216.198.79.1"], ["51.79.206.71"], true)).toBe(true);
    expect(hostingDisagreement("ovh", ["51.79.206.71"], [], false)).toBe(false);
    expect(hostingDisagreement("contabo", ["13.140.77.84"], ["13.140.77.84"], true)).toBe(false);
    expect(hostingDisagreement("contabo", ["13.140.77.84"], ["51.79.206.71"], true)).toBe(true);
    expect(hostingDisagreement("vercel", ["216.198.79.1"], ["13.140.77.84"], true)).toBe(true);
  });
  it("requires fresh complete exact-domain official approval", () => {
    const checkedAt = new Date().toISOString();
    const proof = { checkedAt, listComplete: true, sites: [{ domain: "example.com", rawState: "READY" }] };
    expect(exactApproval("example.com", true, proof)).toBe("READY");
    expect(exactApproval("sub.example.com", true, proof)).toBe("NOT_LISTED");
    expect(exactApproval("other.com", true, { ...proof, proofDomains: ["example.com"] })).toBe("UNKNOWN");
    expect(exactApproval("example.com", false, proof)).toBe("EXCLUDED");
    expect(exactApproval("example.com", true, { ...proof, listComplete: false })).toBe("UNKNOWN");
    expect(exactApproval("example.com", true, { ...proof, checkedAt: "2020-01-01" })).toBe("UNKNOWN");
  });
});
