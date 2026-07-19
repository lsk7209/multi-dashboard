# Fleet Optimization Plan - 2026-07-19T05:31:20.047Z

## Verdict

This is a local, non-mutating plan for AdSense approval optimization and Google search growth work. It does not submit AdSense reviews, edit production WordPress/Next.js sites, submit sitemaps, deploy, or rewrite article content.

## Dashboard Evidence

- Snapshot: `2026-07-19T05:31:20.047Z`
- Stats path: `D:\web\multi-dashboard\data\site-stats.json`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `skipped_refresh_failed:adsense_collector:transient_error:1`

## Connector Status

| Connector | Status | Count |
|---|---|---:|
| `ga4Status` | `ok` | 98 |
| `gscStatus` | `ok` | 98 |
| `adsenseStatus` | `disabled` | 3 |
| `adsenseStatus` | `ok` | 95 |
| `adsenseCollectorStatus` | `disabled` | 3 |
| `adsenseCollectorStatus` | `ok` | 94 |
| `adsenseCollectorStatus` | `transient_error` | 1 |
| `adsTxtStatus` | `disabled` | 3 |
| `adsTxtStatus` | `ok` | 95 |
| `adsTxtCollectorStatus` | `disabled` | 3 |
| `adsTxtCollectorStatus` | `ok` | 95 |

## Summary

| Metric | Count |
|---|---:|
| Sites | 98 |
| AdSense problem rows | 0 |
| SEO candidates | 20 |
| Title handoff | 9 |
| Indexing | 1 |
| Technical SEO | 3 |
| Content handoff | 7 |

## AdSense Approval Queue

Source: `data\adsense-remediation-queue-2026-07-19.json`

| Priority | Site | Lane | Action | Stop condition |
|---:|---|---|---|---|


## Google Search / Content Queue

| Rank | Site | Action | Tier | Evidence | Next action |
|---:|---|---|---|---|---|
| 1 | `tennisfrens.com` | `title_handoff` | T3 | 15175 impr / 0.82% CTR / pos 9.77 / 1637 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 2 | `cartain.kr` | `title_handoff` | T3 | 5141 impr / 2.12% CTR / pos 9.33 / 1157 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 3 | `gong365.kr` | `title_handoff` | T3 | 3310 impr / 1.12% CTR / pos 8.05 / 89 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 4 | `estat.kr` | `title_handoff` | T3 | 3058 impr / 0.43% CTR / pos 7.75 / 55 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 5 | `gong365.kr` | `content_handoff` | T3 | 3310 impr / 1.12% CTR / pos 8.05 / 89 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 6 | `estat.kr` | `content_handoff` | T3 | 3058 impr / 0.43% CTR / pos 7.75 / 55 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 7 | `dogswhere.com` | `title_handoff` | T3 | 1426 impr / 2.17% CTR / pos 12.02 / 1784 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 8 | `petinsuer.com` | `title_handoff` | T3 | 1513 impr / 1.19% CTR / pos 8.95 / 137 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 9 | `nexttech7.com` | `title_handoff` | T3 | 1427 impr / 2.17% CTR / pos 14.05 / 198 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 10 | `dogspang.kr` | `title_handoff` | T3 | 971 impr / 1.85% CTR / pos 9.60 / 93 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 11 | `dogspang.kr` | `content_handoff` | T3 | 971 impr / 1.85% CTR / pos 9.60 / 93 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 12 | `legalser.com` | `technical_seo` | T2 | 728 impr / 0.27% CTR / pos 39.52 / 23 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 13 | `today2424.kr` | `content_handoff` | T3 | 796 impr / 4.77% CTR / pos 9.18 / 80 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 14 | `legalser.com` | `content_handoff` | T3 | 728 impr / 0.27% CTR / pos 39.52 / 23 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 15 | `spinkorea.kr` | `technical_seo` | T2 | 339 impr / 0.00% CTR / pos 43.68 / 554 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 16 | `homeimer.com` | `technical_seo` | T2 | 538 impr / 0.00% CTR / pos 66.21 / 13 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 17 | `healfood.kr` | `title_handoff` | T3 | 515 impr / 0.78% CTR / pos 9.03 / 37 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 18 | `homeimer.com` | `content_handoff` | T3 | 538 impr / 0.00% CTR / pos 66.21 / 13 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 19 | `healfood.kr` | `content_handoff` | T3 | 515 impr / 0.78% CTR / pos 9.03 / 37 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 20 | `ezfunnel.kr` | `indexing` | T2 | 95 impr / 1.05% CTR / pos 17.74 / 38 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |

## Stop Conditions

- Do not submit AdSense review while console state is unknown or raw loader proof is missing.
- Do not treat local collector timeout as proof of site-level AdSense breakage.
- Do not edit article titles or bodies from this technical plan; route those to title/content handoff.
- Do not use this plan as fresh prioritization if pnpm stats:update has not completed cleanly.
- Do not run sitemap submission, production deployment, or WordPress mutations from this plan without an explicit apply step and rollback path.
