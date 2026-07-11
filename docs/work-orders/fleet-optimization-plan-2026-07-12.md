# Fleet Optimization Plan - 2026-07-11T16:18:45.043Z

## Verdict

This is a local, non-mutating plan for AdSense approval optimization and Google search growth work. It does not submit AdSense reviews, edit production WordPress/Next.js sites, submit sitemaps, deploy, or rewrite article content.

## Dashboard Evidence

- Snapshot: `2026-07-11T16:18:45.043Z`
- Stats path: `D:\web\multi-dashboard\data\site-stats.json`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `skipped_refresh_failed:adsense_collector:transient_error:18`, `skipped_refresh_failed:ads_txt_collector:transient_error:18`

## Connector Status

| Connector | Status | Count |
|---|---|---:|
| `ga4Status` | `ok` | 98 |
| `gscStatus` | `ok` | 98 |
| `adsenseStatus` | `disabled` | 3 |
| `adsenseStatus` | `ok` | 95 |
| `adsenseCollectorStatus` | `disabled` | 3 |
| `adsenseCollectorStatus` | `ok` | 77 |
| `adsenseCollectorStatus` | `transient_error` | 18 |
| `adsTxtStatus` | `disabled` | 3 |
| `adsTxtStatus` | `ok` | 95 |
| `adsTxtCollectorStatus` | `disabled` | 3 |
| `adsTxtCollectorStatus` | `ok` | 77 |
| `adsTxtCollectorStatus` | `transient_error` | 18 |

## Summary

| Metric | Count |
|---|---:|
| Sites | 98 |
| AdSense problem rows | 0 |
| SEO candidates | 19 |
| Title handoff | 11 |
| Indexing | 0 |
| Technical SEO | 2 |
| Content handoff | 6 |

## AdSense Approval Queue

Source: `data\adsense-remediation-queue-2026-07-12.json`

| Priority | Site | Lane | Action | Stop condition |
|---:|---|---|---|---|


## Google Search / Content Queue

| Rank | Site | Action | Tier | Evidence | Next action |
|---:|---|---|---|---|---|
| 1 | `tennisfrens.com` | `title_handoff` | T3 | 13784 impr / 0.83% CTR / pos 9.69 / 1473 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 2 | `cartain.kr` | `title_handoff` | T3 | 3681 impr / 1.82% CTR / pos 9.46 / 1013 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 3 | `gong365.kr` | `title_handoff` | T3 | 2910 impr / 1.20% CTR / pos 8.10 / 81 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 4 | `estat.kr` | `title_handoff` | T3 | 2669 impr / 0.49% CTR / pos 7.89 / 41 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 5 | `gong365.kr` | `content_handoff` | T3 | 2910 impr / 1.20% CTR / pos 8.10 / 81 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 6 | `estat.kr` | `content_handoff` | T3 | 2669 impr / 0.49% CTR / pos 7.89 / 41 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 7 | `dogswhere.com` | `title_handoff` | T3 | 999 impr / 1.70% CTR / pos 13.25 / 1448 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 8 | `petinsuer.com` | `title_handoff` | T3 | 1309 impr / 1.45% CTR / pos 9.54 / 104 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 9 | `dogspang.kr` | `title_handoff` | T3 | 1073 impr / 1.77% CTR / pos 9.93 / 86 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 10 | `ehon365.kr` | `title_handoff` | T3 | 744 impr / 2.42% CTR / pos 14.67 / 636 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 11 | `dogspang.kr` | `content_handoff` | T3 | 1073 impr / 1.77% CTR / pos 9.93 / 86 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 12 | `homeimer.com` | `technical_seo` | T2 | 909 impr / 0.00% CTR / pos 66.63 / 10 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 13 | `texturb.com` | `title_handoff` | T3 | 776 impr / 2.45% CTR / pos 8.41 / 304 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 14 | `nexttech7.com` | `title_handoff` | T3 | 823 impr / 1.94% CTR / pos 12.92 / 178 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 15 | `today2424.kr` | `content_handoff` | T3 | 902 impr / 3.99% CTR / pos 9.34 / 92 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 16 | `homeimer.com` | `content_handoff` | T3 | 909 impr / 0.00% CTR / pos 66.63 / 10 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 17 | `legalser.com` | `technical_seo` | T2 | 637 impr / 0.31% CTR / pos 59.60 / 17 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 18 | `legalser.com` | `content_handoff` | T3 | 637 impr / 0.31% CTR / pos 59.60 / 17 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 19 | `healfood.kr` | `title_handoff` | T3 | 498 impr / 0.80% CTR / pos 8.86 / 29 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |

## Stop Conditions

- Do not submit AdSense review while console state is unknown or raw loader proof is missing.
- Do not treat local collector timeout as proof of site-level AdSense breakage.
- Do not edit article titles or bodies from this technical plan; route those to title/content handoff.
- Do not use this plan as fresh prioritization if pnpm stats:update has not completed cleanly.
- Do not run sitemap submission, production deployment, or WordPress mutations from this plan without an explicit apply step and rollback path.
