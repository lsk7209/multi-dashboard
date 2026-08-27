# AdSense Remediation Queue - 2026-08-27T01:30:20.311Z

- Collector snapshot: `data/site-stats.json generatedAt=2026-08-27T01:29:24.500Z`
- Production mutation: `false`
- AdSense console checked: `false`

## Summary

| Metric | Count |
|---|---:|
| Total rows | 112 |
| Reviewed rows | 94 |
| AdSense OK rows | 85 |
| Problem rows | 9 |
| Ordinary AdSense proof | 9 |
| Approved-root/subdomain scope | 0 |
| GSC auth telemetry | 0 |
| GA4 config telemetry | 0 |

## Queue

### ordinary_adsense_proof

| Priority | Site | Host | Stop condition |
|---:|---|---|---|
| 999596 | `shotsetup` | shotsetup.com | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999673 | `autopickgo` | autopickgo.com | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999724 | `pethomepick` | pethomepick.com | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999758 | `discparty` | discparty.com | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999906 | `jasamall-sellerpit` | jasamall.sellerpit.kr | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999925 | `kdramanote` | kdramanote.com | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999943 | `petcostlab` | petcostlab.com | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999960 | `nicewomen` | nicewomen.kr | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999969 | `ezfunnel` | ezfunnel.kr | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |

### approved_root_subdomain_scope

- none

### gsc_auth_telemetry

- none

### ga4_config_telemetry

- none
