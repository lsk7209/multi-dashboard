# Fleet Optimization Plan - 2026-07-06T23:20:23.084Z

## Verdict

This is a local, non-mutating plan for AdSense approval optimization and Google search growth work. It does not submit AdSense reviews, edit production WordPress/Next.js sites, submit sitemaps, deploy, or rewrite article content.

## Dashboard Evidence

- Snapshot: `2026-07-06T23:20:23.084Z`
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
| 1 | `tennisfrens.com` | `title_handoff` | T3 | 7841 impr / 1.40% CTR / pos 10.57 / 1521 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 2 | `cartain.kr` | `title_handoff` | T3 | 2229 impr / 1.75% CTR / pos 10.08 / 932 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 3 | `estat.kr` | `title_handoff` | T3 | 2393 impr / 0.63% CTR / pos 7.95 / 63 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 4 | `estat.kr` | `content_handoff` | T3 | 2393 impr / 0.63% CTR / pos 7.95 / 63 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 5 | `gong365.kr` | `title_handoff` | T3 | 1580 impr / 1.20% CTR / pos 8.18 / 56 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 6 | `dogswhere.com` | `title_handoff` | T3 | 832 impr / 1.80% CTR / pos 13.02 / 1396 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 7 | `gong365.kr` | `content_handoff` | T3 | 1580 impr / 1.20% CTR / pos 8.18 / 56 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 8 | `homeimer.com` | `technical_seo` | T2 | 1149 impr / 0.00% CTR / pos 66.73 / 7 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 9 | `petinsuer.com` | `title_handoff` | T3 | 1180 impr / 1.44% CTR / pos 9.86 / 87 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 10 | `fastjob.kr` | `title_handoff` | T3 | 849 impr / 1.41% CTR / pos 14.94 / 683 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 11 | `petinsuer.com` | `content_handoff` | T3 | 1180 impr / 1.44% CTR / pos 9.86 / 87 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 12 | `ehon365.kr` | `title_handoff` | T3 | 736 impr / 1.90% CTR / pos 14.26 / 661 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 13 | `homeimer.com` | `content_handoff` | T3 | 1149 impr / 0.00% CTR / pos 66.73 / 7 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 14 | `dogspang.kr` | `title_handoff` | T3 | 972 impr / 1.75% CTR / pos 10.02 / 88 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 15 | `dogspang.kr` | `content_handoff` | T3 | 972 impr / 1.75% CTR / pos 10.02 / 88 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 16 | `today2424.kr` | `content_handoff` | T3 | 726 impr / 3.44% CTR / pos 9.56 / 91 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 17 | `legalser.com` | `technical_seo` | T2 | 549 impr / 0.18% CTR / pos 68.06 / 16 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 18 | `nexttech7.com` | `title_handoff` | T3 | 566 impr / 2.47% CTR / pos 10.81 / 58 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 19 | `nexttech7.com` | `content_handoff` | T3 | 566 impr / 2.47% CTR / pos 10.81 / 58 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 20 | `legalser.com` | `content_handoff` | T3 | 549 impr / 0.18% CTR / pos 68.06 / 16 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |

## Stop Conditions

- Do not submit AdSense review while console state is unknown or raw loader proof is missing.
- Do not treat local collector timeout as proof of site-level AdSense breakage.
- Do not edit article titles or bodies from this technical plan; route those to title/content handoff.
- Do not use this plan as fresh prioritization if pnpm stats:update has not completed cleanly.
- Do not run sitemap submission, production deployment, or WordPress mutations from this plan without an explicit apply step and rollback path.
