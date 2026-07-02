import { execFile } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSshProbeFailureMemoForTests,
  getWordpressSshSource,
  redactSshDetail,
  resolveSshPorts,
  runWordpressSshCommand,
} from "./ssh-probe.js";
import type { Site } from "./sites.js";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

describe("ssh-probe", () => {
  beforeEach(() => {
    vi.mocked(execFile).mockReset();
    clearSshProbeFailureMemoForTests();
  });

  it("tries configured SSH port before falling back to port 22", async () => {
    vi.mocked(execFile)
      .mockImplementationOnce((_file, _args, _options, callback) => {
        callback?.(new Error("connect to host example port 1988 timed out"), "", "");
        return undefined as never;
      })
      .mockImplementationOnce((_file, _args, _options, callback) => {
        callback?.(null, "WP_ROOT_OK\n", "");
        return undefined as never;
      });

    const result = await runWordpressSshCommand(site({ sshPort: 1988 }), "test -f wp-load.php", {
      timeoutMs: 45_000,
      connectTimeoutSeconds: 15,
    });

    expect(result.ok).toBe(true);
    expect(result.usedPort).toBe(22);
    expect(result.stdout).toContain("WP_ROOT_OK");
    expect(vi.mocked(execFile).mock.calls.map((call) => call[1])).toEqual([
      expect.arrayContaining(["-p", "1988"]),
      expect.arrayContaining(["-p", "22"]),
    ]);
  });

  it("deduplicates fallback ports", () => {
    expect(resolveSshPorts({ sshPort: 22 })).toEqual([22]);
    expect(resolveSshPorts({ sshPort: 1988 })).toEqual([1988, 22]);
  });

  it("redacts SSH key paths from failure details", () => {
    expect(
      redactSshDetail(new Error("ssh -i D:\\env\\secret_key -p 1988 failed")),
    ).toBe("ssh -i [ssh-key] -p 1988 failed");
  });

  it("memoizes clear transport failures for the same SSH endpoint during one run", async () => {
    vi.mocked(execFile)
      .mockImplementationOnce((_file, _args, _options, callback) => {
        callback?.(new Error("connect to host example port 1988 timed out"), "", "");
        return undefined as never;
      })
      .mockImplementationOnce((_file, _args, _options, callback) => {
        callback?.(new Error("connect to host example port 22 timed out"), "", "");
        return undefined as never;
      });

    const first = await runWordpressSshCommand(site({ sshPort: 1988 }), "test -f wp-load.php", {
      timeoutMs: 45_000,
      connectTimeoutSeconds: 15,
    });
    const second = await runWordpressSshCommand(site({ sshPort: 1988 }), "test -f wp-load.php", {
      timeoutMs: 45_000,
      connectTimeoutSeconds: 15,
    });

    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);
    expect(second.attempts.map((attempt) => attempt.detail)).toEqual([
      expect.stringContaining("cached prior failure"),
      expect.stringContaining("cached prior failure"),
    ]);
    expect(vi.mocked(execFile)).toHaveBeenCalledTimes(2);
  });

  it("does not memoize remote command failures", async () => {
    vi.mocked(execFile)
      .mockImplementationOnce((_file, _args, _options, callback) => {
        callback?.(new Error("Command failed: test -f wp-load.php"), "", "missing wp-load.php");
        return undefined as never;
      })
      .mockImplementationOnce((_file, _args, _options, callback) => {
        callback?.(new Error("Command failed: test -f wp-load.php"), "", "missing wp-load.php");
        return undefined as never;
      });

    await runWordpressSshCommand(site({ sshPort: 22 }), "test -f wp-load.php", {
      timeoutMs: 45_000,
      connectTimeoutSeconds: 15,
    });
    await runWordpressSshCommand(site({ sshPort: 22 }), "test -f wp-load.php", {
      timeoutMs: 45_000,
      connectTimeoutSeconds: 15,
    });

    expect(vi.mocked(execFile)).toHaveBeenCalledTimes(2);
  });

  it("detects complete wordpress SSH source config", () => {
    expect(getWordpressSshSource(site({ sshPort: 1988 }))).toMatchObject({
      type: "wordpress-ssh",
      sshHost: "example.com",
      sshUser: "deploy",
      sshPort: 1988,
      wpPath: "/home/deploy/example.com",
    });
    expect(
      getWordpressSshSource({
        ...site({ sshPort: 1988 }),
        contentSource: { type: "local-app", localPath: "D:/web/example" },
      }),
    ).toBeUndefined();
  });
});

function site(overrides: { sshPort?: number }): Site {
  return {
    id: "example",
    name: "Example",
    enabled: true,
    platform: "wordpress",
    url: "https://example.com/",
    wpRestBase: "https://example.com/wp-json/wp/v2",
    monetization: true,
    contentSource: {
      type: "wordpress-ssh",
      sshHost: "example.com",
      sshUser: "deploy",
      sshKeyPath: "D:\\env\\secret_key",
      wpPath: "/home/deploy/example.com",
      ...overrides,
    },
  };
}
