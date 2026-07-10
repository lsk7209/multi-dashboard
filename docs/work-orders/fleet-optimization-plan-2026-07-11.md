# Fleet Optimization Plan - 2026-07-10T23:13:31.297Z

## Verdict

This is a local, non-mutating plan for AdSense approval optimization and Google search growth work. It does not submit AdSense reviews, edit production WordPress/Next.js sites, submit sitemaps, deploy, or rewrite article content.

## Dashboard Evidence

- Snapshot: `2026-07-10T23:13:31.297Z`
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
| Title handoff | 9 |
| Indexing | 3 |
| Technical SEO | 2 |
| Content handoff | 6 |

## AdSense Approval Queue

Source: `data\adsense-remediation-queue-2026-07-11.json`

| Priority | Site | Lane | Action | Stop condition |
|---:|---|---|---|---|


## Google Search / Content Queue

| Rank | Site | Action | Tier | Evidence | Next action |
|---:|---|---|---|---|---|
| 1 | `tennisfrens.com` | `title_handoff` | T3 | 11516 impr / 0.96% CTR / pos 10.02 / 1463 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 2 | `cartain.kr` | `title_handoff` | T3 | 3538 impr / 1.75% CTR / pos 9.42 / 1004 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 3 | `gong365.kr` | `title_handoff` | T3 | 2702 impr / 1.18% CTR / pos 8.15 / 79 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 4 | `estat.kr` | `title_handoff` | T3 | 2616 impr / 0.50% CTR / pos 7.92 / 40 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 5 | `gong365.kr` | `content_handoff` | T3 | 2702 impr / 1.18% CTR / pos 8.15 / 79 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 6 | `estat.kr` | `content_handoff` | T3 | 2616 impr / 0.50% CTR / pos 7.92 / 40 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 7 | `dogswhere.com` | `title_handoff` | T3 | 964 impr / 1.87% CTR / pos 13.24 / 1391 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 8 | `petinsuer.com` | `title_handoff` | T3 | 1255 impr / 1.35% CTR / pos 9.61 / 101 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 9 | `dogspang.kr` | `title_handoff` | T3 | 1052 impr / 1.71% CTR / pos 9.99 / 88 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 10 | `homeimer.com` | `technical_seo` | T2 | 951 impr / 0.00% CTR / pos 66.67 / 10 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 11 | `dogspang.kr` | `content_handoff` | T3 | 1052 impr / 1.71% CTR / pos 9.99 / 88 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 12 | `nexttech7.com` | `title_handoff` | T3 | 789 impr / 1.90% CTR / pos 12.62 / 164 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 13 | `homeimer.com` | `content_handoff` | T3 | 951 impr / 0.00% CTR / pos 66.67 / 10 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 14 | `today2424.kr` | `content_handoff` | T3 | 888 impr / 3.83% CTR / pos 9.43 / 93 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 15 | `legalser.com` | `technical_seo` | T2 | 610 impr / 0.33% CTR / pos 61.80 / 18 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 16 | `legalser.com` | `content_handoff` | T3 | 610 impr / 0.33% CTR / pos 61.80 / 18 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 17 | `healfood.kr` | `title_handoff` | T3 | 493 impr / 0.81% CTR / pos 8.85 / 29 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 18 | `ezfunnel.kr` | `indexing` | T2 | 63 impr / 1.59% CTR / pos 11.33 / 42 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 19 | `nicewomen.kr` | `indexing` | T2 | 13 impr / 0.00% CTR / pos 5.92 / 71 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 20 | `autorentlab.com` | `indexing` | T2 | 3 impr / 0.00% CTR / pos 7.33 / 61 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |

## Stop Conditions

- Do not submit AdSense review while console state is unknown or raw loader proof is missing.
- Do not treat local collector timeout as proof of site-level AdSense breakage.
- Do not edit article titles or bodies from this technical plan; route those to title/content handoff.
- Do not use this plan as fresh prioritization if pnpm stats:update has not completed cleanly.
- Do not run sitemap submission, production deployment, or WordPress mutations from this plan without an explicit apply step and rollback path.
