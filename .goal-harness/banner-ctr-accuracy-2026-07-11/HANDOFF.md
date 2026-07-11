# Handoff

## Completed in production

- Qualified impressions and attributed clicks are separate from legacy endpoint-call statistics.
- The dashboard records HMAC-hashed anonymous sessions, one event per assignment/session/day, and uses a 24-hour impression-to-click eligibility window.
- The Git-connected Vercel dashboard production deployment serves the event endpoint and loader.
- Headed-Chrome verification passed on Temon and Smallhomepick: browser POST event returned 200 with origin-specific CORS; Temon's qualified-impression count increased.
- WordPress MU plugins were applied with timestamped backups to every target except Healfood.

## Verification

- `pnpm lint`, `pnpm type-check`, and focused banner Vitest (14 tests) passed.
- Public marker audit confirms the loader on Campgogo, Dullegilgogo, Picklefriend, Plategogo, Roadways, Temon, Nexttech7, Smallhomepick, Petinsuer, Estat, Autoscares, Dogspang, and Softwa.

## Remaining rollout work

- `healfood.kr`: configured SSH private-key file is invalid, so no remote write was attempted.
- `pregnancy-ehon365` and `yungyanggogo`: banner components are untracked user work and remain untouched.
- Recheck app deployments/cache for Cartain, Tennisfrens, Todaypharm, and Dogswhere. Confirm Notebook serves the loader as well as the marker.
