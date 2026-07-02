import { execFile } from "node:child_process";
import type { Site } from "./sites.js";

type WordpressSshSource = NonNullable<Site["contentSource"]> & {
  type: "wordpress-ssh";
  sshHost: string;
  sshUser: string;
  sshKeyPath: string;
  wpPath: string;
};

export interface SshProbeAttempt {
  port: number;
  status: "pass" | "fail";
  detail: string;
}

export interface SshProbeResult {
  ok: boolean;
  stdout: string;
  usedPort?: number;
  attempts: SshProbeAttempt[];
  detail: string;
}

export interface SshProbeOptions {
  timeoutMs: number;
  connectTimeoutSeconds?: number;
  ports?: number[];
}

type ExecSshError = Error & {
  stdout?: string;
  stderr?: string;
};

const sshTransportFailureMemo = new Map<string, SshProbeAttempt>();

export function clearSshProbeFailureMemoForTests(): void {
  sshTransportFailureMemo.clear();
}

export function getWordpressSshSource(site: Site): WordpressSshSource | undefined {
  const source = site.contentSource;
  if (
    source?.type !== "wordpress-ssh" ||
    !source.sshHost ||
    !source.sshUser ||
    !source.sshKeyPath ||
    !source.wpPath
  ) {
    return undefined;
  }
  return source as WordpressSshSource;
}

export function resolveSshPorts(
  source: Pick<WordpressSshSource, "sshPort">,
  ports?: number[],
): number[] {
  const candidates = ports?.length ? ports : [source.sshPort ?? 22, 22];
  return [...new Set(candidates.filter((port) => Number.isInteger(port) && port > 0))];
}

export function redactSshDetail(value: unknown): string {
  const error = value as Partial<ExecSshError>;
  const message =
    value instanceof Error
      ? [value.message, error.stderr, error.stdout].filter(Boolean).join(" ")
      : String(value);
  return message
    .replace(/-i\s+\S+/g, "-i [ssh-key]")
    .replace(/D:\\env\\[^\s"]+/g, "[ssh-key]")
    .replace(/\s+/g, " ")
    .trim();
}

export async function runWordpressSshCommand(
  site: Site,
  remoteScript: string,
  options: SshProbeOptions,
): Promise<SshProbeResult> {
  const source = getWordpressSshSource(site);
  if (!source) {
    return {
      ok: false,
      stdout: "",
      attempts: [],
      detail: "missing structured wordpress-ssh contentSource",
    };
  }

  const attempts: SshProbeAttempt[] = [];
  for (const port of resolveSshPorts(source, options.ports)) {
    const cacheKey = sshTransportFailureMemoKey(source, port);
    const cachedFailure = sshTransportFailureMemo.get(cacheKey);
    if (cachedFailure) {
      attempts.push({
        ...cachedFailure,
        detail: `cached prior failure: ${cachedFailure.detail}`,
      });
      continue;
    }

    try {
      const stdout = await execSsh(
        "ssh",
        [
          "-i",
          source.sshKeyPath,
          "-p",
          String(port),
          "-o",
          "BatchMode=yes",
          "-o",
          `ConnectTimeout=${options.connectTimeoutSeconds ?? 15}`,
          "-o",
          "StrictHostKeyChecking=accept-new",
          `${source.sshUser}@${source.sshHost}`,
          remoteScript,
        ],
        { timeout: options.timeoutMs },
      );
      attempts.push({ port, status: "pass", detail: "connected" });
      return {
        ok: true,
        stdout,
        usedPort: port,
        attempts,
        detail: `connected via port ${port}`,
      };
    } catch (error) {
      const attempt: SshProbeAttempt = { port, status: "fail", detail: redactSshDetail(error) };
      attempts.push(attempt);
      if (isSshTransportOrAuthFailure(error)) {
        sshTransportFailureMemo.set(cacheKey, attempt);
      }
    }
  }

  return {
    ok: false,
    stdout: "",
    attempts,
    detail: attempts.map((attempt) => `port ${attempt.port}: ${attempt.detail}`).join("; "),
  };
}

function sshTransportFailureMemoKey(
  source: Pick<WordpressSshSource, "sshHost" | "sshUser" | "sshKeyPath">,
  port: number,
): string {
  return [source.sshHost, source.sshUser, source.sshKeyPath, String(port)].join("\0");
}

function isSshTransportOrAuthFailure(value: unknown): boolean {
  const detail = redactSshDetail(value).toLowerCase();
  return [
    "timed out",
    "connection refused",
    "no route to host",
    "permission denied",
    "could not resolve hostname",
    "connection closed",
    "operation timed out",
    "host key verification failed",
    "network is unreachable",
  ].some((needle) => detail.includes(needle));
}

function execSsh(
  file: string,
  args: string[],
  options: { timeout: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(file, args, options, (error, stdout, stderr) => {
      if (error) {
        (error as ExecSshError).stdout = stdout;
        (error as ExecSshError).stderr = stderr;
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}
