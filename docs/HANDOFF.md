# Handoff

## Current State

- Dashboard snapshot refresh completed on 2026-07-09 12:13 KST.
- Source command: `pnpm stats:update`.
- Latest snapshot files:
  - `data/site-stats.json`
  - `data/history/2026-07-09.json`
- Snapshot `generatedAt`: `2026-07-09T03:13:23.974Z`.
- Covered date ranges use `Asia/Seoul` completed-day basis through 2026-07-08.
- Coupang creative SVG was revised on 2026-07-09 to use AI-generated image-led banners instead of obvious text-heavy ad banners.
- Creative routing now maps site topics to banner themes: household, pet, car/outdoor, and tech/work.
- Creative URLs support `variant=a|b|c`; the banner resolver can bucket multiple active assignments by stable weighted selection for A/B/C tests.
- Banner console click metrics were clarified on 2026-07-09: dashboard "clicks" are internal redirect-call counts, not Coupang Partners accepted clicks. UI labels now use redirect/redirect-rate wording.
- Click route now records request metadata for future redirect-call diagnosis. The WordPress install script no longer adds `noreferrer`, so source referrers can be retained on new installs/updates.
- Coupang A/B/C banner settings were synced on 2026-07-09 with `pnpm ops:coupang-banners`.
- Remote libSQL verification after sync: 21 `coupang-inline` sites, 63 active assignments, min/max 3 active assignments per site.
- `temon` remote state after sync: `assignment_coupang_temon_inline_a` weight 34, `_b` weight 33, `_c` weight 33 active; legacy single assignment and `quiz-bottom` placeholder inactive.
- Live Vercel check after the DB sync still returned the old creative renderer for `https://multi-dashboard-one.vercel.app/api/banner-management/creative?siteKey=temon&variant=a`: it still contained `COUPANG PARTNERS`, had no variant copy, and did not include the new theme asset. The remote DB settings are ready, but the improved creative code must be deployed before the live banner visual changes take effect.
- Runtime banner assets:
  - `public/assets/affiliate/coupang-theme-household-728x90.png`
  - `public/assets/affiliate/coupang-theme-pet-728x90.png`
  - `public/assets/affiliate/coupang-theme-car-outdoor-728x90.png`
  - `public/assets/affiliate/coupang-theme-tech-work-728x90.png`

## Verification Evidence

- `pnpm stats:update` completed successfully for 98 sites.
- Summary: GA4 failed=0, GSC failed=0, GSC email alerts=0, sitemaps failed=0, AdSense code not detected=0, AdSense transient=0, ads.txt failed=0, ads.txt transient=0.
- `pnpm type-check` passed after the Coupang creative and A/B/C resolver changes.
- `pnpm test -- app/api/banner-management/creative/route.test.ts app/lib/banner-management-store.test.ts` completed with 96 test files and 642 tests passing.
- Visual sample grid checked at `tmp/coupang-preview-grid.png`.
- Remote libSQL check on 2026-07-09 showed `temon` 7-day `image_request=1208` and internal `click=244`; Coupang Partners for 2026-07-05 through 2026-07-08 showed 3 accepted clicks in the user's screenshot.
- Later remote libSQL check after the refresh/sync showed `temon` 7-day `image_request=1216` and internal `click=245`.
- `pnpm ops:coupang-banners` completed with `synced=21 remote=yes`.
- Placeholder/example assignment cleanup set 4 local and 5 remote active test assignments inactive; final remote check found no active placeholder/example assignments.
- Live Vercel creative check after sync confirmed the production deployment was still serving the old SVG implementation, so code deployment is the remaining step for live visual rollout.

## Next Steps

- Use the refreshed `data/site-stats.json` as the source of truth for dashboard-driven site prioritization.
- Before the next refresh in a non-interactive Codex session, keep `pnpm-workspace.yaml` so approved build scripts for `esbuild`, `protobufjs`, and `sharp` do not block dependency restore.
- For a stronger click-through version, add impression/click-rate based weight updates so weak variants are automatically reduced and winning variants are promoted.
- Consider adding separate health and sports image themes after the first A/B/C performance window; those topics currently use the closest household or car/outdoor theme.
- Add a separate "Coupang accepted clicks" import/report if exact partner-side performance needs to appear in the dashboard. Internal redirect counts should not be used as revenue-performance proof.
- Deploy the current creative/resolver changes, then re-check the live creative URL for `variant=a|b|c` and confirm the old `COUPANG PARTNERS` copy is gone.
