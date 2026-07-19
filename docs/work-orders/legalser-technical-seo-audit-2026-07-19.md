# legalser.com Technical SEO Audit — 2026-07-19

## Evidence scope

- Dashboard evidence: `data/site-stats.json` generated at `2026-07-19T05:31:20.047Z`; the regenerated fleet chain passed 4/4 at `2026-07-19T05:41:25.281Z`.
- Site evidence: public HTTP, WordPress REST, sitemap, RSS, `llms.txt`, and `ads.txt` checks on 2026-07-19.
- Mode: audit only. No WordPress, Search Console, sitemap submission, content, or deployment change was made.

## Findings

| Area | Result | Tier | Evidence |
| --- | --- | --- | --- |
| Public availability | Pass | — | Home, robots, sitemap, feed, `llms.txt`, and `ads.txt` each returned `200`. |
| Crawl paths | Pass | — | `robots.txt` allows core crawlers and names `https://legalser.com/sitemap_index.xml`; sitemap index and three child sitemaps are present. |
| Canonical, Open Graph, schema | Pass | — | Home and sampled post each render exactly one self-canonical, expected Open Graph fields, and two JSON-LD blocks. |
| AdSense technical readiness | Pass | — | One loader for `ca-pub-3050601904412736`; `ads.txt` serves the matching Google DIRECT line. |
| Sitemap freshness | Warning | T2 | Latest ten REST posts were published 2026-07-07 through 2026-07-09 and exist in `post-sitemap.xml`, but each keeps a May `modified` time. The sitemap index maximum `lastmod` is `2026-06-10T10:03:35+00:00`, while the feed already exposes July publication dates. |
| Naver verification ownership | Warning | T2 | The home page emits two different `naver-site-verification` meta values. Keep only the verified, currently owned value after checking Naver Search Advisor; do not remove either blindly. |
| Metadata consistency | Warning | T2 | Page HTML declares `lang=en-US`, while `llms.txt` declares `Language: ko-KR`. Choose the intended primary language from site policy, then align technical metadata without rewriting article text. |

## Required patch plan (approval and backup required)

1. Record a WordPress database and relevant theme/plugin/mu-plugin backup, plus the active sitemap owner and rollback command.
2. Identify the post-ingestion code that assigned July `post_date` while retaining May `post_modified`. Correct the ingestion rule for future posts; do not bulk-edit historical rows without an exact affected-ID list and rollback plan.
3. Rebuild the sitemap through its current owner, then verify that the sitemap index and affected post URLs expose consistent, truthful modification timestamps. The existing URLs are present, so this is a freshness-signal repair, not a blind GSC resubmission.
4. In Naver Search Advisor, determine which verification token is active. Preserve the active token and remove only the obsolete duplicate through the same metadata owner.
5. Align `html[lang]` and `llms.txt` to the approved site language policy. This is technical metadata work; article body rewrites remain out of scope.

## Validation after an approved patch

- Home and the sampled post return `200` with their self-canonicals intact.
- `robots.txt`, sitemap index, child sitemap, and feed remain `200` and XML-parseable.
- Latest REST posts remain present in the post sitemap; relevant `lastmod` values are no longer older than their confirmed publication/update semantics.
- Exactly one active Naver verification meta value is emitted.
- `html[lang]` and `llms.txt` agree.
- `ads.txt` and the single AdSense loader remain unchanged.

## Stop condition

Do not apply any production change until backup, sitemap-owner mapping, and Naver token ownership are proven. Title and article-body optimization are separate T3 work and are not authorized by this audit.
