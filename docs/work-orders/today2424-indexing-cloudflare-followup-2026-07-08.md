# today2424.kr Indexing And Cloudflare Follow-Up - 2026-07-08

## Evidence

- Dashboard snapshot: `data/site-stats.json`, `generatedAt=2026-07-08T01:11:20.285Z`
- Source policy: direct dashboard/public/local/repo evidence only; no `gmail-digest`
- Prior audit source: `docs/insight-indexing-audit-2026-07-08.md`
- Related work order: `docs/work-orders/today2424-lease-notice-meta-refresh-2026-07-08.md`
- Site: `https://today2424.kr/`
- Local paths inspected:
  - `D:\web\today2424`
  - `D:\web\today2424\2424`
- Stack signal: Next.js on Vercel

## Dashboard Context

- `today2424.kr` was a T2 monitored site in the 2026-07-08 insight/indexing audit.
- GA4 users were down about `-41.2%`.
- GSC clicks were down about `-40%` and impressions were down about `-27.3%`.
- Direct GSC rows were concentrated on lease/move-out notice templates and small-space living posts, led by `/blog/lease-end-notice-template`.
- The selected action was snippet/title refresh for the best page-one opportunity, not an emergency index patch.

## Public Indexing Surface

- Home: HTTP 200
- `robots.txt`: HTTP 200
- `sitemap.xml`: HTTP 200
- Sample page `https://today2424.kr/blog/lease-end-notice-template`: HTTP 200
- Public headers show `Server: Vercel`, `X-Matched-Path`, and Vercel cache headers.
- No public `cf-ray` or Cloudflare response-header signal was observed.

## Cloudflare Residue Cleanup

- Previous cleanup in the lease-notice work order removed the remaining `wrangler pages deploy` detector from `scripts/audit-hosting-costs.mjs` in the `lsk7209/2424` repo.
- Follow-up local token search found no `cf*.txt` verification token files under `D:\web\today2424`.
- Follow-up local repo search under `D:\web\today2424\2424` found no matches for `Cloudflare`, `cloudflare`, `wrangler`, `pages.dev`, `@cloudflare`, `CLOUDFLARE`, `D1`, `cdn-cgi`, or `cf[a-f0-9]{32}` outside ignored dependency/build directories.

## Local Git State Note

- `D:\web\today2424` root is not a git repository.
- `D:\web\today2424\2424` was already dirty before this follow-up:
  - `app/blog/[slug]/page.tsx`
  - `app/feed/route.ts`
  - `app/guide/[slug]/page.tsx`
  - `components/analytics/GoogleAnalyticsTracker.tsx`
  - `package-lock.json`
- Those existing local changes were not modified during this pass.

## Assessment

- No immediate public crawl blocker was found.
- No remaining Cloudflare infrastructure residue was found in the inspected local paths or current repo search.
- No deployable code patch is recommended from this pass.
- Current recovery work should remain query/page CTR monitoring after the lease-notice meta refresh.

## Next

- Recheck GSC CTR after the next data window for `/blog/lease-end-notice-template`.
- If the existing dirty local changes are intended work, review them separately before any new today2424 patch.
