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
- Live Vercel deployment completed on 2026-07-09 after the creative/resolver changes.
- Live Vercel checks now show the new creative renderer for `https://multi-dashboard-one.vercel.app/api/banner-management/creative?siteKey=temon&variant=a`: it returns `image/svg+xml`, no longer contains `COUPANG PARTNERS`, and uses image-led Korean copy.
- Live `temon` serving checks now work through both slot and placement paths: `/api/banner-management/image` returns 302 to the variant creative URL, and `/api/banner-management/click` returns 302 to the Coupang short URL.
- Runtime fallback added on 2026-07-09: if the Coupang channel registry lookup is stale/missing but the resolved DB placement domain matches the request page/referrer domain, the registered placement can still serve. This prevents valid remote DB placements from falling back to the transparent GIF.
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
- Live Vercel creative check after deployment: `variant=a` returned `200 image/svg+xml`, `COUPANG PARTNERS` was absent.
- Live Vercel image checks after deployment: `siteKey=temon&slotKey=coupang-inline` and `placementId=placement_coupang_temon_inline` both returned `302` to `/api/banner-management/creative?siteKey=temon&variant=c`.
- Live Vercel click checks after deployment: both slot and placement paths returned `302` to `https://link.coupang.com/a/feHs6hGHQG`.

## Next Steps

- Use the refreshed `data/site-stats.json` as the source of truth for dashboard-driven site prioritization.
- Before the next refresh in a non-interactive Codex session, keep `pnpm-workspace.yaml` so approved build scripts for `esbuild`, `protobufjs`, and `sharp` do not block dependency restore.
- For a stronger click-through version, add impression/click-rate based weight updates so weak variants are automatically reduced and winning variants are promoted.
- Consider adding separate health and sports image themes after the first A/B/C performance window; those topics currently use the closest household or car/outdoor theme.
- Add a separate "Coupang accepted clicks" import/report if exact partner-side performance needs to appear in the dashboard. Internal redirect counts should not be used as revenue-performance proof.
- Monitor internal redirect counts against Coupang Partners accepted clicks; the dashboard now represents redirect-call activity, not partner-side approved click/reporting truth.
