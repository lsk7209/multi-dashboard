import { describe, expect, it } from "vitest";

import {
  type CoupangChannelRegistrySnapshot,
  decideCoupangExposure,
} from "./monetization-workspace";

const registry: CoupangChannelRegistrySnapshot = {
  generatedAt: "2026-07-03T08:45:00.000Z",
  policy: {
    exposureMode: "approved_only",
    notes: [],
    requiredDisclosureKo: "required disclosure",
  },
  channels: [
    {
      approvedAt: "2026-07-03",
      domain: "approved.example.com",
      firstUse: "test placement",
      notes: "",
      priority: "p0",
      registeredAt: "2026-07-03",
      screenshotUrl: "",
      siteId: "approved-site",
      status: "approved",
    },
    {
      approvedAt: null,
      domain: "pending.example.com",
      firstUse: "test placement",
      notes: "",
      priority: "p0",
      registeredAt: null,
      screenshotUrl: "",
      siteId: "pending-site",
      status: "not_registered",
    },
    {
      approvedAt: null,
      domain: "registered.example.com",
      firstUse: "approval screenshot placement",
      notes: "",
      priority: "p0",
      registeredAt: "2026-07-03",
      screenshotUrl: "",
      siteId: "registered-site",
      status: "registered",
    },
  ],
};

describe("decideCoupangExposure", () => {
  it("allows approved registered channels", () => {
    expect(
      decideCoupangExposure(registry, {
        domain: "https://www.approved.example.com/path",
      }),
    ).toMatchObject({
      allowed: true,
      reason: "approved",
    });
  });

  it("blocks channels until they are approved", () => {
    expect(
      decideCoupangExposure(registry, { siteId: "pending-site" }),
    ).toMatchObject({
      allowed: false,
      reason: "channel_not_registered",
    });
  });

  it("allows registered channels only for approval screenshot exposure", () => {
    expect(
      decideCoupangExposure(registry, { siteId: "registered-site" }),
    ).toMatchObject({
      allowed: false,
      reason: "channel_registered",
    });

    expect(
      decideCoupangExposure(registry, {
        purpose: "approval_screenshot",
        siteId: "registered-site",
      }),
    ).toMatchObject({
      allowed: true,
      reason: "approval_registered",
    });
  });

  it("blocks unknown domains", () => {
    expect(
      decideCoupangExposure(registry, { domain: "unknown.example.com" }),
    ).toMatchObject({
      allowed: false,
      reason: "channel_not_found",
    });
  });
});
