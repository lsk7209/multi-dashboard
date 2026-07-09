# Status

## 2026-07-09

- State: dashboard snapshot refreshed.
- Command: `pnpm stats:update`.
- Output: `data/site-stats.json` and `data/history/2026-07-09.json`.
- Result: 98 sites refreshed with zero GA4, GSC, sitemap, AdSense, or ads.txt failures reported by the refresh summary.
- Note: dependency restore required approving build scripts for `esbuild`, `protobufjs`, and `sharp`; approval is recorded in `pnpm-workspace.yaml`.
- State: Coupang creative banner revised again for image-led CTR and site-topic fit.
- Change: `app/api/banner-management/creative/route.ts` now embeds AI-generated theme images as self-contained base64 SVG backgrounds, keeps minimal visible Korean copy, adds site-specific short click hooks, supports `variant=a|b|c`, and removes front-facing `COUPANG PARTNERS` / CTA-button styling.
- Change: `app/lib/banner-management-store.ts` now supports stable weighted selection when a placement has multiple active assignments, enabling A/B/C banner tests for the same site and slot.
- Change: `scripts/setup/sync-coupang-banner-placements.ts` now seeds three Coupang creative variants per site and deactivates the older single-variant assignment IDs.
- Assets: household, pet, car/outdoor, and tech/work theme images under `public/assets/affiliate/coupang-theme-*-source.png` and `public/assets/affiliate/coupang-theme-*-728x90.png`.
- Verification: `pnpm type-check` passed; `pnpm test -- app/api/banner-management/creative/route.test.ts app/lib/banner-management-store.test.ts` completed with 642 passing tests; visual sample checked at `tmp/coupang-preview-grid.png`.
- State: Coupang dashboard click metric clarified.
- Finding: the banner dashboard's click count is an internal `/api/banner-management/click` redirect-call count, not Coupang Partners' accepted click count. On 2026-07-09, remote libSQL showed `temon` 7-day `image_request=1208` and `click=244`, while Coupang Partners reported only 3 accepted clicks for 2026-07-05 through 2026-07-08.
- Change: banner console labels now say redirect/redirect-rate instead of click/CTR, click route records request metadata for future diagnosis, and the WP install script no longer emits `rel="noreferrer"` so source referrers can be retained.
- Verification: `pnpm type-check` passed; `pnpm test -- app/lib/banner-management-store.test.ts` completed with 642 passing tests.
- State: Coupang A/B/C banner settings synced to the remote banner DB.
- Command: `pnpm stats:update` refreshed 98 sites on 2026-07-09 with zero GA4, GSC, sitemap, AdSense-code, or ads.txt failures.
- Snapshot: `data/site-stats.json` generated at `2026-07-09T03:13:23.974Z`, covering completed-day data through 2026-07-08.
- Command: `pnpm ops:coupang-banners` synced 21 Coupang sites to local and remote storage.
- Result: remote libSQL has 21 `coupang-inline` sites with 63 active assignments; each site has exactly three active variants (`a`, `b`, `c`).
- Cleanup: placeholder/example/localhost active assignments were deactivated locally and remotely; remote verification returned no active placeholder/example assignments.
- Verification: remote `temon` now has active `assignment_coupang_temon_inline_a` weight 34, `_b` weight 33, and `_c` weight 33; legacy `assignment_coupang_temon_inline` and `quiz-bottom` placeholder are inactive.
- State: creative/resolver changes deployed to production.
- Deployment: `git push origin main` triggered Vercel production deployment `https://multi-dashboard-mw1eqmba1-limsubs-projects.vercel.app`, which reached Ready in 23s.
- Fix: `app/lib/banner-management-store.ts` now allows a registered Coupang DB placement to serve when channel registry lookup returns `channel_not_found` but the placement domain matches the request page/referrer domain.
- Verification: `pnpm type-check` passed; targeted Vitest passed with 3 files and 16 tests; `pnpm build` passed.
- Live verification: `variant=a` returned `200 image/svg+xml` without `COUPANG PARTNERS`; `temon` image slot and placement paths returned `302` to a variant creative URL; click slot and placement paths returned `302` to `https://link.coupang.com/a/feHs6hGHQG`.
- State: Coupang A/B/C weight optimizer added.
- Change: `scripts/setup/optimize-coupang-banner-weights.ts` reads recent assignment-level impressions and redirects, applies Bayesian smoothing, bounds variant weights between 10 and 80, requires minimum placement impressions and redirects, and defaults to dry-run unless `--apply` is passed.
- Verification: optimizer tests passed; live remote dry-run returned `changedPlacements=0` because current samples are too small or have insufficient redirect calls for safe reweighting.
