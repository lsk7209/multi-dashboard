# tasko / dullegilgogo Batch A Follow-Up - 2026-07-08

## Evidence Policy

- Source policy: direct dashboard refresh, public HTTP checks, local repo/path inspection, and GitHub Actions evidence only; no `gmail-digest`.
- Dashboard refresh command: `pnpm.cmd stats:update`
- Dashboard snapshot: `data/site-stats.json`
- Snapshot timestamp: `2026-07-08T04:15:13.350Z`
- Connector result: 98 sites checked; GA4 failed 0, GSC failed 0, AdSense code not detected 0, ads.txt failed 0.
- Cloudflare policy: the user does not use Cloudflare. `cf*.txt`, Wrangler, Workers, Pages, D1, `cdn-cgi`, and Cloudflare deployment checks are cleanup scope unless they are only dependency metadata, content references, or hash data.

## tasko.kr

### Dashboard Signals

- Site id: `tasko-2`
- URL: `https://tasko.kr/`
- GSC property: `https://tasko.kr/`
- GA4 last 7 days: 25 active users, 29 sessions, 35 page views.
- GA4 previous 7 days: 51 active users, 55 sessions, 71 page views.
- GSC last 7 days: 0 clicks, 0 impressions.
- GSC last 30 days: 0 clicks, 0 impressions.
- AdSense: installed and collector ok.
- ads.txt: valid, `https://tasko.kr/ads.txt` returned 200 with expected publisher signal.
- GSC sitemap: `https://tasko.kr/sitemap_index.xml`, downloaded `2026-07-03T03:12:56.578Z`, submitted `2026-07-03T02:40:02.763Z`, warnings 0, errors 0.
- Last published at: `2026-07-07T23:21:13Z`.

### Public Technical Checks

- Homepage: 200, LiteSpeed/PHP, no `cf-ray` or Cloudflare serving headers.
- robots.txt: 200, `User-agent: * Allow: /`, sitemap references present.
- sitemap index: 200, Rank Math XML sitemap index, latest child lastmod `2026-07-07T23:21:13+00:00`.
- RSS/feed: 200, `application/rss+xml`, last modified `2026-07-07T23:21:13 GMT`.
- ads.txt: 200.
- Homepage HTML:
  - `meta name="robots" content="index, follow"`
  - canonical `https://tasko.kr/`
  - OG URL `https://tasko.kr/`
  - Rank Math schema present.
  - AdSense loader present for `ca-pub-3050601904412736`.
- Sitemap sample post: extracted from `post-sitemap1.xml`, returned 200.

### Local / Cloudflare Residue

- Local path checked: `D:\web\taskokr`
- This path is an operations/artifact folder, not a full WordPress git checkout.
- `cf*.txt` search: no matches.
- Cloudflare/Wrangler/Workers/Pages/D1/cdn-cgi search: no matches.
- GitHub Actions repo check for `lsk7209/taskokr`: repo/actions endpoint not found; no active Actions repair item was identified.

### Assessment

- `T1`: no direct Cloudflare cleanup required.
- `T2`: no public crawl blocker found from homepage, robots, sitemap, feed, ads.txt, or sample sitemap URL.
- `T3`: GSC is still 0 impressions over 30 days despite fresh publishing and valid sitemap. This is not a direct technical blocker from the public checks. Next decision should be GSC URL inspection/page-query analysis and content/title strategy, not blind infra changes.

## dullegilgogo.kr

### Dashboard Signals

- Site id: `dullegilgogo`
- URL: `https://dullegilgogo.kr/`
- GSC property: `https://dullegilgogo.kr/`
- GA4 last 7 days: 78 active users, 83 sessions, 184 page views.
- GA4 previous 7 days: 162 active users, 173 sessions, 211 page views.
- GSC last 7 days: 0 clicks, 0 impressions.
- GSC last 30 days: 1 click, 45 impressions, CTR 2.22%, average position 9.16.
- AdSense: installed and collector ok.
- ads.txt: valid, `https://dullegilgogo.kr/ads.txt` returned 200 with expected publisher signal.
- GSC sitemap: `https://dullegilgogo.kr/sitemap.xml`, downloaded `2026-07-07T20:00:27.785Z`, submitted `2026-07-07T20:00:25.972Z`, warnings 0, errors 0, submitted 738.

### Public Technical Checks

- Homepage: 200, Vercel/Next.js, no `cf-ray` or Cloudflare serving headers.
- robots.txt: 200, `User-Agent: * Allow: /`, `Disallow: /api/`, sitemap reference present.
- sitemap.xml: 200, `application/xml`, Vercel cache hit.
- feed.xml: 200, `application/rss+xml`, Vercel prerender.
- ads.txt: 200.
- Homepage HTML:
  - canonical `https://dullegilgogo.kr`
  - Google and Naver verification meta present.
  - OG metadata present.
  - AdSense loader present for `ca-pub-3050601904412736`.
  - Public homepage currently shows 163 blog posts and 93 mountain pages.
- Sitemap sample blog URL returned 200.
- Sitemap freshness:
  - homepage/hub/mountain URLs use build-time lastmod `2026-07-08T04:14:55.147Z`.
  - blog URLs include dated lastmods through `2026-07-08`.

### Local / Pipeline Checks

- Local path checked: `D:\web\dullegilgogo`
- Git remote: `https://github.com/lsk7209/dulekil.git`
- Local branch: `master...origin/master`
- Pre-existing user/local changes were present and not reverted:
  - `app/data-license/page.tsx`
  - `app/guide/page.tsx`
  - `app/tracker/tracker-client.tsx`
  - `components/site-footer.tsx`
  - `lib/posts.ts`
  - `tsconfig.tsbuildinfo`
  - untracked `lib/posts-generated-phase6j.ts`
  - untracked `pnpm-lock.yaml`
- `audit:seo` could not run because local `node_modules/.bin/tsx` is missing.
- Static schedule parsing from `lib/posts.ts`:
  - post id markers: 415
  - publishAt markers: 393
  - visible by snapshot time: 165
  - future scheduled after snapshot: 228
  - latest visible publishAt: `2026-07-08T04:00:00+00:00`
  - next publishAt: `2026-07-08T09:00:00+00:00`
  - last publishAt: `2026-08-24T16:00:00+00:00`
- Vercel cron config:
  - `/api/cron/publish` daily at `0 21 * * *`
  - `/api/cron/collect` weekly at `0 18 * * 0`
  - `/api/cron/blog-notify` at `0 0,5,10,15,20 * * *`
- GitHub Actions on `lsk7209/dulekil`:
  - latest `Quality Gate + Drip Feed`: success, `2026-07-07T22:04:50Z`
  - previous daily quality gate runs: success.
  - latest visible `Bulk Collect`: success, `2026-07-05T06:12:44Z`.

### Cloudflare Cleanup

- Found real Cloudflare verification token residue:
  - `D:\web\dullegilgogo\public\cf1bbae352df4a22a23cbf48bb08350d.txt`
- Deleted that token file from the local working tree.
- Rechecked `cf*.txt`: no remaining matches.
- Remaining Cloudflare search matches:
  - `package-lock.json` and `pnpm-lock.yaml` optional peer metadata for `@cloudflare/workers-types`.
  - `tsconfig.tsbuildinfo` references derived from dependency metadata/build info.
  - These are not direct Cloudflare service configuration.

### Assessment

- `T1`: Cloudflare token residue removed locally.
- `T2`: public indexability surface is healthy: homepage, robots, sitemap, feed, ads.txt, sample blog URL all returned 200; no Cloudflare serving path found.
- `T2`: data freshness is not currently the primary blocker. The schedule queue is not exhausted, sitemap/build freshness is current, and Actions are succeeding.
- `T3`: the drop appears to be a discovery/keyword demand/content performance issue: GSC 30-day visibility is only 45 impressions despite 738 submitted sitemap URLs and active publishing. Next step should be GSC page/query sampling and content/title handoff, not infra mutation.

## Next Queue

- For `tasko.kr`: inspect GSC URL/page evidence for why sitemap URLs have 0 impressions, then route title/content improvements through the title/content workflow.
- For `dullegilgogo.kr`: inspect GSC top pages/queries and low-impression pages; keep the scheduled publishing pipeline as-is unless a future cron/action failure appears.
- Continue applying the no-Cloudflare rule on every site/repo review.
