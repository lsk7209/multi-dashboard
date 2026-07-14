# FILEMAP

## Existing Files

| File | Role | Notes |
|---|---|---|
| `scripts/setup/update-ga4-stats.ts` | 98-site first-party telemetry collector | Preserves per-site GA4/GSC/monetization state and records phase-specific failures. |
| `scripts/setup/update-ops-intel.ts` | Direct operational finding generator | Coalesces collector timeout evidence into one actionable finding. |
| `scripts/setup/update-ops-triage.ts` | Ranked direct-ops queue | Must match current ops-intel output. |
| `data/site-stats.json` | Fresh snapshot source of truth | Current fleet telemetry and per-site SEO/monetization evidence. |
| `data/ops-intel.json` / `data/ops-triage.json` | Direct finding artifacts | Must be regenerated with the same snapshot. |
| `scripts/setup/audit-vercel-api-data-sites.ts` | Read-only API-data inventory | Runs from committed source; freshness checker is currently missing. |
| `docs/HANDOFF.md`, `docs/STATUS.md` | Durable project continuity | Updated before task completion. |

## New Files

| File | Role | Notes |
|---|---|---|
| `scripts/setup/update-ga4-stats.test.ts` | Collector regression coverage | Covers content-timeout state preservation. |
| `docs/work-orders/fleet-growth-adsense-2026-07-14.md` | Read-only fleet optimization queue | Evidence-linked recommendations and remaining gates. |
