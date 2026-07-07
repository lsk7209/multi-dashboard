# Dashboard Insights Improvement Review - 2026-07-07

Source snapshot: `data/site-stats.json generatedAt=2026-07-07T00:04:23.401Z`

This packet uses the refreshed dashboard data and the same `getDashboardData()` pipeline that feeds the dashboard and Insights tab. It is a review and execution plan only: no site files, WordPress content, Search Console settings, AdSense settings, production DB writes, or deployments were changed from this packet.

## Current Readiness

| Area | Status | Evidence |
|---|---|---|
| Dashboard actionability | Ready | `safe_to_act`, blocker hosts `0`, recovery command `pnpm dashboard:post-recovery` |
| Sites in snapshot | 98 | `pnpm dashboard:smoke` |
| Insight/action counts | 76 insights, 16 actions | Priority 10, SEO 10, decline 8 |
| Health | 95 average score | 91 healthy, 7 warning, 0 critical |
| GA4/GSC collection | Healthy | GA4 ok 98/98, GSC ok 98/98 |
| GSC permission handoff | Resolved | `pnpm gsc:permissions:audit`, auditedRows `0` |
| Fleet optimization chain | Current | 6 commands, 6 pass, stats snapshot matched |
| Post-recovery chain | Ready | readiness `ready_to_act`, artifact integrity `pass` |
| Sitemap refresh dry-run | No targets | `pnpm sitemaps:refresh-stale -- --dry-run --limit=50` |
| Vercel/API-data inventory | Updated | 28 sites: 14 scheduled DB, 11 API-backed, 3 candidate |

## Executive Summary

The earlier `yesa.kr` GSC verification blocker is no longer present in the current dashboard state. The dashboard is now safe to use for prioritization.

The main improvement work splits into four lanes:

1. Decline diagnostics before edits: `todaypharm.kr`, `2mlab.kr`, `tasko.kr`, `dogswhere.com`, `dullegilgogo.kr`.
2. Search-click recovery and snippet/content work: `temon.kr`, `softwa.kr`, `dogspang.kr`, `gong365.kr`, `today2424.kr`.
3. Near-page-one SEO opportunities: `tennisfrens.com`, `cartain.kr`, `ehon365.kr`, `nexttech7.com`, `texturb.com`.
4. Dashboard product improvements: readiness visibility, evidence preservation, filters/caps, site rollups, confidence/sample-size badges, and clearer GA4-vs-GSC cause labels.

Sitemap warnings should not be handled by broad resubmission today. The dry-run returned no refresh targets, so sitemap rows are triage/monitoring candidates until public sitemap, robots, and GSC evidence says otherwise.

## Site Priority List

| Priority | Site | Signal | Evidence | Next move | Gate before mutation |
|---|---|---|---|---|---|
| P0 | `todaypharm.kr` | GA4 users -69.4%, GSC 0 | 1,112 recent users vs 3,637 previous; sitemap submitted 49,457; GSC clicks/impressions 0 | Investigate channel mix, tracking, sitemap/canonical/robots/noindex, and DB/content freshness | Read-only API-data freshness check and GSC URL/query verification |
| P0 | `2mlab.kr` | GA4 users -82.5%, GSC 0 | 132 recent users vs 756 previous; sitemap submitted 2,702; GSC clicks/impressions 0 | Check whether drop is acquisition/tracking, indexing, or content freshness | GA4 source/medium split plus GSC page/query export |
| P1 | `tasko.kr` | GA4 users -39.6%, GSC 0 | 32 recent users vs 53 previous; GSC 0 | Confirm whether GSC zero is expected for the property and compare acquisition channels | Do not edit content until GSC zero cause is classified |
| P1 | `dogswhere.com` | GA4 users -40.4% | Action queue decline, API-backed content site | Check source-data freshness and recent publishing/indexing | Read-only DB/API freshness check first |
| P1 | `dullegilgogo.kr` | GA4 users -51.6% | Action queue decline, scheduled-ingestion site | Compare latest collected data, generated pages, and published pages | Read-only ingestion/publish queue check first |
| P1 | `temon.kr` | GSC clicks -51.1%, ranking opportunity | 22 clicks, 859 impressions, CTR 2.6%, avg position 11.4 | Recover pages for `mbti 테스트`, `테스트 모음`, `아이돌 테스트`; add FAQ/internal links | Confirm lost URLs and previous-week query/page deltas |
| P1 | `softwa.kr` | GSC clicks -76.5%, ranking opportunity | 4 clicks, 158 impressions, CTR 2.5%, avg position 11.2 | Identify previous-week winning pages, refresh title/meta/internal links | Query/page delta export; low volume means avoid site-wide conclusions |
| P1 | `dogspang.kr` | GSC clicks -81.8%, low CTR | 2 clicks, 179 impressions, CTR 1.1%, query `강아지 발바닥 각화증` | Title/meta repair and targeted content refresh | Confirm landing URL and clean query mapping |
| P1 | `gong365.kr` | GSC clicks -50.0%, GA4 growth | 5 clicks, 390 impressions, CTR 1.3%; GA4 users +57.1% | Treat as search-specific decline, not whole-site decline | Compare organic search vs other channels |
| P2 | `today2424.kr` | GSC clicks -40.0%, near page one | 6 clicks, 124 impressions, avg position 10.1; query `월세 계약해지 통보 문자 예시` pos 5.8, 0 clicks | Rewrite snippet/title to match example/template intent | Confirm landing URL and avoid broad rewrite |
| P2 | `tennisfrens.com` | Growth plus avg position 10.5 | 32 clicks, 3,021 impressions, CTR 1.1%; GA4 users +248.2% | Expand winners and improve snippets around tennis player/entity pages | Verify top pages and clean query text |
| P2 | `cartain.kr` | Avg position 10.0, low CTR | 10 clicks, 678 impressions, CTR 1.5%; query `2026년 신차 출시 일정` | Improve SERP title/meta and internal links to current-model pages | Confirm current URLs and published source |
| P2 | `ehon365.kr` | Avg position 10.5 | 11 clicks, 239 impressions, CTR 4.6% | Page-level refresh for 5-20 position URLs | Low-volume check before large edits |
| P2 | `nexttech7.com` | Avg position 10.6 | 3 clicks, 208 impressions, CTR 1.4% | Refresh top pages, FAQ, schema where appropriate | Query/page evidence first |
| P2 | `texturb.com` | CTR 0.0% | 30 impressions, 0 clicks | Title/meta intent repair | Confirm query text and target page |
| Monitor | `nicewomen`, `ezfunnel`, `autorentlab`, `discparty` | Sitemap warnings/actions | Dashboard action queue flags, but dry-run found no refresh targets | Inspect public sitemap/robots/GSC detail only if warnings persist | No broad sitemap resubmit from current evidence |

## Dashboard Product Improvements

| Priority | Improvement | Why it matters | Suggested implementation target |
|---|---|---|---|
| P0 | Put global readiness at the top of the dashboard and Insights tab | When fleet readiness is blocked, cards can still look healthy and invite unsafe action | Promote `getDashboardActionability()` status into a persistent top banner |
| P0 | Preserve original evidence in read-only blocked queue | Generic blocked copy hides the real reason, site, and metric | Keep reason, metric, site, and artifact path visible while disabling action commands |
| P1 | Add insight filters and visible caps | The UI shows slices of 76 insights, but users cannot tell what is hidden | Add filters for severity, type, site, sample-size, and source freshness; show `displayed/total` |
| P1 | Group insights by site | Multiple rows for one site currently fragment the diagnosis | Create a site rollup with primary diagnosis, related signals, confidence, and next gate |
| P1 | Add confidence and sample-size badges | Low-volume percent changes can look as urgent as high-confidence drops | Badge `low sample`, `high confidence`, `monitor`, `actionable after recovery` |
| P1 | Separate GA4 decline from GSC decline | `GA4 user drop` and `search click drop` require different checks | Add cause labels: `channel drop`, `search drop`, `GSC zero`, `non-search growth` |
| P2 | Add a GSC-zero diagnostic lane | Healthy GSC 0 is not the same as permission failure | Classify as property mismatch, no query demand, submitted-but-not-indexed, or GA4-only traffic |
| P2 | Add action ergonomics | Operators need a quick handoff packet | Add buttons for filter site, open evidence artifact, copy triage packet, and open work order path |

## Execution Batches

### Batch A - Decline and GSC-zero diagnostics

Targets: `todaypharm.kr`, `2mlab.kr`, `tasko.kr`, `dogswhere.com`, `dullegilgogo.kr`.

Run only read-only checks first:

- GA4 channel/source split for current 7 days vs previous 7 days.
- GSC page/query deltas with absolute counts and 30-day context.
- Robots, canonical, noindex, sitemap response, and submitted-vs-indexed evidence.
- For API-data sites, latest source `updated_at`/`created_at`, pending queue counts, and latest published dates.

Stop condition: each site gets a classified cause and one reversible next action. Do not publish, backfill, or deploy from this batch.

### Batch B - Search-click Recovery

Targets: `temon.kr`, `softwa.kr`, `dogspang.kr`, `gong365.kr`, `today2424.kr`.

Work from top queries and landing URLs, not broad site edits. Produce per-site title/meta/internal-link briefs and only mutate after the exact URLs are confirmed.

### Batch C - Growth and Near-Page-One Expansion

Targets: `tennisfrens.com`, `cartain.kr`, `ehon365.kr`, `nexttech7.com`, `texturb.com`.

Prioritize snippet alignment and internal links for 5-20 average-position pages. Treat growth sites as expansion candidates, not emergency fixes.

### Batch D - Dashboard UX Hardening

Targets: dashboard app code only. Implement the dashboard product improvements above with tests around actionability, blocked/read-only evidence, caps, and cause labels.

## Safety Rules For Next Work

- Refresh dashboard data before using Insights again: `pnpm stats:update`.
- If actionability changes away from `safe_to_act`, run `pnpm dashboard:post-recovery` and use only read-only inspection until it passes.
- For Batch A targets, use `docs/work-orders/dashboard-batch-a-diagnostics-2026-07-07.md` as the target-resolution source before touching any site.
- Do not use mojibake query examples from this or older work orders as title/content edit input; use only fresh dashboard/GSC export query text after URL mapping.
- Do not treat `GSC 0` as a permission error when GSC collection is healthy.
- Do not treat 7-day percentage drops as edit authorization without absolute counts, channel mix, and query/page deltas.
- Do not run production DB writes, live API backfills, WordPress publishing, Search Console mutations, or deployments from this review packet.

## Multi-Agent Synthesis

- `analyst` lane ranked site priorities and separated decline, growth, sitemap, and SEO opportunities.
- `designer` lane identified dashboard UX/product improvements: readiness visibility, evidence preservation, filters, rollups, confidence badges, cause labels, and next-action ergonomics.
- `critic` lane flagged false-positive risks. Its original blocker concern was resolved by the later recovery chain, but the validation gates remain valid for site-level execution.

## Verification Evidence

- `pnpm stats:update`: PASS, 98 sites, GA4 failed 0, GSC failed 0, sitemaps failed 0, AdSense code not detected 0, ads.txt failed 0.
- `pnpm gsc:permissions:audit`: PASS, handoff resolved, auditedRows 0.
- `pnpm fleet:optimize`: PASS, 6 commands, 6 pass, stats/handoff matched current snapshot.
- `pnpm dashboard:post-recovery`: PASS, readiness `ready_to_act`, artifact integrity `pass`, actionability `safe_to_act`.
- `pnpm dashboard:smoke`: PASS, sites 98, actions 16, insights 76, chainStatus current, blockers none.
- `pnpm dashboard:artifact-integrity -- --date=2026-07-07`: PASS, ready true, pass 12, fail 0.
- `pnpm sitemaps:refresh-stale -- --dry-run --limit=50`: PASS, no sitemap refresh targets.
- `pnpm exec tsx scripts/setup/audit-vercel-api-data-sites.ts`: PASS, 28 Vercel/API-data sites inventoried.
