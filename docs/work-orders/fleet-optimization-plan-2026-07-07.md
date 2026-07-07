# Fleet Optimization Plan - 2026-07-07T10:59:39.378Z

## Verdict

This is a local, non-mutating plan for AdSense approval optimization and Google search growth work. It does not submit AdSense reviews, edit production WordPress/Next.js sites, submit sitemaps, deploy, or rewrite article content.

## Dashboard Evidence

- Snapshot: `2026-07-07T10:59:39.378Z`
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
| Indexing | 0 |
| Technical SEO | 2 |
| Content handoff | 8 |

## AdSense Approval Queue

Source: `data\adsense-remediation-queue-2026-07-07.json`

| Priority | Site | Lane | Action | Stop condition |
|---:|---|---|---|---|


## Google Search / Content Queue

| Rank | Site | Action | Tier | Evidence | Next action |
|---:|---|---|---|---|---|
| 1 | `tennisfrens.com` | `title_handoff` | T3 | 8378 impr / 1.36% CTR / pos 10.49 / 1524 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 2 | `cartain.kr` | `title_handoff` | T3 | 2611 impr / 1.57% CTR / pos 9.85 / 932 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 3 | `estat.kr` | `title_handoff` | T3 | 2509 impr / 0.68% CTR / pos 7.97 / 63 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 4 | `estat.kr` | `content_handoff` | T3 | 2509 impr / 0.68% CTR / pos 7.97 / 63 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 5 | `gong365.kr` | `title_handoff` | T3 | 1883 impr / 1.27% CTR / pos 8.29 / 56 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 6 | `gong365.kr` | `content_handoff` | T3 | 1883 impr / 1.27% CTR / pos 8.29 / 56 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 7 | `dogswhere.com` | `title_handoff` | T3 | 883 impr / 1.70% CTR / pos 13.08 / 1398 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 8 | `petinsuer.com` | `title_handoff` | T3 | 1238 impr / 1.45% CTR / pos 9.82 / 87 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 9 | `homeimer.com` | `technical_seo` | T2 | 1151 impr / 0.00% CTR / pos 66.76 / 10 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 10 | `fastjob.kr` | `title_handoff` | T3 | 883 impr / 1.59% CTR / pos 14.76 / 684 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 11 | `petinsuer.com` | `content_handoff` | T3 | 1238 impr / 1.45% CTR / pos 9.82 / 87 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 12 | `ehon365.kr` | `title_handoff` | T3 | 783 impr / 2.17% CTR / pos 14.22 / 661 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 13 | `dogspang.kr` | `title_handoff` | T3 | 1022 impr / 1.66% CTR / pos 9.95 / 90 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 14 | `homeimer.com` | `content_handoff` | T3 | 1151 impr / 0.00% CTR / pos 66.76 / 10 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 15 | `dogspang.kr` | `content_handoff` | T3 | 1022 impr / 1.66% CTR / pos 9.95 / 90 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 16 | `today2424.kr` | `content_handoff` | T3 | 784 impr / 3.44% CTR / pos 9.51 / 91 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 17 | `nexttech7.com` | `title_handoff` | T3 | 615 impr / 2.28% CTR / pos 12.03 / 58 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 18 | `legalser.com` | `technical_seo` | T2 | 561 impr / 0.18% CTR / pos 66.94 / 17 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 19 | `nexttech7.com` | `content_handoff` | T3 | 615 impr / 2.28% CTR / pos 12.03 / 58 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 20 | `legalser.com` | `content_handoff` | T3 | 561 impr / 0.18% CTR / pos 66.94 / 17 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |

## Stop Conditions

- Do not submit AdSense review while console state is unknown or raw loader proof is missing.
- Do not treat local collector timeout as proof of site-level AdSense breakage.
- Do not edit article titles or bodies from this technical plan; route those to title/content handoff.
- Do not use this plan as fresh prioritization if pnpm stats:update has not completed cleanly.
- Do not run sitemap submission, production deployment, or WordPress mutations from this plan without an explicit apply step and rollback path.
