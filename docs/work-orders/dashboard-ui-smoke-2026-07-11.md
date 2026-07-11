# Dashboard UI Smoke - 2026-07-11

This is a local browser-rendered smoke artifact. It does not mutate production or external systems.

## Summary

- URL: `http://127.0.0.1:3105/?actionabilityMode=local-evidence&actionabilityToken=redacted`
- Stats snapshot: `2026-07-11T07:54:16.328Z`
- Sites: 98
- Blocking sources: 0
- Maintenance sources: 0
- Blocker hosts: `none`
- Actionability: `safe_to_act`
- Checks: 9

## Refresh Sources

- Blocking: `none`
- Maintenance: `none`

## Actionability

- Status: `safe_to_act`
- Required command: `pnpm dashboard:post-recovery`
- Allowed use: Dashboard recommendations may be used as executable local work after standard verification.
- Reason: All dashboard readiness evidence is current and unblocked.

## Evidence Paths

- Fleet chain: `data/fleet-optimization-chain-2026-07-11.json`
- GSC audit: `data/gsc-permission-audit-2026-07-11.json`
- GSC work order: `docs/work-orders/gsc-permission-audit-2026-07-11.md`
- GSC handoff status: `resolved`

## Stop Condition

This rendered UI smoke is local and non-mutating. It opens the dashboard in a browser and records evidence only; it does not authorize CMS edits, Search Console mutation, AdSense mutation, publishing, DNS changes, or deployment.
