# AdSense Remediation Queue - 2026-10-27T09:46:41.440Z

- Collector snapshot: `data/site-stats.json generatedAt=2026-10-27T09:45:07.000Z`
- Production mutation: `false`
- AdSense console checked: `false`

## Summary

| Metric | Count |
|---|---:|
| Total rows | 122 |
| Reviewed rows | 82 |
| AdSense OK rows | 66 |
| Problem rows | 21 |
| Ordinary AdSense proof | 13 |
| Approved-root/subdomain scope | 0 |
| GSC auth telemetry | 8 |
| GA4 config telemetry | 0 |

## Queue

### ordinary_adsense_proof

| Priority | Site | Host | Stop condition |
|---:|---|---|---|
| 997391 | `seniorlivingnote` | seniorlivingnote.com | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999775 | `insupang` | insupang.com | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999836 | `luxurytraver-2` | luxurytraver.com | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999954 | `toolnavigo` | toolnavigo.com | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999968 | `cartain-2` | cartain.kr | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999972 | `knewstory` | knewstory.kr | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999992 | `hos-dogspang` | hos.dogspang.kr | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999994 | `educaer` | educaer.com | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999995 | `workgogo` | workgogo.kr | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999996 | `travel-dogspang` | travel.dogspang.kr | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999997 | `kapti` | kapti.kr | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 1000000 | `finance-2mlab` | finance.2mlab.kr | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 1000000 | `food-2mlab` | food.2mlab.kr | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |

### approved_root_subdomain_scope

- none

### gsc_auth_telemetry

| Priority | Site | Host | Stop condition |
|---:|---|---|---|
| 2999950 | `coinyo-alt` | alt.coinyo.kr | Rerun pnpm stats:update and confirm gscStatus=ok for this site. |
| 2999954 | `toolnavigo` | toolnavigo.com | Rerun pnpm stats:update and confirm gscStatus=ok for this site. |
| 2999958 | `coinyo-bit` | bit.coinyo.kr | Rerun pnpm stats:update and confirm gscStatus=ok for this site. |
| 2999988 | `dog-nekau` | dog.nekau.com | Rerun pnpm stats:update and confirm gscStatus=ok for this site. |
| 2999992 | `hos-dogspang` | hos.dogspang.kr | Rerun pnpm stats:update and confirm gscStatus=ok for this site. |
| 2999996 | `travel-dogspang` | travel.dogspang.kr | Rerun pnpm stats:update and confirm gscStatus=ok for this site. |
| 3000000 | `finance-2mlab` | finance.2mlab.kr | Rerun pnpm stats:update and confirm gscStatus=ok for this site. |
| 3000000 | `food-2mlab` | food.2mlab.kr | Rerun pnpm stats:update and confirm gscStatus=ok for this site. |

### ga4_config_telemetry

- none
