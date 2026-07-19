import { describe, expect, it } from "vitest";
import {
  buildT3TitleContentHandoff,
  renderT3TitleContentHandoffMarkdown,
} from "./create-t3-title-content-handoff.js";

const SNAPSHOT = "2026-07-05T11:44:06.091Z";

describe("create-t3-title-content-handoff", () => {
  it("builds a non-mutating handoff from current T3 title/content candidates", () => {
    const handoff = buildT3TitleContentHandoff({
      plan: {
        dashboardEvidence: {
          snapshotTimestamp: SNAPSHOT,
          refreshCommand: "pnpm stats:update",
          refreshFailedSources: ["skipped_refresh_failed:gsc:auth_error:1"],
        },
        seoCandidates: [
          candidate({ host: "petinsuer.com", actionType: "title_handoff", rank: 10 }),
          candidate({ host: "petinsuer.com", actionType: "content_handoff", rank: 11 }),
          candidate({ host: "homeimer.com", actionType: "technical_seo", rank: 12, tier: "T2" }),
        ],
      },
      stats: {
        generatedAt: SNAPSHOT,
        stats: [
          {
            id: "petinsuer-2",
            url: "https://petinsuer.com/",
            gscTopQueries: [
              {
                query: "노견 기준",
                impressions: 10,
                clicks: 0,
                ctr: 0,
                position: 7.8,
              },
            ],
            sitemapPath: "https://petinsuer.com/sitemap_index.xml",
            sitemapWarnings: 0,
            sitemapErrors: 0,
            adsenseStatus: "ok",
            adsTxtStatus: "ok",
          },
        ],
      },
      siteProfiles: [
        {
          id: "petinsuer",
          url: "https://petinsuer.com/",
          platform: "wordpress",
          wpRestBase: "https://petinsuer.com/wp-json/wp/v2",
        },
        {
          id: "petinsuer-2",
          url: "https://petinsuer.com/",
          platform: "wordpress",
          wpRestBase: "https://petinsuer.com/wp-json/wp/v2",
          contentSource: {
            type: "local-app",
            localPath: "D:\\web\\petinsuercom",
          },
        },
      ],
      planPath: "data/fleet-optimization-plan-2026-07-05.json",
      statsPath: "data/site-stats.json",
      sitesPath: "scripts/setup/sites.yaml",
    });

    expect(handoff.mutationStatus).toMatchObject({
      cmsMutationPerformed: false,
      productionDeploymentPerformed: false,
      searchConsoleMutationPerformed: false,
      adsenseMutationPerformed: false,
      titleOrBodyMutationPerformed: false,
    });
    expect(handoff.summary).toMatchObject({
      siteCount: 1,
      titleHandoffCount: 1,
      contentHandoffCount: 1,
    });
    expect(handoff.sites[0]).toMatchObject({
      host: "petinsuer.com",
      localPath: "D:\\web\\petinsuercom",
      platform: "wordpress",
      actions: ["title_handoff", "content_handoff"],
      planRanks: [10, 11],
      topQueries: [{ query: "노견 기준", impressions: 10 }],
    });
  });

  it("rejects a plan and stats snapshot mismatch", () => {
    expect(() =>
      buildT3TitleContentHandoff({
        plan: {
          dashboardEvidence: {
            snapshotTimestamp: SNAPSHOT,
          },
          seoCandidates: [],
        },
        stats: {
          generatedAt: "2026-07-04T00:00:00.000Z",
          stats: [],
        },
        siteProfiles: [],
        planPath: "data/fleet-optimization-plan-2026-07-05.json",
        statsPath: "data/site-stats.json",
        sitesPath: "scripts/setup/sites.yaml",
      }),
    ).toThrow(/does not match stats snapshot/);
  });

  it("renders stop conditions that keep title and body edits out of scope", () => {
    const handoff = buildT3TitleContentHandoff({
      plan: {
        dashboardEvidence: {
          snapshotTimestamp: SNAPSHOT,
        },
        seoCandidates: [
          candidate({ host: "dogswhere.com", actionType: "title_handoff", rank: 6 }),
        ],
      },
      stats: {
        generatedAt: SNAPSHOT,
        stats: [{ url: "https://dogswhere.com/" }],
      },
      siteProfiles: [],
      planPath: "data/fleet-optimization-plan-2026-07-05.json",
      statsPath: "data/site-stats.json",
      sitesPath: "scripts/setup/sites.yaml",
    });

    const markdown = renderT3TitleContentHandoffMarkdown(handoff);

    expect(markdown).toContain("Mutation status: no CMS");
    expect(markdown).toContain("Do not edit WordPress titles");
    expect(markdown).toContain("dogswhere.com");
  });

  it("keeps duplicate candidate rows visible while deduping site actions", () => {
    const handoff = buildT3TitleContentHandoff({
      plan: {
        dashboardEvidence: {
          snapshotTimestamp: SNAPSHOT,
        },
        seoCandidates: [
          candidate({ host: "dogswhere.com", actionType: "title_handoff", rank: 6 }),
          candidate({ host: "dogswhere.com", actionType: "title_handoff", rank: 8 }),
        ],
      },
      stats: {
        generatedAt: SNAPSHOT,
        stats: [{ url: "https://dogswhere.com/" }],
      },
      siteProfiles: [],
      planPath: "data/fleet-optimization-plan-2026-07-05.json",
      statsPath: "data/site-stats.json",
      sitesPath: "scripts/setup/sites.yaml",
    });

    expect(handoff.summary.titleHandoffCount).toBe(2);
    expect(handoff.sites[0]?.actions).toEqual(["title_handoff"]);
    expect(handoff.sites[0]?.planRanks).toEqual([6, 8]);
  });

  it("uses a combined recommendation for sites with title and content handoff actions", () => {
    const handoff = buildT3TitleContentHandoff({
      plan: {
        dashboardEvidence: {
          snapshotTimestamp: SNAPSHOT,
        },
        seoCandidates: [
          candidate({ host: "estat.kr", actionType: "title_handoff", rank: 3 }),
          candidate({ host: "estat.kr", actionType: "content_handoff", rank: 4 }),
        ],
      },
      stats: {
        generatedAt: SNAPSHOT,
        stats: [{ url: "https://estat.kr/" }],
      },
      siteProfiles: [
        {
          id: "estat-2",
          url: "https://estat.kr/",
          platform: "wordpress",
          contentSource: { type: "local-app", localPath: "D:\\web\\estatkr" },
        },
      ],
      planPath: "data/fleet-optimization-plan-2026-07-05.json",
      statsPath: "data/site-stats.json",
      sitesPath: "scripts/setup/sites.yaml",
    });

    expect(handoff.sites[0]?.recommendedNextAction).toContain("Title + content workflow");
    expect(handoff.sites[0]?.recommendedNextAction).toContain("article bodies");
  });

  it("limits sites without a controlled local source to evidence collection", () => {
    const handoff = buildT3TitleContentHandoff({
      plan: {
        dashboardEvidence: { snapshotTimestamp: SNAPSHOT },
        seoCandidates: [
          candidate({ host: "dogspang.kr", actionType: "title_handoff", rank: 10 }),
        ],
      },
      stats: {
        generatedAt: SNAPSHOT,
        stats: [{ url: "https://dogspang.kr/" }],
      },
      siteProfiles: [
        {
          id: "dogspang-2",
          url: "https://dogspang.kr/",
          platform: "wordpress",
        },
      ],
      planPath: "data/fleet-optimization-plan-2026-07-05.json",
      statsPath: "data/site-stats.json",
      sitesPath: "scripts/setup/sites.yaml",
    });

    expect(handoff.sites[0]).toMatchObject({ localPath: "" });
    expect(handoff.sites[0]?.recommendedNextAction).toContain("Evidence collection only");
  });

  it("preserves Korean GSC query text in handoff evidence", () => {
    const handoff = buildT3TitleContentHandoff({
      plan: {
        dashboardEvidence: {
          snapshotTimestamp: SNAPSHOT,
        },
        seoCandidates: [
          candidate({ host: "petinsuer.com", actionType: "content_handoff", rank: 11 }),
        ],
      },
      stats: {
        generatedAt: SNAPSHOT,
        stats: [
          {
            url: "https://petinsuer.com/",
            gscTopQueries: [
              { query: "노견 기준", impressions: 10, clicks: 0, ctr: 0, position: 7.8 },
            ],
          },
        ],
      },
      siteProfiles: [],
      planPath: "data/fleet-optimization-plan-2026-07-05.json",
      statsPath: "data/site-stats.json",
      sitesPath: "scripts/setup/sites.yaml",
    });

    expect(handoff.sites[0]?.topQueries[0]?.query).toBe("노견 기준");
  });

  it("matches Search Console domain properties when collecting stats evidence", () => {
    const handoff = buildT3TitleContentHandoff({
      plan: {
        dashboardEvidence: {
          snapshotTimestamp: SNAPSHOT,
        },
        seoCandidates: [
          candidate({ host: "example.com", url: "https://example.com/", actionType: "content_handoff" }),
        ],
      },
      stats: {
        generatedAt: SNAPSHOT,
        stats: [
          {
            gscSiteUrl: "sc-domain:example.com",
            gscTopQueries: [{ query: "example query", impressions: 12, clicks: 1, ctr: 0.08, position: 4.2 }],
            sitemapPath: "https://example.com/sitemap.xml",
            adsenseStatus: "ok",
            adsTxtStatus: "ok",
          },
        ],
      },
      siteProfiles: [],
      planPath: "data/fleet-optimization-plan-2026-07-05.json",
      statsPath: "data/site-stats.json",
      sitesPath: "scripts/setup/sites.yaml",
    });

    expect(handoff.sites[0]).toMatchObject({
      topQueries: [{ query: "example query", impressions: 12 }],
      technicalStatus: {
        sitemapPath: "https://example.com/sitemap.xml",
        adsenseStatus: "ok",
        adsTxtStatus: "ok",
      },
    });
  });
});

function candidate(overrides: Record<string, unknown>) {
  return {
    rank: 1,
    siteId: "site",
    host: "example.com",
    url: "https://example.com/",
    actionType: "title_handoff",
    tier: "T3",
    metrics: {
      gscImpressions30d: 1000,
      gscClicks30d: 10,
      gscCtr30d: 0.01,
      gscPosition30d: 9.5,
      ga4ActiveUsers30d: 80,
    },
    ...overrides,
  };
}
