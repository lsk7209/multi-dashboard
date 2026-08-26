# AdSense Remediation Queue - 2026-08-26T12:47:41.443Z

- Collector snapshot: `data/site-stats.json generatedAt=2026-08-26T12:47:22.978Z`
- Production mutation: `false`
- AdSense console checked: `false`

## Summary

| Metric | Count |
|---|---:|
| Total rows | 113 |
| Reviewed rows | 94 |
| AdSense OK rows | 88 |
| Problem rows | 6 |
| Ordinary AdSense proof | 6 |
| Approved-root/subdomain scope | 0 |
| GSC auth telemetry | 0 |
| GA4 config telemetry | 0 |

## Queue

### ordinary_adsense_proof

| Priority | Site | Host | Stop condition |
|---:|---|---|---|
| 999581 | `shotsetup` | shotsetup.com | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999711 | `pethomepick` | pethomepick.com | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999900 | `jasamall-sellerpit` | jasamall.sellerpit.kr | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999922 | `kdramanote` | kdramanote.com | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999941 | `petcostlab` | petcostlab.com | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |
| 999965 | `ezfunnel` | ezfunnel.kr | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |

### approved_root_subdomain_scope

- none

### gsc_auth_telemetry

- none

### ga4_config_telemetry

- none
