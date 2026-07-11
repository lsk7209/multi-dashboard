# Handoff

## Completed in production

- Qualified impressions and attributed clicks are separate from legacy endpoint-call statistics.
- The dashboard records HMAC-hashed anonymous sessions, one event per assignment/session/day, and uses a 24-hour impression-to-click eligibility window.
- The Git-connected Vercel dashboard production deployment serves the event endpoint and loader.
- Headed-Chrome verification passed on Temon and Smallhomepick: browser POST event returned 200 with origin-specific CORS; Temon's qualified-impression count increased.
- WordPress MU plugins were applied with timestamped backups to every target. Healfood's stale configured path was corrected to `/home/healfood/public_html`, and its LiteSpeed cache was purged after installation.

## Verification

- `pnpm lint`, `pnpm type-check`, and focused banner Vitest (14 tests) passed.
- Public marker audit confirms the loader on Campgogo, Dullegilgogo, Picklefriend, Plategogo, Roadways, Temon, Nexttech7, Smallhomepick, Petinsuer, Estat, Autoscares, Dogspang, and Softwa.

## Remaining rollout work

- Pregnancy, Yungyang, and Dogswhere are deployed and their public pages expose both the measurement marker and loader.
- Cartain's client-rendered banner is present on the public home page. The updated mutation-aware loader recorded a real-browser event with HTTP 200.
- Notebook exposes the marker but its optimization layer removes the external loader. The installer now uses WordPress enqueue registration; inspect the site's script-optimization rule before a further production change.
