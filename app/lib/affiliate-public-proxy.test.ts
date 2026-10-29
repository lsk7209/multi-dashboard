import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { affiliatePublicPost } from "./affiliate-public-proxy";

const api = "https://affiliate.example";
const link = { id: "5c7f400a-5d4b-4eea-863a-eedbdcfb982f", tracking_mode: "direct", click_path: null };
const input = { delivery_mode: "auto_inline", path: "/blog/new-coffee", title: "커피 준비", paragraphs: [{ id: "p0", text: "캠핑 커피 드리퍼의 구성과 사용 방법을 확인해 보세요." }] };
const output = () => ({ site_key: "campgogo", delivery_mode: "auto_inline", auto_revision: "camp-auto-r1", placement: { paragraph_id: "p0" }, links: [{ ...link }] });
const post = (body: unknown, headers = {}) => affiliatePublicPost(new Request("https://dashboard.example/api/recommend?site_key=campgogo", { method: "POST", headers: { origin: "https://campgogo.kr", "content-type": "text/plain", ...headers }, body: JSON.stringify(body) }), "recommend");
beforeEach(() => {
  process.env.AFFILIATE_API_ORIGIN = api;
  process.env.AFFILIATE_DASHBOARD_ORIGIN = "https://dashboard.example";
  process.env.AFFILIATE_GATEWAY_AUTH = "Basic dGVzdDp0ZXN0";
});
afterEach(() => { vi.unstubAllGlobals(); for (const key of ["AFFILIATE_API_ORIGIN", "AFFILIATE_DASHBOARD_ORIGIN", "AFFILIATE_GATEWAY_AUTH"]) delete process.env[key]; });

it("passes explicit automatic new paths and exact old paths without rewriting metadata", async () => {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json(output()))); vi.stubGlobal("fetch", fetch);
  for (const path of [input.path, "/blog/camping-coffee-complete"]) {
    expect((await post({ ...input, path })).status).toBe(200);
    expect(JSON.parse(fetch.mock.calls.at(-1)![1].body)).toEqual({ ...input, path });
  }
});
it("rejects unknown modes, traversal, non-article paths and invalid paragraph contracts before network", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  for (const patch of [{ delivery_mode: "other" }, { path: "/privacy" }, { path: "/blog/" }, { path: "/blog/%2e/x" }, { path: "/blog/x?q=y" }, { paragraphs: [{ id: "p160", text: "x" }] }, { paragraphs: [input.paragraphs[0], input.paragraphs[0]] }, { extra: true }, { paragraphs: Array(21).fill(input.paragraphs[0]) }]) expect((await post({ ...input, ...patch })).status).toBe(400);
  expect((await post({ path: input.path, title: input.title })).status).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
it("preserves the legacy revision and single path contract", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ site_key: "campgogo", pilot_revision: "camp-coffee-r1", links: [link] })));
  expect((await post({ path: "/blog/camping-coffee-complete", title: input.title })).status).toBe(200);
});
it("rejects stale revisions, unrelated products, redirects and paragraph substitutions", async () => {
  for (const patch of [{ auto_revision: "old" }, { delivery_mode: "other" }, { links: [{ ...link, id: "another" }] }, { links: [{ ...link, click_path: "/go" }] }, { links: [{ ...link, tracking_mode: "redirect" }] }, { placement: { paragraph_id: "p1" } }]) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...output(), ...patch })));
    expect((await post(input)).status).toBe(502);
  }
});
it("passes approved empty results without adding links", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...output(), links: [] })));
  expect((await (await post(input)).json()).links).toEqual([]);
});
it("bounds Korean automatic requests by bytes and rejects other origins", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ ...output(), links: [] })); vi.stubGlobal("fetch", fetch);
  expect((await post({ ...input, paragraphs: Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, text: "가".repeat(240) })) })).status).toBe(200);
  expect((await post(input, { "content-length": "32769" })).status).toBe(413);
  expect((await post(input, { origin: "https://elsewhere.example" })).status).toBe(403);
  expect(fetch).toHaveBeenCalledTimes(1);
});
