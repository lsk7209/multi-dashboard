# AdSense Remediation Queue - 2026-07-27T13:08:00.389Z

- Collector snapshot: `data/site-stats.json generatedAt=2026-07-27T13:07:27.938Z`
- Production mutation: `false`
- AdSense console checked: `false`

## Summary

| Metric | Count |
|---|---:|
| Total rows | 103 |
| Reviewed rows | 88 |
| AdSense OK rows | 87 |
| Problem rows | 1 |
| Ordinary AdSense proof | 1 |
| Approved-root/subdomain scope | 0 |
| GSC auth telemetry | 0 |
| GA4 config telemetry | 0 |

## Queue

### ordinary_adsense_proof

| Priority | Site | Host | Stop condition |
|---:|---|---|---|
| 999909 | `caregos` | caregos.com | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |

### approved_root_subdomain_scope

- none

### gsc_auth_telemetry

- none

### ga4_config_telemetry

- none
