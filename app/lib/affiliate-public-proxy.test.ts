import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { affiliatePublicPost, affiliatePublicAsset, affiliatePublicOptions } from "./affiliate-public-proxy";

const api = "https://affiliate.example";
const link = { id: "5c7f400a-5d4b-4eea-863a-eedbdcfb982f", tracking_mode: "direct", click_path: null, affiliate_url: "https://merchant.example/product" };
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

const categoryInput = { delivery_mode: "category_card", path: "/blog/category-article", title: "Category article", categories: "캠핑 장비" };
const categoryOutput = () => ({ site_key: "campgogo", delivery_mode: "category_card", category: "캠핑 장비", category_enabled: true, category_revision: 1, links: [{ ...link }] });
it("passes category mode without paragraphs and preserves approved direct product", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(categoryOutput())); vi.stubGlobal("fetch", fetch);
  expect((await post(categoryInput)).status).toBe(200);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(categoryInput);
});
it("rejects invalid category contracts before upstream", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  for (const patch of [{categories: 3}, {categories: "x".repeat(101)}, {paragraphs: []}, {path: "/blog/../x"}])
    expect((await post({...categoryInput,...patch})).status).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
it("rejects category response that changes mode, revision, approval or destination contract", async () => {
  for (const patch of [{category:"other"}, {site_key:"other"}, {delivery_mode:"auto_inline"}, {category_revision:0}, {category_revision:1.5}, {category_enabled:false}, {links:[link,link]}, {links:[{...link,tracking_mode:"redirect"}]}, {links:[{...link,click_path:"/go"}]}, {links:[{...link,affiliate_url:"http://merchant.example/product"}]}, {links:[{...link,affiliate_url:"https://user:pass@merchant.example/product"}]}]) {
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({...categoryOutput(),...patch})));
    expect((await post(categoryInput)).status).toBe(502);
  }
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({...categoryOutput(),category_revision:0,links:[]})));
  expect((await post(categoryInput)).status).toBe(502);
});
it("uses exact registered origins and forwards generic category only", async () => {
  const other = { ...categoryInput, path: "/guides/pickleball", categories: "피클볼" };
  const approved = { ...categoryOutput(), site_key: "picklefriend", category: "피클볼", links: [{ ...link, id: "another-approved-link" }] };
  const fetch = vi.fn().mockResolvedValue(Response.json(approved)); vi.stubGlobal("fetch", fetch);
  const request = (origin: string, site = "picklefriend", body: unknown = other) => new Request(`https://dashboard.example/api/recommend?site_key=${site}`, { method: "POST", headers: { origin, "content-type": "text/plain" }, body: JSON.stringify(body) });
  const response = await affiliatePublicPost(request("https://picklefriend.kr"), "recommend");
  expect(response.status).toBe(200);
  expect(response.headers.get("access-control-allow-origin")).toBe("https://picklefriend.kr");
  expect(fetch.mock.calls[0][0]).toBe(api + "/api/recommend?site_key=picklefriend");
  expect(fetch.mock.calls[0][1].headers.get("origin")).toBe("https://picklefriend.kr");
  expect((await affiliatePublicPost(request("https://fake.picklefriend.kr"), "recommend")).status).toBe(403);
  expect((await affiliatePublicPost(request("https://picklefriend.kr:444"), "recommend")).status).toBe(403);
  expect((await affiliatePublicPost(request("https://picklefriend.kr", "campgogo"), "recommend")).status).toBe(400);
  expect((await affiliatePublicPost(request("https://picklefriend.kr", "picklefriend", input), "recommend")).status).toBe(400);
  for (const path of ["/admin/panel", "/wp-admin/post.php", "/cart", "/checkout", "/account", "/api/recommend", "/guides/%2e%2e/admin", "/guides//post"])
    expect((await affiliatePublicPost(request("https://picklefriend.kr", "picklefriend", { ...other, path }), "recommend")).status).toBe(400);
  expect((await affiliatePublicPost(new Request("https://dashboard.example/api/event?site_key=picklefriend", { method: "POST", headers: { origin: "https://picklefriend.kr" }, body: "{}" }), "event")).status).toBe(403);
  expect(affiliatePublicOptions(new Request("https://dashboard.example/api/event?site_key=picklefriend", { method: "OPTIONS", headers: { origin: "https://picklefriend.kr" } }), "event").status).toBe(403);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("does not authorize explicit no-ad fleet exclusions", async () => {
  const held = ["caregos.com", "fastjob.kr", "jeompolab.com", "lim01.soonsaak.co.kr", "limsight.kr", "mohana.kr", "picturebooks.kr", "sorimate.com", "yesa.kr"];
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  for (const hostname of held) {
    const request = new Request(`https://dashboard.example/api/recommend?site_key=anything`, {
      method: "POST", headers: { origin: `https://${hostname}`, "content-type": "text/plain" }, body: JSON.stringify(categoryInput),
    });
    expect((await affiliatePublicPost(request, "recommend")).status).toBe(403);
  }
  expect(fetch).not.toHaveBeenCalled();
});
it("passes disabled or unconfigured category without manufacturing fallback", async () => {
  for (const category_revision of [0,1,2]) {
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({...categoryOutput(),category_revision,category_enabled:false,links:[]})));
    const response=await post(categoryInput); expect(response.status).toBe(200); expect((await response.json()).links).toEqual([]);
  }
});

it("serves the new category asset through the existing authenticated upstream", async () => {
  const fetch=vi.fn().mockImplementation(()=>Promise.resolve(new Response("/*category*/",{headers:{"content-type":"application/javascript"}}))); vi.stubGlobal("fetch",fetch);
  const response=await affiliatePublicAsset(new Request("https://dashboard.example/category-widget.js"),"/category-widget.js");
  expect(response.status).toBe(200); expect(await response.text()).toBe("/*category*/");
  expect(fetch.mock.calls[0][0]).toBe(api+"/category-widget.js");
  expect((await affiliatePublicAsset(new Request("https://dashboard.example/category-widget.js?other=1"),"/category-widget.js")).status).toBe(404);
});
