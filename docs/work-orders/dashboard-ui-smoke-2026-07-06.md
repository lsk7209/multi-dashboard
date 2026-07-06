# Dashboard UI Smoke - 2026-07-06

This is a local browser-rendered smoke artifact. It does not mutate production or external systems.

## Summary

- URL: `http://127.0.0.1:3000/?actionabilityMode=local-evidence&actionabilityToken=redacted`
- Stats snapshot: `2026-07-06T14:36:12.558Z`
- Sites: 98
- Blocking sources: 1
- Maintenance sources: 0
- Blocker hosts: `yesa.kr`
- Actionability: `blocked_for_action_until_post_recovery_verify`
- Checks: 11

## Refresh Sources

- Blocking: `skipped_refresh_failed:gsc:auth_error:1`
- Maintenance: `none`

## Actionability

- Status: `blocked_for_action_until_post_recovery_verify`
- Required command: `pnpm dashboard:post-recovery`
- Allowed use: Read-only triage only. Do not execute dashboard recommendations until post-recovery verification passes.
- Reason: Blocked until pnpm dashboard:post-recovery passes for yesa.kr.

## Evidence Paths

- Fleet chain: `data/fleet-optimization-chain-2026-07-06.json`
- GSC audit: `data/gsc-permission-audit-2026-07-06.json`
- GSC work order: `docs/work-orders/gsc-permission-audit-2026-07-06.md`
- GSC handoff status: `pending_external`

## Stop Condition

This rendered UI smoke is local and non-mutating. It opens the dashboard in a browser and records evidence only; it does not authorize CMS edits, Search Console mutation, AdSense mutation, publishing, DNS changes, or deployment.
