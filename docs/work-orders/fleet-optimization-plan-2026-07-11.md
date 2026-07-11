# Fleet Optimization Plan - 2026-07-11T07:54:16.328Z

## Verdict

This is a local, non-mutating plan for AdSense approval optimization and Google search growth work. It does not submit AdSense reviews, edit production WordPress/Next.js sites, submit sitemaps, deploy, or rewrite article content.

## Dashboard Evidence

- Snapshot: `2026-07-11T07:54:16.328Z`
- Stats path: `D:\web\multi-dashboard\data\site-stats.json`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `none`

## Connector Status

| Connector | Status | Count |
|---|---|---:|
| `ga4Status` | `ok` | 98 |
| `gscStatus` | `ok` | 98 |
| `adsenseStatus` | `disabled` | 3 |
| `adsenseStatus` | `ok` | 95 |
| `adsenseCollectorStatus` | `disabled` | 3 |
| `adsenseCollectorStatus` | `ok` | 95 |
| `adsTxtStatus` | `disabled` | 3 |
| `adsTxtStatus` | `ok` | 95 |
| `adsTxtCollectorStatus` | `disabled` | 3 |
| `adsTxtCollectorStatus` | `ok` | 95 |

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

Source: `data\adsense-remediation-queue-2026-07-11.json`

| Priority | Site | Lane | Action | Stop condition |
|---:|---|---|---|---|


## Google Search / Content Queue

| Rank | Site | Action | Tier | Evidence | Next action |
|---:|---|---|---|---|---|
| 1 | `tennisfrens.com` | `title_handoff` | T3 | 13978 impr / 0.82% CTR / pos 9.70 / 1463 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 2 | `cartain.kr` | `title_handoff` | T3 | 3833 impr / 1.85% CTR / pos 9.43 / 1004 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 3 | `gong365.kr` | `title_handoff` | T3 | 2947 impr / 1.19% CTR / pos 8.08 / 79 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 4 | `estat.kr` | `title_handoff` | T3 | 2734 impr / 0.48% CTR / pos 7.89 / 40 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 5 | `gong365.kr` | `content_handoff` | T3 | 2947 impr / 1.19% CTR / pos 8.08 / 79 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 6 | `estat.kr` | `content_handoff` | T3 | 2734 impr / 0.48% CTR / pos 7.89 / 40 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 7 | `dogswhere.com` | `title_handoff` | T3 | 1013 impr / 1.88% CTR / pos 13.21 / 1391 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 8 | `petinsuer.com` | `title_handoff` | T3 | 1331 impr / 1.43% CTR / pos 9.55 / 101 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 9 | `dogspang.kr` | `title_handoff` | T3 | 1109 impr / 1.71% CTR / pos 9.94 / 86 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 10 | `dogspang.kr` | `content_handoff` | T3 | 1109 impr / 1.71% CTR / pos 9.94 / 86 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 11 | `homeimer.com` | `technical_seo` | T2 | 952 impr / 0.00% CTR / pos 66.65 / 10 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 12 | `nexttech7.com` | `title_handoff` | T3 | 834 impr / 1.92% CTR / pos 12.86 / 164 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 13 | `today2424.kr` | `content_handoff` | T3 | 931 impr / 3.97% CTR / pos 9.34 / 93 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 14 | `homeimer.com` | `content_handoff` | T3 | 952 impr / 0.00% CTR / pos 66.65 / 10 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 15 | `legalser.com` | `technical_seo` | T2 | 642 impr / 0.31% CTR / pos 59.75 / 17 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 16 | `legalser.com` | `content_handoff` | T3 | 642 impr / 0.31% CTR / pos 59.75 / 17 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 17 | `healfood.kr` | `title_handoff` | T3 | 500 impr / 0.80% CTR / pos 8.86 / 29 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 18 | `healfood.kr` | `content_handoff` | T3 | 500 impr / 0.80% CTR / pos 8.86 / 29 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |

## Stop Conditions

- Do not submit AdSense review while console state is unknown or raw loader proof is missing.
- Do not treat local collector timeout as proof of site-level AdSense breakage.
- Do not edit article titles or bodies from this technical plan; route those to title/content handoff.
- Do not use this plan as fresh prioritization if pnpm stats:update has not completed cleanly.
- Do not run sitemap submission, production deployment, or WordPress mutations from this plan without an explicit apply step and rollback path.
