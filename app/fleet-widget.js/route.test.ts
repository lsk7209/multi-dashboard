import { expect, it } from "vitest";
import { runInNewContext } from "node:vm";
import { GET } from "./route";

async function execute(hostname: string, pathname = "/blog/article", existingLoader?: string) {
  const appended: { src?: string; dataset: Record<string, string> }[] = [];
  const document = {
    currentScript: { src: "https://dashboard.example/fleet-widget.js" },
    head: { append: (script: { src?: string; dataset: Record<string, string> }) => appended.push(script) },
    scripts: existingLoader ? [{ src: `https://dashboard.example/${existingLoader}` }] : [],
    querySelector: () => null,
    createElement: () => ({ dataset: {} }),
    addEventListener: () => undefined,
  };
  const location = { protocol: "https:", port: "", hostname, pathname };
  runInNewContext(await (await GET(new Request("https://dashboard.example/fleet-widget.js"))).text(), { document, location, URL, Object });
  return appended;
}

it("serves a public, uncached JavaScript bootstrap with exact site mapping", async () => {
  const response = await GET(new Request("https://dashboard.example/fleet-widget.js"));
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toMatch(/^application\/javascript/);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  const source = await response.text();
  expect(source).toContain('"picklefriend.kr":"picklefriend"');
  expect(source).toContain("Object.hasOwn(sites, host)");
  expect(source).toContain("script.dataset.siteKey = site");
  expect(source).toContain("script.dataset.affiliateFleetWidget = ''");
  expect((await GET(new Request("https://dashboard.example/fleet-widget.js?x=1"))).status).toBe(404);
});

it("installs once on registered public hosts and excludes other hosts, private routes, and existing loaders", async () => {
  const [script] = await execute("picklefriend.kr");
  expect(script?.src).toBe("https://dashboard.example/category-widget.js");
  expect(script?.dataset.siteKey).toBe("picklefriend");
  expect(await execute("unlisted.example")).toHaveLength(0);
  expect(await execute("fake.picklefriend.kr")).toHaveLength(0);
  expect(await execute("picklefriend.kr", "/wp-admin/post.php")).toHaveLength(0);
  expect(await execute("picklefriend.kr", "/checkout")).toHaveLength(0);
  expect(await execute("picklefriend.kr", "/blog/article", "category-widget.js")).toHaveLength(0);
  expect(await execute("campgogo.kr", "/blog/article", "widget.js")).toHaveLength(0);
  for (const hostname of ["caregos.com", "fastjob.kr", "jeompolab.com", "lim01.soonsaak.co.kr", "limsight.kr", "mohana.kr", "picturebooks.kr", "sorimate.com", "yesa.kr"])
    expect(await execute(hostname)).toHaveLength(0);
});
