# Fleet Growth and AdSense Quality Work Order - 2026-07-14

## Evidence Boundary

- Dashboard snapshot: `data/site-stats.json` generated at `2026-07-14T00:43:04.577Z` (98 sites).
- Direct operational state: GA4, GSC, sitemap, AdSense install, and ads.txt checks are healthy for the fleet. `discparty` timed out in the later content probe only; its completed service probe statuses remain `ok` and the timeout is one high-severity collection-maintenance finding.
- No CMS, database, Search Console, AdSense, title/body, publishing, or site deployment mutation was performed by this work order.
- “AdSense installed” and “ads.txt valid” are technical signals, not proof of account approval or policy compliance. Approval remains site- and account-specific.

## Priority 1: Search Opportunity Briefs (Before Any Title/Content Edit)

| Site | Signal from current fleet plan | Recommended read-only confirmation | Allowed next action after confirmation |
|---|---|---|---|
| `tennisfrens` | 14,404 impressions, 0.81% CTR, avg position 9.75; `마르타 코스튜크` has 3,340 impressions at position 7.89 | Verify exact page/query pair, current SERP intent, canonical, and existing title/meta | One title/meta experiment with before/after GSC window |
| `cartain` | 3,955 impressions, 1.97% CTR, avg position 9.58 | Verify the served page, query intent, and SSR metadata | One title/meta experiment; retain rollback snapshot |
| `gong365`, `estat`, `dogspang`, `healfood` | Combined title/content candidates with position roughly 8–10 | Collect page-query evidence and inspect helpful-content depth/source quality | Create a site-specific content brief; do not mass-generate |
| `petinsuer`, `dogswhere`, `nexttech7` | CTR/title candidates at positions 9–13 | Verify landing-page mapping and cannibalization | Narrow metadata revision only if one page is clearly selected |

## Priority 2: Content Quality and Technical SEO

| Site | Signal | Gate before a change |
|---|---|---|
| `homeimer` | Technical SEO + content candidate; avg position 66.42 | Public crawl/render check, canonical/indexability, sitemap inclusion, then topic-gap brief |
| `legalser` | Technical SEO + content candidate; avg position 56.25 | Confirm public indexability, legal-content review standard, and source/citation currency |
| `today2424` | Content candidate; 4.06% CTR at position 9.43 | Preserve the working click intent; inspect query/page depth before expanding content |

## Priority 3: Vercel/API Data Content Gate

The refreshed inventory contains 28 non-WordPress Vercel/API data sites. `pnpm ops:api-data-freshness` reports no source-data measurement:

- 14 `scheduled-db-ingestion` sites require a site-specific read-only DB timestamp and queue-state probe.
- 11 `api-backed-content` sites require a read-only upstream source-date check.
- 3 candidate-review sites require local implementation review.

Do not generate, publish, or schedule content from this inventory until the relevant read-only source freshness proof is captured. See `docs/vercel-api-data-freshness.md` and `docs/work-orders/vercel-api-data-freshness-2026-07-14.md`.

## Monetization / AdSense Guardrails

1. Keep policy/help/contact/about, original content, navigation, canonical/indexing, and ad placement evidence site-specific; a fleet label is not an approval decision.
2. Do not add ads or affiliate blocks to thin, unverified, or primarily templated pages. First measure page purpose, original information, author/editorial ownership, disclosures, and ad density.
3. Do not claim a Google ranking or revenue outcome from a title/content change. Record baseline impressions, clicks, CTR, position, page, query, and post-change observation window.
4. Treat collector maintenance separately from genuine missing AdSense/ads.txt evidence, but retain the timeout for remediation.

## Stop Condition

This work order is complete when each selected site has current page/query or source-data evidence and an explicit, reversible site-level change plan. It does not authorize production mutations itself.
