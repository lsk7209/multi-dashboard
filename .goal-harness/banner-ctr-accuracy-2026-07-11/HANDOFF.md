# Handoff

## Completed locally

- Added qualified-impression and attributed-click persistence to the existing banner ledger without mutating historical raw records.
- Added HMAC hashing for anonymous session IDs, one event per assignment/session/day, bot rejection, and a 24-hour click-to-impression eligibility window.
- Added `POST /api/banner-management/event`, `/banner-measurement.js`, and a console KPI labelled `실측 CTR`.

## Verification

- `pnpm lint` passed.
- `pnpm type-check` passed.
- Focused banner Vitest suite passed: 13 tests.

## Remaining production gate

- Set `MONETIZATION_BANNER_EVENT_SECRET` in the Git-connected Vercel production project without exposing its value.
- Commit the ten clean app-installation changes; review the two untracked app banner components before modifying them. The tracked WordPress MU-plugin installer now passes a no-write dry-run for all nine targets.
- Deploy a Next/Vite canary, then a WordPress canary; verify browser events and remote LibSQL rows before full fleet rollout.
