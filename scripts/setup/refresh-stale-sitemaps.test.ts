import { afterEach, expect, test, vi } from 'vitest';
import { inspectPublicSitemap, main } from './refresh-stale-sitemaps';
const mocks = vi.hoisted(() => ({ readFile: vi.fn(), submit: vi.fn() }));
vi.mock('node:fs/promises', () => ({ readFile: mocks.readFile }));
vi.mock('node:fs', () => ({ existsSync: () => false, readFileSync: vi.fn() }));
vi.mock('googleapis', () => ({ google: {
 auth: { GoogleAuth: class {} },
 searchconsole: () => ({ sitemaps: { submit: mocks.submit } }),
} }));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
test.each([
 ['404',404,'<urlset><url><loc>https://example.com/a</loc></url></urlset>',false],
 ['empty urlset',200,'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',false],
 ['empty index',200,'<sitemapindex></sitemapindex>',false],
 ['HTML pretending to be XML',200,'<html><body><urlset><url><loc>https://example.com/a</loc></url></urlset></body></html>',false],
 ['relative URL',200,'<urlset><url><loc>/private</loc></url></urlset>',false],
 ['unbalanced XML',200,'<urlset><url><loc>https://example.com/a</loc></url><broken></urlset>',false],
 ['valid URL set',200,'<urlset><url><loc>https://example.com/a</loc></url></urlset>',true],
 ['valid index',200,'<sitemapindex><sitemap><loc>https://example.com/part.xml</loc></sitemap></sitemapindex>',true],
 ['valid RSS',200,'<rss><channel><item><link>https://example.com/a</link></item></channel></rss>',true],
 ['valid Atom',200,'<feed><entry><link href="https://example.com/a"/></entry></feed>',true],
] as const)('%s submission eligibility',async (_name,status,body,eligible)=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(body,{status})));
 expect((await inspectPublicSitemap('https://example.com/sitemap.xml')).startsWith('public ok')).toBe(eligible);
});
test.each([
 [404,'not found',0],
 [200,'<urlset></urlset>',0],
 [200,'<html><urlset></urlset></html>',0],
 [200,'<urlset><url><loc>https://example.com/a</loc></url></urlset>',1],
] as const)('main never submits unsafe public response %s/%s',async (status,body,count)=>{
 vi.stubEnv('GCP_SA_KEY_JSON','{}');
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(body,{status})));
 mocks.readFile.mockResolvedValue(JSON.stringify({generatedAt:'2026-11-14T00:00:00Z',stats:[{
  id:'example',name:'Example',url:'https://example.com/',gscSiteUrl:'https://example.com/',
  sitemapDetails:[{path:'https://example.com/sitemap.xml',lastDownloaded:'2026-01-01T00:00:00Z'}],
 }]}));
 await main();
 expect(mocks.submit).toHaveBeenCalledTimes(count);
 if(count)expect(mocks.submit).toHaveBeenCalledWith({siteUrl:'https://example.com/',feedpath:'https://example.com/sitemap.xml'});
});
test('network failure is ineligible instead of aborting the fleet',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('timeout')));
 expect(await inspectPublicSitemap('https://example.com/sitemap.xml')).toBe('public fetch-failed: timeout');
});
test('main reports incomplete refresh after a network failure',async()=>{
 vi.stubEnv('GCP_SA_KEY_JSON','{}');
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('timeout')));
 mocks.readFile.mockResolvedValue(JSON.stringify({generatedAt:'2026-11-14T00:00:00Z',stats:[{
  id:'example',name:'Example',url:'https://example.com/',
  sitemapDetails:[{path:'https://example.com/sitemap.xml',lastDownloaded:'2026-01-01T00:00:00Z'}],
 }]}));
 await expect(main()).rejects.toThrow('Sitemap refresh incomplete: 1 target(s)');
 expect(mocks.submit).not.toHaveBeenCalled();
});
