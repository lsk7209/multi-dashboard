import { describe, expect, it } from "vitest";
import { collectStatus, exactSiteMatches, listAllPages } from "./collect-adsense-account-status";

describe("AdSense account status collection", () => {
  it("collects every account and site page", async () => {
    const result = await collectStatus(
      async (token) => token
        ? { items: [{ name: "accounts/b" }] }
        : { items: [{ name: "accounts/a" }], nextPageToken: "a2" },
      async (account, token) => account === "accounts/a" && !token
        ? { items: [{ domain: "example.com", state: "READY" }], nextPageToken: "s2" }
        : account === "accounts/a"
          ? { items: [{ domain: "blog.example.com", state: "NEEDS_ATTENTION" }] }
          : { items: [{ domain: "other.com", state: "GETTING_READY" }] },
      () => "2026-10-18T00:00:00.000Z",
    );
    expect(result).toMatchObject({ listComplete: true, accountsFound: 2, totalSites: 3, checkedAt: "2026-10-18T00:00:00.000Z" });
    expect(exactSiteMatches(result.sites, "EXAMPLE.COM.")).toHaveLength(1);
    expect(exactSiteMatches(result.sites, "blog.example.com")[0].rawState).toBe("NEEDS_ATTENTION");
  });

  it("fails closed when a later site page fails", async () => {
    const result = await collectStatus(
      async () => ({ items: [{ name: "accounts/a" }] }),
      async (account, token) => {
        if (token) throw Object.assign(new Error("sensitive response"), { code: 403 });
        return { items: [{ domain: "example.com", state: "READY" }], nextPageToken: "s2" };
      },
    );
    expect(result).toMatchObject({ listComplete: false, checkedAt: null, failure: { stage: "accounts.sites.list", httpStatus: 403 } });
    expect(JSON.stringify(result)).not.toContain("sensitive response");
  });

  it("fails closed when a later account page fails", async () => {
    const result = await collectStatus(
      async (token) => {
        if (token) throw Object.assign(new Error("credential detail"), { code: 401 });
        return { items: [{ name: "accounts/a" }], nextPageToken: "a2" };
      },
      async () => ({ items: [] }),
    );
    expect(result).toMatchObject({ listComplete: false, checkedAt: null, accountsFound: 0,
      failure: { stage: "accounts.list", httpStatus: 401 } });
    expect(JSON.stringify(result)).not.toContain("credential detail");
  });

  it("fails closed on a repeated page token", async () => {
    await expect(listAllPages(async () => ({ items: [1], nextPageToken: "same" }))).rejects.toThrow("Repeated page token");
  });
});
