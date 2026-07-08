# 2mlab.kr Indexing And Cloudflare Follow-Up - 2026-07-08

## Evidence

- Dashboard snapshot: `data/site-stats.json`, `generatedAt=2026-07-08T01:11:20.285Z`
- Source policy: direct dashboard/public/local evidence only; no `gmail-digest`
- Prior audit source: `docs/insight-indexing-audit-2026-07-08.md`
- Site: `https://2mlab.kr/`
- Local path inspected: `D:\web\2mlabkr`
- Stack signal: WordPress/PHP on LiteSpeed

## Dashboard Context

- `2mlab.kr` was a T2 monitored site in the 2026-07-08 insight/indexing audit.
- GA4 active users were down `-79.6%` and views were down `-64.6%`.
- GSC 30-day evidence showed only `3` impressions, all on the home URL.
- URL Inspection status in the prior audit:
  - Home: `Submitted and indexed`
  - `/services/`: `URL is unknown to Google`
  - `/blog/`: `URL is unknown to Google`
  - sampled post URLs: `URL is unknown to Google`
- The sitemap index was resubmitted on 2026-07-08 after showing submitted URLs but no indexed sitemap count yet.

## Public Indexing Surface

- Home: HTTP 200
- `robots.txt`: HTTP 200 and references `https://2mlab.kr/sitemap_index.xml`
- `sitemap_index.xml`: HTTP 200, Rank Math sitemap index
- `post-sitemap1.xml`: HTTP 200 and includes `/blog/` plus post URLs with recent `lastmod` values
- `/services/`: HTTP 200
- `/blog/`: HTTP 200
- Sample post from `post-sitemap1.xml`: HTTP 200
- Public headers show `Server: LiteSpeed`, `X-Powered-By: PHP/8.4.22`, and `X-LiteSpeed-Cache: hit`.
- No public `cf-ray` or Cloudflare response-header signal was observed.

## Metadata Checks

| URL | Robots | Canonical | Title |
| --- | --- | --- | --- |
| `https://2mlab.kr/` | `index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large` | `https://2mlab.kr/` | `팀빌딩·워크샵 아이디어 전문 미디어 \| 팀하우스` |
| `https://2mlab.kr/services/` | `index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large` | `https://2mlab.kr/services/` | `워크샵 기획 가이드 \| 팀하우스` |
| `https://2mlab.kr/blog/` | `index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large` | `https://2mlab.kr/blog/` | `팀빌딩·워크샵 글 모음 \| 팀하우스` |
| Sample post | `index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large` | self-canonical | `MBTI I형(내향형)도 즐거운 워크샵, 억지 텐션 강요 없는 차분한 독` |

## Cloudflare Residue Cleanup

- Public header checks: no Cloudflare signal; the site responds as LiteSpeed/WordPress.
- Local helper directory search found no matches for:
  - `Cloudflare`
  - `cloudflare`
  - `wrangler`
  - `pages.dev`
  - `@cloudflare`
  - `CLOUDFLARE`
  - `D1`
  - `cf[a-f0-9]{32}`
- Result: no local or public Cloudflare residue was found for `2mlab.kr` in this pass.

## Assessment

- No immediate public crawl blocker was found: robots, canonical, sitemap, and sampled page metadata are indexable.
- The GSC issue looks like discovery/indexing lag or quality/selection rather than an active technical noindex/canonical block.
- Because `D:\web\2mlabkr` is not a deployable git repo and no safe T1 code/config patch was identified, no production or file mutation was applied.

## Next

- Monitor GSC after the 2026-07-08 sitemap resubmission.
- If the same URLs remain `unknown` after recrawl, request indexing for `/services/`, `/blog/`, and one recent sitemap post from GSC, then compare results.
- Continue the insight/indexing queue with `dogswhere`, `temon`, `softwa`, and `today2424`.
