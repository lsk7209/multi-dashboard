# AdSense Remediation Queue - 2026-07-30T12:29:03.766Z

- Collector snapshot: `data/site-stats.json generatedAt=2026-07-30T12:28:53.528Z`
- Production mutation: `false`
- AdSense console checked: `false`

## Summary

| Metric | Count |
|---|---:|
| Total rows | 104 |
| Reviewed rows | 89 |
| AdSense OK rows | 88 |
| Problem rows | 1 |
| Ordinary AdSense proof | 1 |
| Approved-root/subdomain scope | 0 |
| GSC auth telemetry | 0 |
| GA4 config telemetry | 0 |

## Queue

### ordinary_adsense_proof

| Priority | Site | Host | Stop condition |
|---:|---|---|---|
| 999990 | `mohana` | mohana.kr | Rerun pnpm stats:update and confirm AdSense and ads.txt statuses are ok. |

### approved_root_subdomain_scope

- none

### gsc_auth_telemetry

- none

### ga4_config_telemetry

- none
