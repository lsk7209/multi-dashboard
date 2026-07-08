# estat.kr Title Content And Cloudflare Follow-Up - 2026-07-08

Dashboard evidence snapshot: `2026-07-08T04:15:13.350Z`

## Site State

- Site id: `estat-2`
- Host: `estat.kr`
- Public brand/title: `푸드팡팡`
- Local path inspected: `D:\web\estatkr`
- Local path type: WordPress/site artifact folder, not a git checkout.
- Fresh dashboard status:
  - GA4 last 7 days: 21 users / 22 sessions / 23 views
  - GA4 previous 7 days: 8 users / 8 sessions / 9 views
  - GA4 last 30 days: 48 users / 49 sessions / 56 views
  - GSC last 30 days: 16 clicks / 2,454 impressions / 0.65% CTR / average position 7.96
  - GSC last 7 days: 5 clicks / 533 impressions / 0.94% CTR / average position 7.76
  - Sitemap: `https://estat.kr/sitemap.xml`, 677 submitted, 0 warnings/errors, last downloaded `2026-07-07T18:20:07.097Z`
  - Last published: `2026-07-07T21:29:03Z`
  - AdSense and `ads.txt`: dashboard checks pass

## Public Crawl Checks

- `https://estat.kr/` responds with 200 from LiteSpeed/PHP WordPress.
- No public `cf-ray` or Cloudflare serving-header signal was observed.
- `robots.txt` allows normal crawling, blocks only selected scraping bots, and references `https://estat.kr/sitemap.xml`.
- Sitemap index is valid and points to:
  - `https://estat.kr/sitemap-posts.xml`
  - `https://estat.kr/sitemap-pages.xml`
  - `https://estat.kr/sitemap-categories.xml`
- `ads.txt` responds 200 from LiteSpeed.
- Homepage metadata:
  - Title: `푸드팡팡 - 카페 음료부터 든든한 한 끼까지, 집에서 따라 하는 레시피 모음`
  - Description: `푸드팡팡 — 집에서 쉽게 따라 하는 한식·홈카페 레시피 664개+`
  - Canonical: `https://estat.kr/`

## Cloudflare Residue Check

- No `cf*.txt` token file was found under `D:\web\estatkr`.
- Local search found no actionable Cloudflare, Wrangler, Pages, Workers, D1, `cdn-cgi`, or Cloudflare token residue.
- Public headers show LiteSpeed, not Cloudflare.
- Decision: no Cloudflare cleanup is needed for this pass.

## Repo And Pipeline Notes

- `D:\web\estatkr` is not a git repository.
- `gh run list --repo lsk7209/estatkr` returned GitHub 404, so no active GitHub Actions repo was confirmed for this exact name.
- Treat this site as WordPress/public-evidence driven unless a current repo or SSH apply path is explicitly provided.

## Title And Content Handoff Evidence

Top GSC opportunity from the fresh dashboard snapshot:

| Query | Clicks | Impressions | CTR | Avg Position | Target evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| `라조기` | 0 | 43 | 0.00% | 5.72 | WP REST search result `post 3998` |
| `라조기 레시피` | 0 | 11 | 0.00% | 3.27 | Same target |

Primary target:

- URL: `https://estat.kr/lazoji-spicy-fried-chicken-vegetable-stir-fry-chinese-recipe/`
- WP post id: `3998`
- Published: `2026-06-25T12:00:00`
- Modified: `2026-06-25T12:00:00`
- Current title/H1: `라조기 만들기 — 매콤한 닭튀김과 채소 볶은 중식 레시피`
- Current SEO title: `라조기 만들기 — 매콤한 닭튀김과 채소 볶은 중식 레시피 - 푸드팡팡`
- Current description starts with a narrative intro rather than a direct recipe promise.
- Canonical: `https://estat.kr/lazoji-spicy-fried-chicken-vegetable-stir-fry-chinese-recipe/`
- Structured data: JSON-LD present; Recipe string detected; 5 JSON-LD blocks found.
- REST content signal: `featured_media` is `0`, so the article appears to have no WordPress featured image assigned.

## Recommended Title Work

The page ranks near the top for `라조기` and `라조기 레시피`, but receives no clicks in the sampled 30-day top-query evidence. This is a T3 title/snippet opportunity, not an indexing problem.

Candidate titles:

1. `라조기 레시피 | 바삭한 닭튀김과 매콤한 소스 비율`
2. `라조기 만들기 | 닭다리살 튀김부터 매콤 소스까지`
3. `라조기 레시피, 집에서 바삭하게 만드는 순서`
4. `라조기 만드는 법 | 전분옷·두 번 튀김·소스 비율`
5. `라조기 만들기 핵심 | 닭튀김 바삭함과 매운 소스`

Recommended final title:

- `라조기 레시피 | 바삭한 닭튀김과 매콤한 소스 비율`

Why:

- Puts the exact higher-value query `라조기 레시피` at the front.
- Gives the click reason in concrete terms: `바삭한 닭튀김`, `매콤한 소스 비율`.
- Avoids hype and keeps the promise supportable by the current article, which already explains starch coating, double frying, oil temperature, and sauce ratio.

Recommended meta description direction:

- Replace the narrative-first description with a more direct recipe summary.
- Suggested direction: `닭다리살 전분옷, 두 번 튀김, 간장·식초·설탕 소스 비율까지 집에서 라조기를 바삭하게 만드는 순서를 정리했습니다.`
- This is editorial/T3 and should be applied only through the title/content workflow.

## Recommended Content Work

T3 content handoff only:

- Add or assign a relevant featured image for the 라조기 article. `featured_media=0` weakens visual/rich result appeal even though Recipe JSON-LD is present.
- Add a concise ingredients/time/yield summary near the top if not already represented in the visible template.
- Preserve the strong technical cooking content. The article already includes:
  - definition block,
  - ingredient list,
  - double-frying method,
  - food-safety temperature,
  - FAQ-style troubleshooting,
  - internal links to related recipes.
- Avoid a broad rewrite. The issue is snippet/title/media packaging, not thin content.

## Technical Follow-Up

- The current title and H1 are identical before the site suffix. That is acceptable, but a CTR pass can make the SEO title more query-led while keeping H1 natural.
- Homepage and article snippets expose `meta name="robots" content="index, follow"` as expected.
- No sitemap, robots, ads.txt, or public indexability blocker was found in this pass.

## Decision

- Classification: T3 title + content handoff.
- Applied now: no source/content edits and no production changes.
- Cloudflare action: no cleanup needed.
- Next implementation should use a WordPress-safe title/meta/media workflow with backup or authenticated editorial tooling. Do not edit article body/title directly from the dashboard report.
