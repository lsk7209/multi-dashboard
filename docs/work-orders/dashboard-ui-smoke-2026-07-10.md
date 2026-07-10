# Dashboard UI Smoke - 2026-07-10

This is a local browser-rendered smoke artifact. It does not mutate production or external systems.

## Summary

- URL: `https://multi-dashboard-one.vercel.app/`
- Stats snapshot: `2026-07-10T11:33:59.439Z`
- Sites: 98
- Blocking sources: 1
- Maintenance sources: 0
- Blocker hosts: `none`
- Actionability: `blocked_for_action_until_post_recovery_verify`
- Checks: 11

## Refresh Sources

- Blocking: `skipped_refresh_failed:ga4:api_error:40`
- Maintenance: `none`

## Actionability

- Status: `blocked_for_action_until_post_recovery_verify`
- Required command: `pnpm dashboard:post-recovery`
- Allowed use: Read-only triage only. Do not execute dashboard recommendations until post-recovery verification passes.
- Reason: Blocked until pnpm dashboard:post-recovery passes for current.

## Evidence Paths

- Fleet chain: `data/fleet-optimization-chain-2026-07-10.json`
- GSC audit: `data/gsc-permission-audit-2026-07-10.json`
- GSC work order: `docs/work-orders/gsc-permission-audit-2026-07-10.md`
- GSC handoff status: `resolved`

## Stop Condition

This rendered UI smoke is local and non-mutating. It opens the dashboard in a browser and records evidence only; it does not authorize CMS edits, Search Console mutation, AdSense mutation, publishing, DNS changes, or deployment.
