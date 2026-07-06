import { describe, expect, it } from "vitest";
import { buildGscPermissionAudit, renderMarkdown } from "./audit-gsc-permissions.js";

describe("audit-gsc-permissions", () => {
  it("classifies unverified and missing Search Console properties", () => {
    const artifact = buildGscPermissionAudit({
      snapshot: {
        generatedAt: "2026-06-23T16:50:36.214Z",
        stats: [
          row("certifi", "https://certifi.kr/", "auth_error"),
          row("finan", "https://finan.kr/", "auth_error"),
          row("ok-site", "https://ok.example/", "ok"),
        ],
      },
      siteEntries: [
        {
          siteUrl: "https://certifi.kr/",
          permissionLevel: "siteUnverifiedUser",
        },
      ],
      serviceAccountEmail: "dashboard@example.iam.gserviceaccount.com",
    });

    expect(artifact.collectorSnapshot).toContain(
      "generatedAt=2026-06-23T16:50:36.214Z",
    );
    expect(artifact.productionMutationPerformed).toBe(false);
    expect(artifact.gscMutationPerformed).toBe(false);
    expect(artifact.handoffStatus).toBe("pending_external");
    expect(artifact.serviceAccountEmail).toBe("dashboard@example.iam.gserviceaccount.com");
    expect(artifact.summary).toMatchObject({
      auditedRows: 2,
      unverified: 1,
      notListed: 1,
    });
    expect(artifact.results.map((result) => result.siteId)).toEqual([
      "certifi",
      "finan",
    ]);
    expect(artifact.results[0]).toMatchObject({
      permissionLevel: "siteUnverifiedUser",
      accessState: "unverified",
    });
    expect(artifact.results[1]).toMatchObject({
      permissionLevel: null,
      accessState: "not_listed",
    });

    const markdown = renderMarkdown(artifact);
    expect(markdown).toContain("dashboard@example.iam.gserviceaccount.com");
    expect(markdown).toContain("Handoff status: `pending_external`");
    expect(markdown).toContain(
      "Snapshot: `data/site-stats.json generatedAt=2026-06-23T16:50:36.214Z`",
    );
    expect(markdown).toContain("https://certifi.kr/");
    expect(markdown).toContain("pnpm stats:update");
    expect(markdown).toContain("pnpm dashboard:post-recovery");
    expect(markdown).toContain("pnpm dashboard:artifact-integrity");
    expect(markdown).toContain("dashboard:acceptance");
    expect(markdown).toContain("ready_to_act");
    expect(markdown).toContain("Do not change DNS, site files, CMS content");
  });

  it("marks the handoff pending local refresh when every audited row has owner access", () => {
    const artifact = buildGscPermissionAudit({
      snapshot: {
        generatedAt: "2026-06-23T16:50:36.214Z",
        stats: [row("transient", "https://transient.example/", "auth_error")],
      },
      siteEntries: [
        {
          siteUrl: "https://transient.example/",
          permissionLevel: "siteOwner",
        },
      ],
    });

    expect(artifact.handoffStatus).toBe("pending_local_refresh");
    expect(artifact.summary).toMatchObject({
      auditedRows: 1,
      ownerAccess: 1,
      restrictedAccess: 0,
      unverified: 0,
      notListed: 0,
    });
  });

  it("marks the handoff resolved only when no audit rows remain", () => {
    const artifact = buildGscPermissionAudit({
      snapshot: {
        generatedAt: "2026-06-23T16:50:36.214Z",
        stats: [row("ok-site", "https://ok.example/", "ok")],
      },
      siteEntries: [],
    });

    expect(artifact.handoffStatus).toBe("resolved");
    expect(artifact.summary.auditedRows).toBe(0);
  });
});

function row(id: string, url: string, gscStatus: string) {
  return {
    id,
    name: id,
    url,
    gscSiteUrl: url,
    gscStatus,
  };
}
