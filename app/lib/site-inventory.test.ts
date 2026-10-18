import { describe, expect, it } from "vitest";
import { classifyHost, exactApproval, hostingDisagreement } from "./site-inventory";

describe("hosting and approval reconciliation", () => {
  it("recognizes live addresses including Turbo2 cPanel proxy", () => {
    expect(classifyHost(["51.79.206.71"], [], false)).toBe("ovh");
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
