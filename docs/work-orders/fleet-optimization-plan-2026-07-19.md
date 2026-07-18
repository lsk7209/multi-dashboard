# Fleet Optimization Plan - 2026-07-18T23:02:05.961Z

## Verdict

This is a local, non-mutating plan for AdSense approval optimization and Google search growth work. It does not submit AdSense reviews, edit production WordPress/Next.js sites, submit sitemaps, deploy, or rewrite article content.

## Dashboard Evidence

- Snapshot: `2026-07-18T23:02:05.961Z`
- Stats path: `D:\web\multi-dashboard\data\site-stats.json`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `skipped_refresh_failed:adsense:missing_config:1`, `skipped_refresh_failed:adsense_collector:transient_error:1`, `skipped_refresh_failed:ads_txt:missing_config:1`, `skipped_refresh_failed:sitemap:errors:1`

## Connector Status

| Connector | Status | Count |
|---|---|---:|
| `ga4Status` | `ok` | 98 |
| `gscStatus` | `ok` | 98 |
| `adsenseStatus` | `disabled` | 3 |
| `adsenseStatus` | `missing_config` | 1 |
| `adsenseStatus` | `ok` | 94 |
| `adsenseCollectorStatus` | `disabled` | 3 |
| `adsenseCollectorStatus` | `ok` | 94 |
| `adsenseCollectorStatus` | `transient_error` | 1 |
| `adsTxtStatus` | `disabled` | 3 |
| `adsTxtStatus` | `missing_config` | 1 |
| `adsTxtStatus` | `ok` | 94 |
| `adsTxtCollectorStatus` | `disabled` | 3 |
| `adsTxtCollectorStatus` | `ok` | 95 |

## Summary

| Metric | Count |
|---|---:|
| Sites | 98 |
| AdSense problem rows | 1 |
| SEO candidates | 20 |
| Title handoff | 9 |
| Indexing | 1 |
| Technical SEO | 3 |
| Content handoff | 7 |

## AdSense Approval Queue

Source: `data\adsense-remediation-queue-2026-07-19.json`

| Priority | Site | Lane | Action | Stop condition |
|---:|---|---|---|---|
| 999829 | `ezfunnel.kr` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |

## Google Search / Content Queue

| Rank | Site | Action | Tier | Evidence | Next action |
|---:|---|---|---|---|---|
| 1 | `tennisfrens.com` | `title_handoff` | T3 | 14995 impr / 0.82% CTR / pos 9.73 / 1636 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 2 | `cartain.kr` | `title_handoff` | T3 | 4925 impr / 2.13% CTR / pos 9.37 / 1157 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 3 | `gong365.kr` | `title_handoff` | T3 | 3308 impr / 1.12% CTR / pos 8.06 / 89 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 4 | `gong365.kr` | `content_handoff` | T3 | 3308 impr / 1.12% CTR / pos 8.06 / 89 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 5 | `estat.kr` | `title_handoff` | T3 | 2940 impr / 0.41% CTR / pos 7.78 / 54 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 6 | `estat.kr` | `content_handoff` | T3 | 2940 impr / 0.41% CTR / pos 7.78 / 54 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 7 | `dogswhere.com` | `title_handoff` | T3 | 1355 impr / 1.99% CTR / pos 12.14 / 1782 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 8 | `petinsuer.com` | `title_handoff` | T3 | 1455 impr / 1.10% CTR / pos 8.96 / 137 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 9 | `nexttech7.com` | `title_handoff` | T3 | 1333 impr / 2.10% CTR / pos 14.10 / 198 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 10 | `dogspang.kr` | `title_handoff` | T3 | 971 impr / 1.85% CTR / pos 9.60 / 93 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 11 | `dogspang.kr` | `content_handoff` | T3 | 971 impr / 1.85% CTR / pos 9.60 / 93 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 12 | `legalser.com` | `technical_seo` | T2 | 696 impr / 0.29% CTR / pos 40.19 / 24 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 13 | `today2424.kr` | `content_handoff` | T3 | 796 impr / 4.77% CTR / pos 9.18 / 80 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 14 | `spinkorea.kr` | `technical_seo` | T2 | 326 impr / 0.00% CTR / pos 43.26 / 554 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 15 | `legalser.com` | `content_handoff` | T3 | 696 impr / 0.29% CTR / pos 40.19 / 24 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 16 | `homeimer.com` | `technical_seo` | T2 | 537 impr / 0.00% CTR / pos 66.29 / 13 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 17 | `healfood.kr` | `title_handoff` | T3 | 511 impr / 0.78% CTR / pos 9.03 / 37 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 18 | `homeimer.com` | `content_handoff` | T3 | 537 impr / 0.00% CTR / pos 66.29 / 13 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 19 | `healfood.kr` | `content_handoff` | T3 | 511 impr / 0.78% CTR / pos 9.03 / 37 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 20 | `ezfunnel.kr` | `indexing` | T2 | 95 impr / 1.05% CTR / pos 17.74 / 38 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |

## Stop Conditions

- Do not submit AdSense review while console state is unknown or raw loader proof is missing.
- Do not treat local collector timeout as proof of site-level AdSense breakage.
- Do not edit article titles or bodies from this technical plan; route those to title/content handoff.
- Do not use this plan as fresh prioritization if pnpm stats:update has not completed cleanly.
- Do not run sitemap submission, production deployment, or WordPress mutations from this plan without an explicit apply step and rollback path.
