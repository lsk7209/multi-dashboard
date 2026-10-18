import { describe, expect, it } from "vitest";
import { collectSources, collectStatus, exactSiteMatches, listAllPages, loadAccountConfigs, parseAccountConfig, publicSiteStates } from "./collect-adsense-account-status";

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

  it("combines complete sources and deduplicates repeated account and site observations", async () => {
    const source = (account: string, domain: string) => () => collectStatus(
      async () => ({ items: [{ name: account }] }),
      async () => ({ items: [{ domain, state: "READY" }] }),
      () => "2026-10-18T00:00:00.000Z",
    );
    const result = await collectSources([
      source("accounts/a", "EXAMPLE.COM."), source("accounts/a", "example.com"),
      source("accounts/b", "example.com"),
    ], () => "2026-10-18T00:00:00.000Z");
    expect(result).toMatchObject({ listComplete: true, accountsFound: 2, totalSites: 2,
      checkedAt: "2026-10-18T00:00:00.000Z" });
    expect(result.sites.map(site => site.accountRef).sort()).toEqual(["accounts/a", "accounts/b"]);
  });

  it("keeps a partial source from marking the aggregate complete", async () => {
    const result = await collectSources([
      () => collectStatus(async () => ({ items: [{ name: "accounts/a" }] }),
        async () => ({ items: [{ domain: "example.com", state: "READY" }] })),
      async () => { throw Object.assign(new Error("private token"), { code: 401 }); },
    ]);
    expect(result).toMatchObject({ listComplete: false, checkedAt: null, totalSites: 1,
      failure: { stage: "credentials", httpStatus: 401 } });
    expect(JSON.stringify(result)).not.toContain("private token");
  });

  it("requires the configured account to appear in accounts.list", async () => {
    const result = await collectStatus(async () => ({ items: [{ name: "accounts/other" }] }),
      async () => ({ items: [{ domain: "example.com", state: "READY" }] }),
      () => "2026-10-18T00:00:00.000Z", "accounts/expected");
    expect(result).toMatchObject({ listComplete: false, checkedAt: null,
      failure: { stage: "accounts.list", httpStatus: null } });
    expect(result.sites).toEqual([]);
  });

  it("validates private multi-account configuration", () => {
    expect(parseAccountConfig([{ clientPath: "client.json", tokenPath: "token.json", accountRef: "accounts/a" }]))
      .toHaveLength(1);
    expect(() => parseAccountConfig([])).toThrow();
    expect(() => parseAccountConfig([{ clientPath: "client.json", tokenPath: "token.json", accountRef: "bad" }])).toThrow();
  });

  it("uses the private default config when present and preserves explicit legacy flags", async () => {
    const legacy = { clientPath: "old-client", tokenPath: "old-token" };
    const read = async (file: string) => {
      expect(file).toBe("E:\\env\\adsense_accounts.json");
      return JSON.stringify([{ clientPath: "new-client", tokenPath: "new-token", accountRef: "accounts/new" }]);
    };
    expect(await loadAccountConfigs(undefined, false, legacy, read)).toEqual([
      { clientPath: "new-client", tokenPath: "new-token", accountRef: "accounts/new" },
    ]);
    expect(await loadAccountConfigs(undefined, true, legacy, async () => { throw new Error("should not read"); }))
      .toEqual([legacy]);
    expect(await loadAccountConfigs(undefined, false, legacy, async () => {
      throw Object.assign(new Error("not found"), { code: "ENOENT" });
    })).toEqual([legacy]);
  });

  it("fails closed on an invalid or unreadable explicitly configured file", async () => {
    const legacy = { clientPath: "old-client", tokenPath: "old-token" };
    await expect(loadAccountConfigs("private.json", false, legacy, async () => "[]")).rejects.toThrow();
    await expect(loadAccountConfigs("private.json", false, legacy, async () => {
      throw Object.assign(new Error("not found"), { code: "ENOENT" });
    })).rejects.toThrow();
  });

  it("publishes one conservative state per domain when accounts disagree", () => {
    const site = (accountRef: string, domain: string, rawState: string) => ({
      accountRef, domain, rawState, autoAdsEnabled: null,
    });
    expect(publicSiteStates([
      site("accounts/a", "Example.com", "READY"),
      site("accounts/b", "example.com", "NEEDS_ATTENTION"),
      site("accounts/c", "same.com", "READY"),
      site("accounts/d", "SAME.COM.", "READY"),
    ])).toEqual([{ domain: "example.com", rawState: "UNKNOWN" }, { domain: "same.com", rawState: "READY" }]);
  });
});
