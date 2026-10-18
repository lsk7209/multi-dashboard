import { describe, it, expect } from "vitest";
import { bindingStatus } from "./collect-google-site-bindings";

describe("GA4 property domain verification", () => {
  it("detects a different domain even with no stream for requested domain", () => {
    expect(bindingStatus("foo.com", "123", [{ property: "properties/123", domain: "bar.com" }])).toBe("mismatch");
  });
  it("normalizes canonical www aliases and checks property identity", () => {
    expect(bindingStatus("foo.com", "123", [{ property: "properties/123", domain: "www.foo.com" }])).toBe("verified");
    expect(bindingStatus("foo.com", "123", [{ property: "properties/456", domain: "foo.com" }])).toBe("unknown");
  });
  it("does not guess with missing web stream URI", () => {
    expect(bindingStatus("foo.com", "123", [{ property: "properties/123", domain: null }])).toBe("unknown");
    expect(bindingStatus("foo.com", null, [])).toBe("unknown");
  });
});
