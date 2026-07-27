# Fleet Optimization Plan - 2026-07-27T12:40:42.252Z

## Verdict

This is a local, non-mutating plan for AdSense approval optimization and Google search growth work. It does not submit AdSense reviews, edit production WordPress/Next.js sites, submit sitemaps, deploy, or rewrite article content.

## Dashboard Evidence

- Snapshot: `2026-07-27T12:40:42.252Z`
- Stats path: `D:\web\multi-dashboard\data\site-stats.json`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `none`

## Connector Status

| Connector | Status | Count |
|---|---|---:|
| `ga4Status` | `ok` | 103 |
| `gscStatus` | `ok` | 103 |
| `adsenseStatus` | `disabled` | 4 |
| `adsenseStatus` | `editorial_hold` | 1 |
| `adsenseStatus` | `ok` | 98 |
| `adsenseCollectorStatus` | `disabled` | 4 |
| `adsenseCollectorStatus` | `ok` | 99 |
| `adsTxtStatus` | `disabled` | 4 |
| `adsTxtStatus` | `ok` | 99 |
| `adsTxtCollectorStatus` | `disabled` | 4 |
| `adsTxtCollectorStatus` | `ok` | 99 |

## Summary

| Metric | Count |
|---|---:|
| Sites | 103 |
| AdSense problem rows | 1 |
| SEO candidates | 20 |
| Title handoff | 11 |
| Indexing | 1 |
| Technical SEO | 2 |
| Content handoff | 6 |

## AdSense Approval Queue

Source: `data\adsense-remediation-queue-2026-07-27.json`

| Priority | Site | Lane | Action | Stop condition |
|---:|---|---|---|---|
| 999909 | `caregos.com` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |

## Google Search / Content Queue

| Rank | Site | Action | Tier | Evidence | Next action |
|---:|---|---|---|---|---|
| 1 | `tennisfrens.com` | `title_handoff` | T3 | 15371 impr / 0.87% CTR / pos 9.82 / 1663 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 2 | `cartain.kr` | `title_handoff` | T3 | 5481 impr / 2.17% CTR / pos 9.20 / 1314 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 3 | `estat.kr` | `title_handoff` | T3 | 3497 impr / 0.51% CTR / pos 7.59 / 64 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 4 | `estat.kr` | `content_handoff` | T3 | 3497 impr / 0.51% CTR / pos 7.59 / 64 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 5 | `gong365.kr` | `title_handoff` | T3 | 2894 impr / 1.07% CTR / pos 8.13 / 92 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 6 | `gong365.kr` | `content_handoff` | T3 | 2894 impr / 1.07% CTR / pos 8.13 / 92 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 7 | `nexttech7.com` | `title_handoff` | T3 | 1754 impr / 2.17% CTR / pos 14.77 / 213 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 8 | `petinsuer.com` | `title_handoff` | T3 | 1577 impr / 0.95% CTR / pos 8.81 / 165 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 9 | `legalser.com` | `technical_seo` | T2 | 682 impr / 0.44% CTR / pos 24.76 / 32 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 10 | `spinkorea.kr` | `technical_seo` | T2 | 392 impr / 0.26% CTR / pos 44.34 / 585 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 11 | `dogspang.kr` | `title_handoff` | T3 | 677 impr / 1.48% CTR / pos 9.79 / 71 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 12 | `dogspang.kr` | `content_handoff` | T3 | 677 impr / 1.48% CTR / pos 9.79 / 71 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 13 | `legalser.com` | `content_handoff` | T3 | 682 impr / 0.44% CTR / pos 24.76 / 32 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 14 | `plategogo.com` | `title_handoff` | T3 | 560 impr / 0.00% CTR / pos 10.37 / 87 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 15 | `today2424.kr` | `content_handoff` | T3 | 594 impr / 5.22% CTR / pos 9.30 / 66 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 16 | `plategogo.com` | `content_handoff` | T3 | 560 impr / 0.00% CTR / pos 10.37 / 87 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 17 | `patentgogo.com` | `title_handoff` | T3 | 467 impr / 0.21% CTR / pos 10.93 / 57 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 18 | `healfood.kr` | `title_handoff` | T3 | 388 impr / 1.03% CTR / pos 10.64 / 45 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 19 | `yungyanggogo.kr` | `title_handoff` | T3 | 314 impr / 0.96% CTR / pos 6.97 / 166 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 20 | `caregos.com` | `indexing` | T2 | 13 impr / 0.00% CTR / pos 41.77 / 39 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |

## Stop Conditions

- Do not submit AdSense review while console state is unknown or raw loader proof is missing.
- Do not treat local collector timeout as proof of site-level AdSense breakage.
- Do not edit article titles or bodies from this technical plan; route those to title/content handoff.
- Do not use this plan as fresh prioritization if pnpm stats:update has not completed cleanly.
- Do not run sitemap submission, production deployment, or WordPress mutations from this plan without an explicit apply step and rollback path.
