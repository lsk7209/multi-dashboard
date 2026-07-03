import { describe, expect, it } from "vitest";

import {
  buildAffiliateSiteRouting,
  buildAffiliateItems,
  normalizeProgram,
} from "./update-monetization-workspace.js";

describe("update-monetization-workspace affiliate normalization", () => {
  it("keeps affiliate item routing fields needed by the dashboard", () => {
    const program = normalizeProgram({
      id: "coupang-partners",
      name: "Coupang Partners",
      status: "candidate",
      priority: "p0",
      region: "KR",
      network: "Coupang",
      category: "ecommerce",
      platform_url: "https://partners.coupang.com/",
      apply_url: "https://partners.coupang.com/",
      source_url: "https://partners.coupangcdn.com/partners-guide/partners-guide-20240716100922.pdf",
      payout_model: "CPS; verify current rate.",
      approval_difficulty: "low",
      banner_suitability: "high",
      content_fit: ["product reviews"],
      recommended_slots: ["article-mid-728x90"],
      risk: "medium",
      compliance_notes: ["Use affiliate disclosure."],
      disclosure: { required: true, note: "Disclosure required." },
      operations: {
        last_reviewed: "2026-07-03",
        next_action: "Apply and create first banner.",
      },
      tracking: { public_label: "coupang-partners" },
    });

    const [item] = buildAffiliateItems([program]);

    expect(item).toMatchObject({
      applyUrl: "https://partners.coupang.com/",
      bannerSuitability: "high",
      priority: "p0",
      programId: "coupang-partners",
      region: "KR",
    });
    expect(item.contentFit).toContain("product reviews");
    expect(item.recommendedSlots).toContain("article-mid-728x90");
    expect(item.complianceNotes).toContain("Use affiliate disclosure.");
  });

  it("sorts lower-risk p0 items ahead of later priorities", () => {
    const programs = [
      normalizeProgram({
        id: "manual-network",
        name: "Manual Network",
        priority: "manual",
        risk: "low",
      }),
      normalizeProgram({
        id: "global-commerce",
        name: "Global Commerce",
        priority: "p0",
        risk: "medium",
      }),
      normalizeProgram({
        id: "safe-saas",
        name: "Safe SaaS",
        priority: "p0",
        risk: "low",
      }),
    ];

    expect(buildAffiliateItems(programs).map((item) => item.programId)).toEqual([
      "safe-saas",
      "global-commerce",
      "manual-network",
    ]);
  });

  it("builds site-level affiliate routing from site config and Coupang registry", () => {
    const routes = buildAffiliateSiteRouting({
      coupangRegistry: {
        channels: [
          {
            domain: "todaypharm.kr",
            notes: "Registered channel.",
            siteId: "todaypharm",
            status: "registered",
          },
        ],
      },
      sitesConfig: {
        sites: [
          {
            affiliate: {
              activePrograms: ["skimlinks"],
              blockedPrograms: ["coupang-partners"],
              coupangExposure: "blocked_non_korean_audience",
              notes: "English audience.",
              primaryAudience: "English readers",
              targetMarket: "global_en",
            },
            enabled: true,
            id: "gradienttrail",
            monetization: true,
            name: "gradienttrail.com",
            platform: "static",
            url: "https://gradienttrail.com/",
          },
          {
            enabled: true,
            id: "todaypharm",
            monetization: true,
            name: "todaypharm.kr",
            platform: "next",
            url: "https://todaypharm.kr/",
          },
        ],
      },
    });

    expect(routes).toContainEqual(
      expect.objectContaining({
        activePrograms: ["coupang-partners"],
        coupangChannelStatus: "registered",
        coupangExposure: "registered_channel_allowed",
        domain: "todaypharm.kr",
        targetMarket: "kr",
      }),
    );
    expect(routes).toContainEqual(
      expect.objectContaining({
        activePrograms: ["skimlinks"],
        blockedPrograms: ["coupang-partners"],
        coupangChannelStatus: "not_listed",
        coupangExposure: "blocked_non_korean_audience",
        domain: "gradienttrail.com",
        targetMarket: "global_en",
      }),
    );
  });
});
