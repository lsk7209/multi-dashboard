import https from "node:https";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { upstreamRequest } from "./affiliate-upstream";

const cert = readFileSync(fileURLToPath(new URL("./fixtures/affiliate-test-cert.pem", import.meta.url)), "utf8");
const key = readFileSync(fileURLToPath(new URL("./fixtures/affiliate-test-key.pem", import.meta.url)), "utf8");
let server: https.Server;
let origin: string;

beforeAll(async () => {
  server = https.createServer({ cert, key }, (_request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.end('{"ok":true}');
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("Test server has no port");
  origin = `https://127.0.0.1:${address.port}`;
});
afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

describe("private CA transport", () => {
  it("trusts only the configured certificate while retaining TLS verification", async () => {
    const init = { method: "GET" as const, headers: new Headers(), maxResponse: 1_000_000 };
    const accepted = await upstreamRequest(origin, init, cert);
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toEqual({ ok: true });
    const streamed = await upstreamRequest(origin, { ...init, stream: true }, cert);
    expect(await streamed.json()).toEqual({ ok: true });
    await expect(upstreamRequest(origin, init)).rejects.toThrow();
    await expect(upstreamRequest(origin, init, "not a CA certificate")).rejects.toThrow();
  });
});
