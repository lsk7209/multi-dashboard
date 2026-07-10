# Fleet Optimization Plan - 2026-07-10T08:51:36.848Z

## Verdict

This is a local, non-mutating plan for AdSense approval optimization and Google search growth work. It does not submit AdSense reviews, edit production WordPress/Next.js sites, submit sitemaps, deploy, or rewrite article content.

## Dashboard Evidence

- Snapshot: `2026-07-10T08:51:36.848Z`
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
| SEO candidates | 20 |
| Title handoff | 10 |
| Indexing | 1 |
| Technical SEO | 2 |
| Content handoff | 7 |

## AdSense Approval Queue

Source: `data\adsense-remediation-queue-2026-07-10.json`

| Priority | Site | Lane | Action | Stop condition |
|---:|---|---|---|---|


## Google Search / Content Queue

| Rank | Site | Action | Tier | Evidence | Next action |
|---:|---|---|---|---|---|
| 1 | `tennisfrens.com` | `title_handoff` | T3 | 11684 impr / 0.98% CTR / pos 10.01 / 1439 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 2 | `cartain.kr` | `title_handoff` | T3 | 3621 impr / 1.77% CTR / pos 9.43 / 979 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 3 | `gong365.kr` | `title_handoff` | T3 | 2732 impr / 1.17% CTR / pos 8.14 / 77 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 4 | `estat.kr` | `title_handoff` | T3 | 2686 impr / 0.52% CTR / pos 7.92 / 42 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 5 | `gong365.kr` | `content_handoff` | T3 | 2732 impr / 1.17% CTR / pos 8.14 / 77 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 6 | `estat.kr` | `content_handoff` | T3 | 2686 impr / 0.52% CTR / pos 7.92 / 42 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 7 | `dogswhere.com` | `title_handoff` | T3 | 985 impr / 1.93% CTR / pos 13.27 / 1384 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 8 | `petinsuer.com` | `title_handoff` | T3 | 1288 impr / 1.40% CTR / pos 9.62 / 96 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 9 | `petinsuer.com` | `content_handoff` | T3 | 1288 impr / 1.40% CTR / pos 9.62 / 96 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 10 | `dogspang.kr` | `title_handoff` | T3 | 1084 impr / 1.66% CTR / pos 10.01 / 87 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 11 | `homeimer.com` | `technical_seo` | T2 | 1005 impr / 0.00% CTR / pos 66.74 / 10 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 12 | `ehon365.kr` | `title_handoff` | T3 | 769 impr / 2.47% CTR / pos 14.41 / 650 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 13 | `dogspang.kr` | `content_handoff` | T3 | 1084 impr / 1.66% CTR / pos 10.01 / 87 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 14 | `homeimer.com` | `content_handoff` | T3 | 1005 impr / 0.00% CTR / pos 66.74 / 10 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 15 | `today2424.kr` | `content_handoff` | T3 | 906 impr / 3.86% CTR / pos 9.41 / 94 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 16 | `nexttech7.com` | `title_handoff` | T3 | 794 impr / 2.02% CTR / pos 12.63 / 133 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 17 | `legalser.com` | `technical_seo` | T2 | 619 impr / 0.32% CTR / pos 61.77 / 18 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 18 | `legalser.com` | `content_handoff` | T3 | 619 impr / 0.32% CTR / pos 61.77 / 18 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 19 | `healfood.kr` | `title_handoff` | T3 | 493 impr / 0.81% CTR / pos 8.85 / 29 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 20 | `ezfunnel.kr` | `indexing` | T2 | 63 impr / 1.59% CTR / pos 11.33 / 42 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |

## Stop Conditions

- Do not submit AdSense review while console state is unknown or raw loader proof is missing.
- Do not treat local collector timeout as proof of site-level AdSense breakage.
- Do not edit article titles or bodies from this technical plan; route those to title/content handoff.
- Do not use this plan as fresh prioritization if pnpm stats:update has not completed cleanly.
- Do not run sitemap submission, production deployment, or WordPress mutations from this plan without an explicit apply step and rollback path.
