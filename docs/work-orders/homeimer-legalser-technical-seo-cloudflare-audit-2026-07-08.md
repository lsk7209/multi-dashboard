# homeimer / legalser Technical SEO And Cloudflare Audit - 2026-07-08

## Evidence

- Source policy: direct dashboard snapshot, public HTTP checks, WordPress REST reads, sitemap reads, and local file inspection only; no `gmail-digest`.
- Dashboard snapshot: `2026-07-08T04:15:13.350Z` from `data/site-stats.json`.
- Sites:
  - `https://homeimer.com/`, local path `D:\web\homeimercom`
  - `https://legalser.com/`, local path `D:\web\legalsercom`
- Both local paths are not git repositories, so this pass records audit findings and safe follow-up actions rather than making a repo PR.

## Dashboard Signals

| Site | 7d GSC | Prev 7d GSC | 30d GSC | 30d GA4 | Sitemap |
| --- | ---: | ---: | ---: | ---: | --- |
| `homeimer.com` | 0 clicks / 3 impressions / pos 132.33 | 0 / 241 / pos 66.93 | 0 / 1,084 / pos 66.77 | 10 users | `https://homeimer.com/sitemap_index.xml`, warnings=0, errors=0, submitted=538 |
| `legalser.com` | 1 click / 44 impressions / pos 23.80 | 0 / 150 / pos 63.79 | 1 / 547 / pos 67.37 | 17 users | `https://legalser.com/sitemap.xml`, warnings=0, errors=0, submitted=485 |

## Cloudflare Cleanup Check

- User policy: Cloudflare is not used; Cloudflare/Wrangler/Workers/Pages/D1 residue is cleanup scope.
- `cf*.txt` token search under both local paths: no matches.
- Text search for `cloudflare`, `wrangler`, `workers`, `pages.dev`, `@cloudflare`, `CLOUDFLARE`, `cdn-cgi`, `D1`, and `cf[a-f0-9]{32}`:
  - `D:\web\homeimercom`: no matches.
  - `D:\web\legalsercom`: no matches.
- No Cloudflare cleanup patch required in this pass.

## Public Technical SEO Checks

### homeimer.com

- Home: `200`, canonical `https://homeimer.com/`, robots `index, follow`.
- HTTP to HTTPS: `http://homeimer.com/` returns `301` to `https://homeimer.com/`.
- `www` to apex: `https://www.homeimer.com/` resolves to `https://homeimer.com/`.
- Robots: `200`, allows normal crawl, sitemap points to `https://homeimer.com/sitemap_index.xml`.
- Sitemap index:
  - `post-sitemap.xml`: 528 URLs.
  - `page-sitemap.xml`: 6 URLs.
  - `category-sitemap.xml`: 6 URLs.
- Sample posts/pages:
  - `https://homeimer.com/low-maintenance-seasonal-decor-rotation-comparison-mixed-materials-or-flexible-storage/`: `200`, canonical self, index/follow, title/description present.
  - `https://homeimer.com/sustainable-indoor-plant-focal-wall-case-study-a-practical-room-refresh/`: `200`, canonical self, index/follow, title/description present.
  - `/terms/` and `/contact/`: `200`, canonical self, index/follow.
- Category REST check:
  - 7 categories returned.
  - 1 empty category description (`Uncategorized`, count=0).
  - `Uncategorized` is not included in `category-sitemap.xml`.
- Technical note:
  - `Strict-Transport-Security` was not observed on the sampled HTTPS home response, unlike `legalser.com`.

### legalser.com

- Home: `200`, canonical `https://legalser.com/`, robots `index, follow`.
- HTTP to HTTPS: `http://legalser.com/` returns `301` to `https://legalser.com/`.
- `www` to apex: `https://www.legalser.com/` resolves to `https://legalser.com/`.
- Robots: `200`, allows normal crawl, sitemap points to `https://legalser.com/sitemap_index.xml`.
- Sitemap index:
  - `post-sitemap.xml`: 450 URLs.
  - `page-sitemap.xml`: 7 URLs.
  - `category-sitemap.xml`: 30 URLs.
- Sample posts/pages:
  - `https://legalser.com/digital-compliance-services-legal-english-terms/`: `200`, canonical self, index/follow, title/description present.
  - `https://legalser.com/civil-law-vs-common-law-systems-key-differences/`: `200`, canonical self, index/follow, title/description present.
  - `https://legalser.com/topic-hubs/`: `200`, canonical self, index/follow, title/description present.
- Category REST check:
  - 32 categories returned.
  - 32 category descriptions are empty.
  - 30 category archive URLs are included in `category-sitemap.xml`.
- Sample category pages:
  - `https://legalser.com/category/legal-english-guides/access-to-justice/`: `200`, index/follow, canonical self, empty meta description.
  - `https://legalser.com/category/legal-english-guides/ai-and-digital-regulation/`: `200`, index/follow, canonical self, empty meta description.

## Assessment

- No Cloudflare residue remains for either site.
- No public crawl block, robots block, sitemap error, or canonical host split was found.
- `homeimer.com` needs monitoring because GSC impressions collapsed from 241 to 3 WoW, but the public technical surface is mostly sound. The main technical hardening item is adding HSTS if the host supports it.
- `legalser.com` has a clear technical SEO improvement candidate: indexable category archives are submitted in the sitemap while all category descriptions are empty. This weakens category snippets and can create low-value archive surfaces.

## Recommended Follow-Up

1. `legalser.com` category metadata:
   - Add concise category descriptions for the 30 indexed category archives.
   - Keep descriptions factual and topic-specific, e.g. legal English terms, document types, or regulatory concepts covered in that category.
   - Recheck category pages for non-empty meta descriptions after cache purge.
2. `homeimer.com` security/canonical hardening:
   - Add HSTS (`Strict-Transport-Security`) if the hosting panel/server supports it safely.
   - Purge LiteSpeed cache and recheck headers.
3. Both sites:
   - Keep `post-sitemap.xml` and `page-sitemap.xml` indexed.
   - Keep empty `Uncategorized` out of sitemap.
   - Re-run dashboard/GSC monitoring after the next completed daily window.

