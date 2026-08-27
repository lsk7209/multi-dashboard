# Fleet Optimization Plan - 2026-08-27T01:29:24.500Z

## Verdict

This is a local, non-mutating plan for AdSense approval optimization and Google search growth work. It does not submit AdSense reviews, edit production WordPress/Next.js sites, submit sitemaps, deploy, or rewrite article content.

## Dashboard Evidence

- Snapshot: `2026-08-27T01:29:24.500Z`
- Stats path: `D:\web\multi-dashboard\data\site-stats.json`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `skipped_refresh_failed:adsense:api_error:2`, `skipped_refresh_failed:adsense_collector:transient_error:26`, `skipped_refresh_failed:ads_txt_collector:transient_error:16`

## Connector Status

| Connector | Status | Count |
|---|---|---:|
| `ga4Status` | `ok` | 112 |
| `gscStatus` | `ok` | 112 |
| `adsenseStatus` | `api_error` | 2 |
| `adsenseStatus` | `disabled` | 8 |
| `adsenseStatus` | `launch_hold` | 1 |
| `adsenseStatus` | `ok` | 101 |
| `adsenseCollectorStatus` | `disabled` | 8 |
| `adsenseCollectorStatus` | `ok` | 78 |
| `adsenseCollectorStatus` | `transient_error` | 26 |
| `adsTxtStatus` | `disabled` | 8 |
| `adsTxtStatus` | `ok` | 104 |
| `adsTxtCollectorStatus` | `disabled` | 8 |
| `adsTxtCollectorStatus` | `ok` | 88 |
| `adsTxtCollectorStatus` | `transient_error` | 16 |

## Summary

| Metric | Count |
|---|---:|
| Sites | 112 |
| AdSense problem rows | 9 |
| SEO candidates | 20 |
| Title handoff | 8 |
| Indexing | 3 |
| Technical SEO | 2 |
| Content handoff | 7 |

## AdSense Approval Queue

Source: `data\adsense-remediation-queue-2026-08-27.json`

| Priority | Site | Lane | Action | Stop condition |
|---:|---|---|---|---|
| 999596 | `shotsetup.com` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999673 | `autopickgo.com` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999724 | `pethomepick.com` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999758 | `discparty.com` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999906 | `jasamall.sellerpit.kr` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999925 | `kdramanote.com` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999943 | `petcostlab.com` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999960 | `nicewomen.kr` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999969 | `ezfunnel.kr` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |

## Google Search / Content Queue

| Rank | Site | Action | Tier | Evidence | Next action |
|---:|---|---|---|---|---|
| 1 | `tennisfrens.com` | `title_handoff` | T3 | 11821 impr / 1.05% CTR / pos 11.10 / 1511 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 2 | `estat.kr` | `title_handoff` | T3 | 11658 impr / 0.57% CTR / pos 7.69 / 96 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 3 | `estat.kr` | `content_handoff` | T3 | 11658 impr / 0.57% CTR / pos 7.69 / 96 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 4 | `sorimate.com` | `title_handoff` | T3 | 4926 impr / 0.30% CTR / pos 13.96 / 344 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 5 | `dogswhere.com` | `title_handoff` | T3 | 1558 impr / 2.44% CTR / pos 10.21 / 2825 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 6 | `petinsuer.com` | `title_handoff` | T3 | 1662 impr / 1.74% CTR / pos 9.23 / 258 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 7 | `legalser.com` | `technical_seo` | T2 | 998 impr / 0.60% CTR / pos 32.27 / 59 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 8 | `nexttech7.com` | `indexing` | T2 | 827 impr / 3.26% CTR / pos 15.04 / 82 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 9 | `legalser.com` | `content_handoff` | T3 | 998 impr / 0.60% CTR / pos 32.27 / 59 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 10 | `seniorlivingnote.com` | `content_handoff` | T3 | 927 impr / 3.02% CTR / pos 8.16 / 89 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 11 | `patentgogo.com` | `title_handoff` | T3 | 748 impr / 0.53% CTR / pos 10.36 / 32 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 12 | `patentgogo.com` | `content_handoff` | T3 | 748 impr / 0.53% CTR / pos 10.36 / 32 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 13 | `gradienttrail.com` | `technical_seo` | T2 | 516 impr / 1.16% CTR / pos 22.98 / 60 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 14 | `travelpang.kr` | `content_handoff` | T3 | 596 impr / 3.02% CTR / pos 11.77 / 53 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 15 | `trave.kr` | `title_handoff` | T3 | 509 impr / 2.16% CTR / pos 6.88 / 42 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 16 | `wedfairguide.com` | `title_handoff` | T3 | 471 impr / 1.49% CTR / pos 11.30 / 101 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 17 | `gradienttrail.com` | `content_handoff` | T3 | 516 impr / 1.16% CTR / pos 22.98 / 60 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 18 | `trave.kr` | `content_handoff` | T3 | 509 impr / 2.16% CTR / pos 6.88 / 42 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 19 | `pethomepick.com` | `indexing` | T2 | 186 impr / 3.76% CTR / pos 8.67 / 45 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 20 | `discparty.com` | `indexing` | T2 | 78 impr / 5.13% CTR / pos 8.79 / 82 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |

## Stop Conditions

- Do not submit AdSense review while console state is unknown or raw loader proof is missing.
- Do not treat local collector timeout as proof of site-level AdSense breakage.
- Do not edit article titles or bodies from this technical plan; route those to title/content handoff.
- Do not use this plan as fresh prioritization if pnpm stats:update has not completed cleanly.
- Do not run sitemap submission, production deployment, or WordPress mutations from this plan without an explicit apply step and rollback path.
