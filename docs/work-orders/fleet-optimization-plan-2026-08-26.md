# Fleet Optimization Plan - 2026-08-26T12:47:22.978Z

## Verdict

This is a local, non-mutating plan for AdSense approval optimization and Google search growth work. It does not submit AdSense reviews, edit production WordPress/Next.js sites, submit sitemaps, deploy, or rewrite article content.

## Dashboard Evidence

- Snapshot: `2026-08-26T12:47:22.978Z`
- Stats path: `D:\web\multi-dashboard\data\site-stats.json`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `skipped_refresh_failed:gsc:auth_error:3`, `skipped_refresh_failed:adsense:api_error:3`, `skipped_refresh_failed:adsense_collector:transient_error:24`, `skipped_refresh_failed:ads_txt:api_error:1`, `skipped_refresh_failed:ads_txt_collector:transient_error:18`

## Connector Status

| Connector | Status | Count |
|---|---|---:|
| `ga4Status` | `ok` | 113 |
| `gscStatus` | `auth_error` | 3 |
| `gscStatus` | `ok` | 110 |
| `adsenseStatus` | `api_error` | 3 |
| `adsenseStatus` | `disabled` | 8 |
| `adsenseStatus` | `launch_hold` | 1 |
| `adsenseStatus` | `ok` | 101 |
| `adsenseCollectorStatus` | `disabled` | 8 |
| `adsenseCollectorStatus` | `ok` | 81 |
| `adsenseCollectorStatus` | `transient_error` | 24 |
| `adsTxtStatus` | `api_error` | 1 |
| `adsTxtStatus` | `disabled` | 8 |
| `adsTxtStatus` | `ok` | 104 |
| `adsTxtCollectorStatus` | `disabled` | 8 |
| `adsTxtCollectorStatus` | `ok` | 87 |
| `adsTxtCollectorStatus` | `transient_error` | 18 |

## Summary

| Metric | Count |
|---|---:|
| Sites | 113 |
| AdSense problem rows | 6 |
| SEO candidates | 20 |
| Title handoff | 7 |
| Indexing | 4 |
| Technical SEO | 2 |
| Content handoff | 7 |

## AdSense Approval Queue

Source: `data\adsense-remediation-queue-2026-08-26.json`

| Priority | Site | Lane | Action | Stop condition |
|---:|---|---|---|---|
| 999581 | `shotsetup.com` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999711 | `pethomepick.com` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999900 | `jasamall.sellerpit.kr` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999922 | `kdramanote.com` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999941 | `petcostlab.com` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999965 | `ezfunnel.kr` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |

## Google Search / Content Queue

| Rank | Site | Action | Tier | Evidence | Next action |
|---:|---|---|---|---|---|
| 1 | `tennisfrens.com` | `title_handoff` | T3 | 12085 impr / 1.07% CTR / pos 11.09 / 1475 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 2 | `estat.kr` | `title_handoff` | T3 | 11831 impr / 0.58% CTR / pos 7.68 / 94 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 3 | `estat.kr` | `content_handoff` | T3 | 11831 impr / 0.58% CTR / pos 7.68 / 94 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 4 | `sorimate.com` | `title_handoff` | T3 | 4950 impr / 0.30% CTR / pos 13.97 / 343 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 5 | `petinsuer.com` | `title_handoff` | T3 | 1719 impr / 1.75% CTR / pos 9.21 / 258 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 6 | `legalser.com` | `technical_seo` | T2 | 1035 impr / 0.58% CTR / pos 32.03 / 59 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 7 | `nexttech7.com` | `indexing` | T2 | 901 impr / 3.11% CTR / pos 14.84 / 82 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 8 | `legalser.com` | `content_handoff` | T3 | 1035 impr / 0.58% CTR / pos 32.03 / 59 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 9 | `seniorlivingnote.com` | `content_handoff` | T3 | 929 impr / 3.01% CTR / pos 8.15 / 82 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 10 | `patentgogo.com` | `title_handoff` | T3 | 779 impr / 0.51% CTR / pos 10.36 / 28 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 11 | `patentgogo.com` | `content_handoff` | T3 | 779 impr / 0.51% CTR / pos 10.36 / 28 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 12 | `gradienttrail.com` | `technical_seo` | T2 | 531 impr / 1.13% CTR / pos 22.79 / 63 users | Run per-site technical SEO audit for sitemap, canonical, schema, robots, feed, and indexability. |
| 13 | `travelpang.kr` | `content_handoff` | T3 | 609 impr / 2.96% CTR / pos 11.71 / 53 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 14 | `wedfairguide.com` | `title_handoff` | T3 | 489 impr / 1.43% CTR / pos 11.42 / 97 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 15 | `trave.kr` | `title_handoff` | T3 | 511 impr / 2.15% CTR / pos 6.89 / 42 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 16 | `gradienttrail.com` | `content_handoff` | T3 | 531 impr / 1.13% CTR / pos 22.79 / 63 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 17 | `trave.kr` | `content_handoff` | T3 | 511 impr / 2.15% CTR / pos 6.89 / 42 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 18 | `pethomepick.com` | `indexing` | T2 | 195 impr / 3.59% CTR / pos 8.68 / 47 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 19 | `lim01.soonsaak.co.kr` | `indexing` | T2 | 0 impr / 0.00% CTR / pos 0.00 / 252 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 20 | `discparty.com` | `indexing` | T2 | 79 impr / 5.06% CTR / pos 8.77 / 82 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |

## Stop Conditions

- Do not submit AdSense review while console state is unknown or raw loader proof is missing.
- Do not treat local collector timeout as proof of site-level AdSense breakage.
- Do not edit article titles or bodies from this technical plan; route those to title/content handoff.
- Do not use this plan as fresh prioritization if pnpm stats:update has not completed cleanly.
- Do not run sitemap submission, production deployment, or WordPress mutations from this plan without an explicit apply step and rollback path.
