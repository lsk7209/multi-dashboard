# EVIDENCE

## Validation Level

Level: 0

## Commands Run

| Command | Result | Notes |
|---|---|---|
| harness-init.py | PASS | size=medium, domain=general, created=2026-07-19T16:53:00+09:00 |

## Test Results

| Test | Result | Notes |
|---|---|---|

## Failed Checks

## Fixes Applied

## Completion Evidence
# 2026-07-19

| Command | Result | Notes |
|---|---|---|
| `getDashboardData()` from the refreshed snapshot | Fail against direct-ops rule | Action queue included Gmail-derived noindex/404/redirect rows from `lsk7209/gmail-digest`. |
| `pnpm exec vitest run app/lib/dashboard-data.test.ts scripts/setup/update-ga4-stats.test.ts` | Pass | 85 focused tests, including legacy Gmail-shaped snapshot data ignored by actions. |
| `pnpm exec tsc --noEmit --pretty false` | Pass | Direct-only collector and dashboard types compile. |

## Risk Notice

Task: Regenerate dashboard snapshot and later deploy the task commit.

Why Needed: The refreshed artifact must prove the legacy digest field is absent and the live dashboard must reflect the direct-only queue.

Impact Scope: Generated dashboard data, Git branch, Git-connected Vercel deployment only; no managed-site server, database, or GSC mutation.

Rollback: Revert the task commit and redeploy the prior Git revision.

Safer Alternative: Static code inspection alone would not prove generated artifacts or public behavior.

Approval Needed: The user authorized continued dashboard-led repair; no irreversible external data mutation is planned.
