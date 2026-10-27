# Fleet Optimization Plan - 2026-10-27T09:45:07.000Z

## Verdict

This is a local, non-mutating plan for AdSense approval optimization and Google search growth work. It does not submit AdSense reviews, edit production WordPress/Next.js sites, submit sitemaps, deploy, or rewrite article content.

## Dashboard Evidence

- Snapshot: `2026-10-27T09:45:07.000Z`
- Stats path: `D:\web\multi-dashboard\data\site-stats.json`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `skipped_refresh_failed:gsc:auth_error:17`, `skipped_refresh_failed:adsense:api_error:21`, `skipped_refresh_failed:adsense:missing_config:3`, `skipped_refresh_failed:adsense_collector:transient_error:21`, `skipped_refresh_failed:ads_txt:api_error:20`, `skipped_refresh_failed:ads_txt:missing_config:4`, `skipped_refresh_failed:ads_txt_collector:transient_error:20`

## Connector Status

| Connector | Status | Count |
|---|---|---:|
| `ga4Status` | `ok` | 119 |
| `gscStatus` | `auth_error` | 17 |
| `gscStatus` | `ok` | 102 |
| `adsenseStatus` | `api_error` | 21 |
| `adsenseStatus` | `disabled` | 9 |
| `adsenseStatus` | `launch_hold` | 1 |
| `adsenseStatus` | `missing_config` | 3 |
| `adsenseStatus` | `ok` | 85 |
| `adsenseCollectorStatus` | `disabled` | 9 |
| `adsenseCollectorStatus` | `ok` | 89 |
| `adsenseCollectorStatus` | `transient_error` | 21 |
| `adsTxtStatus` | `api_error` | 20 |
| `adsTxtStatus` | `disabled` | 9 |
| `adsTxtStatus` | `missing_config` | 4 |
| `adsTxtStatus` | `ok` | 86 |
| `adsTxtCollectorStatus` | `disabled` | 9 |
| `adsTxtCollectorStatus` | `ok` | 90 |
| `adsTxtCollectorStatus` | `transient_error` | 20 |

## Summary

| Metric | Count |
|---|---:|
| Sites | 119 |
| AdSense problem rows | 21 |
| SEO candidates | 20 |
| Title handoff | 4 |
| Indexing | 14 |
| Technical SEO | 0 |
| Content handoff | 2 |

## AdSense Approval Queue

Source: `data\adsense-remediation-queue-2026-10-27.json`

| Priority | Site | Lane | Action | Stop condition |
|---:|---|---|---|---|
| 997391 | `seniorlivingnote.com` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999775 | `insupang.com` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999836 | `luxurytraver.com` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999954 | `toolnavigo.com` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999968 | `cartain.kr` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999972 | `knewstory.kr` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999992 | `hos.dogspang.kr` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999994 | `educaer.com` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999995 | `workgogo.kr` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999996 | `travel.dogspang.kr` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999997 | `kapti.kr` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 1000000 | `finance.2mlab.kr` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 1000000 | `food.2mlab.kr` | `ordinary_adsense_proof` | `adsense_proof` | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 2999950 | `alt.coinyo.kr` | `gsc_auth_telemetry` | `telemetry` | Rerun pnpm stats:update and confirm gscStatus=ok for this site. |
| 2999954 | `toolnavigo.com` | `gsc_auth_telemetry` | `telemetry` | Rerun pnpm stats:update and confirm gscStatus=ok for this site. |
| 2999958 | `bit.coinyo.kr` | `gsc_auth_telemetry` | `telemetry` | Rerun pnpm stats:update and confirm gscStatus=ok for this site. |
| 2999988 | `dog.nekau.com` | `gsc_auth_telemetry` | `telemetry` | Rerun pnpm stats:update and confirm gscStatus=ok for this site. |
| 2999992 | `hos.dogspang.kr` | `gsc_auth_telemetry` | `telemetry` | Rerun pnpm stats:update and confirm gscStatus=ok for this site. |
| 2999996 | `travel.dogspang.kr` | `gsc_auth_telemetry` | `telemetry` | Rerun pnpm stats:update and confirm gscStatus=ok for this site. |
| 3000000 | `finance.2mlab.kr` | `gsc_auth_telemetry` | `telemetry` | Rerun pnpm stats:update and confirm gscStatus=ok for this site. |
| 3000000 | `food.2mlab.kr` | `gsc_auth_telemetry` | `telemetry` | Rerun pnpm stats:update and confirm gscStatus=ok for this site. |

## Google Search / Content Queue

| Rank | Site | Action | Tier | Evidence | Next action |
|---:|---|---|---|---|---|
| 1 | `yungyanggogo.kr` | `title_handoff` | T3 | 6807 impr / 0.84% CTR / pos 7.18 / 86 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 2 | `yungyanggogo.kr` | `content_handoff` | T3 | 6807 impr / 0.84% CTR / pos 7.18 / 86 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 3 | `sorimate.com` | `title_handoff` | T3 | 4439 impr / 0.61% CTR / pos 8.37 / 11 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 4 | `sorimate.com` | `content_handoff` | T3 | 4439 impr / 0.61% CTR / pos 8.37 / 11 users | Send to persona/content workflow for intent alignment, source quality, and helpful-content review. |
| 5 | `localgeo.app` | `indexing` | T2 | 2709 impr / 1.77% CTR / pos 8.80 / 999 users | Run URL Inspection plus spam-policy and site-quality review; check Manual Actions/Security Issues read-only when console access exists, and hold title/body edits, bulk publishing, sitemap submission, and indexing requests as recovery shortcuts. |
| 6 | `petinsuer.com` | `title_handoff` | T3 | 636 impr / 1.42% CTR / pos 8.72 / 148 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 7 | `patentgogo.com` | `title_handoff` | T3 | 302 impr / 0.00% CTR / pos 10.94 / 31 users | Send to title-master/title workflow with existing query/page evidence; do not edit titles in this technical plan. |
| 8 | `luckyday.kr` | `indexing` | T2 | 0 impr / 0.00% CTR / pos 0.00 / 468 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 9 | `luxurytraver.com` | `indexing` | T2 | 144 impr / 0.00% CTR / pos 15.03 / 10 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 10 | `insupang.com` | `indexing` | T2 | 117 impr / 3.42% CTR / pos 8.38 / 54 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 11 | `notebook.klick.kr` | `indexing` | T2 | 0 impr / 0.00% CTR / pos 0.00 / 77 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 12 | `ai.tasko.kr` | `indexing` | T2 | 0 impr / 0.00% CTR / pos 0.00 / 72 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 13 | `chatgipt.kr` | `indexing` | T2 | 21 impr / 0.00% CTR / pos 16.00 / 9 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 14 | `caregos.com` | `indexing` | T2 | 5 impr / 0.00% CTR / pos 1.00 / 19 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 15 | `alt.coinyo.kr` | `indexing` | T2 | 0 impr / 0.00% CTR / pos 0.00 / 25 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 16 | `toolnavigo.com` | `indexing` | T2 | 0 impr / 0.00% CTR / pos 0.00 / 23 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 17 | `knewstory.kr` | `indexing` | T2 | 6 impr / 0.00% CTR / pos 6.17 / 11 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 18 | `bit.coinyo.kr` | `indexing` | T2 | 0 impr / 0.00% CTR / pos 0.00 / 21 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 19 | `jeompolab.com` | `indexing` | T2 | 0 impr / 0.00% CTR / pos 0.00 / 20 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |
| 20 | `workgogo.kr` | `indexing` | T2 | 5 impr / 0.00% CTR / pos 8.40 / 0 users | Run sitemap/GSC dry-run verification first; patch only after a concrete sitemap, canonical, or access blocker is confirmed. |

## Stop Conditions

- Do not submit AdSense review while console state is unknown or raw loader proof is missing.
- Do not treat local collector timeout as proof of site-level AdSense breakage.
- Do not edit article titles or bodies from this technical plan; route those to title/content handoff.
- Do not use this plan as fresh prioritization if pnpm stats:update has not completed cleanly.
- Do not run sitemap submission, production deployment, or WordPress mutations from this plan without an explicit apply step and rollback path.
