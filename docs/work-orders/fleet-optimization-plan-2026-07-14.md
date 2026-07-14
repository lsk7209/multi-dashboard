# Fleet Optimization Plan - 2026-07-14T00:43:04.577Z

## Verdict

This is a local, non-mutating plan for AdSense approval optimization and Google search growth work. It does not submit AdSense reviews, edit production WordPress/Next.js sites, submit sitemaps, deploy, or rewrite article content.

## Dashboard Evidence

- Snapshot: `2026-07-14T00:43:04.577Z`
- Stats path: `D:\web\multi-dashboard\data\site-stats.json`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `skipped_refresh_failed:adsense_collector:transient_error:17`, `skipped_refresh_failed:ads_txt_collector:transient_error:17`

## Connector Status

| Connector | Status | Count |
|---|---|---:|
| `ga4Status` | `ok` | 98 |
| `gscStatus` | `ok` | 98 |
| `adsenseStatus` | `disabled` | 3 |
| `adsenseStatus` | `ok` | 95 |
| `adsenseCollectorStatus` | `disabled` | 3 |
| `adsenseCollectorStatus` | `ok` | 78 |
| `adsenseCollectorStatus` | `transient_error` | 17 |
| `adsTxtStatus` | `disabled` | 3 |
| `adsTxtStatus` | `ok` | 95 |
| `adsTxtCollectorStatus` | `disabled` | 3 |
| `adsTxtCollectorStatus` | `ok` | 78 |
| `adsTxtCollectorStatus` | `transient_error` | 17 |

## Summary

| Metric | Count |
|---|---:|
| Sites | 98 |
| AdSense problem rows | 0 |
| SEO candidates | 18 |
| Title handoff | 9 |
| Indexing | 0 |
| Technical SEO | 2 |
| Content handoff | 7 |

## AdSense Approval Queue

Source: `data\adsense-remediation-queue-2026-07-14.json`

| Priority | Site | Lane | Action | Stop condition |
|---:|---|---|---|---|


## Google Search / Content Queue

| Rank | Site | Action | Tier | Evidence | Next action |
|---:|---|---|---|---|---|
| 1 | `tennisfrens.com` | `title_handoff` | T3 | 14404 impr / 0.81% CTR / pos 9.75 / 1544 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 2 | `cartain.kr` | `title_handoff` | T3 | 3955 impr / 1.97% CTR / pos 9.58 / 1070 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 3 | `gong365.kr` | `title_handoff` | T3 | 3052 impr / 1.21% CTR / pos 8.13 / 89 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 4 | `gong365.kr` | `content_handoff` | T3 | 3052 impr / 1.21% CTR / pos 8.13 / 89 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 5 | `estat.kr` | `title_handoff` | T3 | 2779 impr / 0.47% CTR / pos 7.85 / 43 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 6 | `estat.kr` | `content_handoff` | T3 | 2779 impr / 0.47% CTR / pos 7.85 / 43 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 7 | `dogswhere.com` | `title_handoff` | T3 | 1124 impr / 1.87% CTR / pos 12.96 / 1574 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 8 | `petinsuer.com` | `title_handoff` | T3 | 1368 impr / 1.32% CTR / pos 9.45 / 119 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 9 | `dogspang.kr` | `title_handoff` | T3 | 1106 impr / 1.81% CTR / pos 9.92 / 92 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 10 | `nexttech7.com` | `title_handoff` | T3 | 965 impr / 1.97% CTR / pos 13.41 / 194 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 11 | `dogspang.kr` | `content_handoff` | T3 | 1106 impr / 1.81% CTR / pos 9.92 / 92 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 12 | `homeimer.com` | `technical_seo` | T2 | 807 impr / 0.00% CTR / pos 66.42 / 13 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 13 | `today2424.kr` | `content_handoff` | T3 | 912 impr / 4.06% CTR / pos 9.43 / 92 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 14 | `homeimer.com` | `content_handoff` | T3 | 807 impr / 0.00% CTR / pos 66.42 / 13 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 15 | `legalser.com` | `technical_seo` | T2 | 654 impr / 0.31% CTR / pos 56.25 / 21 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 16 | `legalser.com` | `content_handoff` | T3 | 654 impr / 0.31% CTR / pos 56.25 / 21 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 17 | `healfood.kr` | `title_handoff` | T3 | 513 impr / 0.78% CTR / pos 8.87 / 32 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 18 | `healfood.kr` | `content_handoff` | T3 | 513 impr / 0.78% CTR / pos 8.87 / 32 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |

## Stop Conditions

- Do not submit AdSense review while console state is unknown or raw loader proof is missing.
- Do not treat local collector timeout as proof of site-level AdSense breakage.
- Do not edit article titles or bodies from this technical plan; route those to title/content handoff.
- Do not use this plan as fresh prioritization if pnpm stats:update has not completed cleanly.
- Do not run sitemap submission, production deployment, or WordPress mutations from this plan without an explicit apply step and rollback path.
