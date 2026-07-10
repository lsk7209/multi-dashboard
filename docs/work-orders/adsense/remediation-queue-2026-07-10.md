# AdSense Remediation Queue - 2026-07-10T13:12:31.776Z

- Collector snapshot: `data/site-stats.json generatedAt=2026-07-10T13:09:12.180Z`
- Production mutation: `false`
- AdSense console checked: `false`

## Summary

| Metric | Count |
|---|---:|
| Total rows | 98 |
| Reviewed rows | 84 |
| AdSense OK rows | 83 |
| Problem rows | 1 |
| Ordinary AdSense proof | 0 |
| Approved-root/subdomain scope | 0 |
| GSC auth telemetry | 0 |
| GA4 config telemetry | 1 |

## Queue

### ordinary_adsense_proof

- none

### approved_root_subdomain_scope

- none

### gsc_auth_telemetry

- none

### ga4_config_telemetry

| Priority | Site | Host | Stop condition |
|---:|---|---|---|
| 3999991 | `runmania` | runmania.kr | Rerun pnpm stats:update and confirm ga4Status=ok for this site. |
