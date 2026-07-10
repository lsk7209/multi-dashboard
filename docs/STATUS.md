# Status

## 2026-07-10 GA4 Collection Pacing

- Added a global GA4 request queue in `scripts/setup/update-ga4-stats.ts`: default concurrency=1 and minimum interval=250ms. This isolates GA4 pacing from the six-site collector concurrency and covers both metric and traffic-keyword reports. The default full-run timeout is 10 minutes.
- Fresh verification: `pnpm dashboard:refresh` completed for 98 sites at `2026-07-10T12:19:48.153Z`; GA4 failed=0 and GSC failed=0. The preceding 40-site GA4 429 quota condition is no longer present.
- Current direct triage: 3 low GSC sitemap warnings only (`nicewomen`, `autorentlab`, `ezfunnel`); critical/high/medium findings are zero.
- GitHub Actions direct collection is still skipped because no effective `GITHUB_TOKEN` or `GH_TOKEN` is available from the approved local secret sources. This is an external credential blocker, not a clean collector result.
- Verification: `scripts/setup/update-ga4-stats.test.ts` 15/15 and `pnpm type-check` passed.
- Production verification: Vercel deployment `dpl_CHQVDFg9jhp2My5zEZXZK26QC31R` is Ready for Git commit `c00458f`; the default dashboard domain returned HTTP 200 and the rendered UI smoke passed 10 checks with 98 sites, 0 blocking, and 0 maintenance sources.

## 2026-07-10 Collector Coverage and GA4 Quota Triage

- Fresh partial snapshot: `data/site-stats.json` generated at `2026-07-10T11:33:59.439Z` for 98 sites. GSC completed; GA4 reached Data API 429 quota limits for 40 sites.
- Direct ops triage is now correctly coalesced to 4 findings: one high GA4 collector-level quota condition and three low GSC sitemap warnings. The 40 quota-limited sites are no longer misrepresented as 40 independent site repairs.
- Dashboard Mail now renders direct collector availability and evidence for GitHub Actions, dashboard artifacts, and GA4. Current state: GitHub Actions skipped because no token is available, dashboard artifacts ok, GA4 error for 40 quota-limited sites.
- Verification: 99 focused Vitest tests, `pnpm type-check`, `pnpm build`, and 11-check `pnpm dashboard:ui-smoke -- --url http://127.0.0.1:3004/` passed.
- Remaining operational blocker: restore GA4 Data API quota capacity or collection pacing before treating per-site GA4 telemetry as actionable. GitHub Actions collection remains unavailable until a token is configured.
- Production evidence: GitHub commit `4cf75b7` was deployed through the Git integration as Vercel production deployment `dpl_8iLBz5rp7BDoezNQuraVHLYv5cBC`. `https://multi-dashboard-one.vercel.app` returned HTTP 200 and the rendered collector rows matched the current direct evidence.

## 2026-07-10 Dashboard Runtime

- Dashboard snapshot refreshed: 98 sites, generated at `2026-07-10T08:51:36.848Z`, with zero GA4, GSC, sitemap, AdSense, and ads.txt collector failures.
- Fleet evidence restored: `data/fleet-optimization-chain-2026-07-10.json` is current and reports 4/4 non-mutating commands passed.
- Next.js 16 runtime module resolution repaired for local App Router TypeScript/TSX imports. `pnpm type-check`, dashboard-focused Vitest (112 tests), `pnpm build`, and the 9-check rendered UI smoke passed.
- Current direct triage: three low GSC sitemap warnings only (`nicewomen`, `autorentlab`, `ezfunnel`); public site checks are clean and GSC resubmission requires external action authority.
- Known validation gap: `pnpm lint` has 7 existing errors in untracked content-generation scripts outside this dashboard runtime scope.
- Git deployment completed: commit `30930aa` is deployed to Vercel production (`dpl_68vCyzgoi5h3pfkjxwN1pKE5axyS`); `https://multi-dashboard-one.vercel.app` returned HTTP 200 with the current 98-site dashboard.
- Read-only action evidence improvement completed: action rows now retain their distinct reason and safe inspection next step while replacing sitemap resubmission with read-only status/lastmod/robots checks. Commit `084b414` is live on Vercel production (`dpl_EVpN3PnWk6dJgZCzEaU5hoLRRfWo`) and passed production HTTP/render assertions.

## 2026-07-10

- State: content quality polish completed for the 2026-07-10 scheduled top-up batches.
- Harness: `.goal-harness/content-quality-polish-2026-07-10/`.
- Change: added `scripts/content-quality-polish-2026-07-10.mjs` for local scan/apply plus remote WordPress future-post dry-run/apply/verify.
- Local correction evidence: `data/content-polish/local-apply-2026-07-10.json` applied 458 targeted Korean wording replacements across 55 files; `data/content-polish/local-scan-after-2026-07-10.json` reports hitCount 0 and errors 0.
- Remote correction evidence: `data/content-polish/remote-dry-run-targeted-2026-07-10.json` planned 434 replacements across 208 future posts with errors 0; `data/content-polish/remote-apply-2026-07-10.json` updated 208 future posts with errors 0; `data/content-polish/remote-verify-after-2026-07-10.json` reports hitCount 0 and errors 0.
- Coverage after grammar polish: `data/scheduled-queue-2026-07-10-under30-after-content-polish.json` confirmed the 8 target sites still had neededPosts 0 and under30Count 0 at that audit time.
- Structural SEO/helpful-content follow-up completed: added `scripts/content-structural-diversify-2026-07-10.mjs` and diversified repeated H2/source-note structure for `pethomepick.com`, `kdramanote.com`, and `kang4.com`.
- Structural local evidence: `data/content-polish/structural-local-apply-2026-07-10-c.json` reports outlineSignatureUniqueRatio 1.0, duplicateSourceNoteRatio 0, and topH2Share <= 0.35 for all three high-risk sites.
- Structural remote evidence: `data/content-polish/structural-remote-verify-after-2026-07-10-final.json` checked 227 future posts and reports postsNeedingUpdate 0, errors 0.
- Queue drift correction: generated one additional `ezfunnel.kr` article in `output/ezfunnel-extension-2026-07-10/` with quality score 96, 7372 plain text chars, H2 12, sources 5; live ledger `data/schedule-ledger/ezfunnel-extension-live-2026-07-10.json` inserted 1 with errors 0.
- Final coverage after all polish: `data/scheduled-queue-2026-07-10-under30-after-final-polish.json` extracted target check shows under30Count 0; `ezfunnel.kr` now has futureCount 95 and lastScheduledAt `2026-08-09T22:00:00+09:00`.
- State: 2026-07-10 under-30-day scheduled queue top-up completed for all 8 direct-evidence target sites.
- Final evidence: `data/scheduled-queue-2026-07-10-under30-after-kdramanote-topup.json` generated at `2026-07-10T08:03:38.148Z`; target-site under-30 result is empty.
- Completion: `pethomepick.com` scheduled 87 quality-score-95 articles, `ezfunnel.kr` scheduled 34 quality-score-95 articles, `kang4.com` scheduled 51 quality-score-95 articles, and `kdramanote.com` scheduled 89 quality-score-95 articles after research-first generation and remote duplicate checks.
- Final target coverage: `smallhomepick.com` futureCount 152, `plategogo.com` 192, `kdramanote.com` 145, `pethomepick.com` 145, `kang4.com` 143, `travel.sellerpit.kr` 145, `ezfunnel.kr` 94, `jasamall.sellerpit.kr` 94; all have lastScheduledAt on or after 2026-08-09 and neededPosts 0.
- State: under-30-day scheduled queue top-up executed for sources with verified 90+ article quality.
- Command: `pnpm stats:update`.
- Result: 98 sites refreshed; `data/site-stats.json` generated at `2026-07-10T06:44:30.884Z` with zero GA4, GSC, sitemap, AdSense-code, or ads.txt failures reported by the refresh summary.
- Command: `node scripts/audit-scheduled-queue.mjs --ssh --local-content --out data/scheduled-queue-2026-07-10-under30-full.json --jsonl data/scheduled-queue-2026-07-10-under30-full.jsonl --inventory data/content-queue-inventory-2026-07-10-under30-full.json`.
- Result: 8 direct-evidence sites were under 30 days of future scheduled coverage, requiring 532 posts at a 5-hour interval before quality/dedup filtering.
- Change: added `scripts/schedule-wp-md-manifest.mjs` and `scripts/schedule-wp-html-manifest.mjs` for manifest-based WordPress future scheduling with quality gates, remote duplicate-slug preflight, 5-hour intervals, and JSON ledgers.
- Execution: `smallhomepick.com` scheduled 79 articles from a 92-point research/QA manifest; live ledger `data/schedule-ledger/smallhomepick-md-manifest-live-2026-07-10.json` reports inserted=79, skippedExisting=0, errors=0.
- Execution: `travel.sellerpit.kr` scheduled 51 articles from a 97-point deepened travel export; live ledger `data/schedule-ledger/travel-sellerpit-html-export-live-2026-07-10.json` reports inserted=51, skippedExisting=0, errors=0.
- Verification: `data/scheduled-queue-2026-07-10-smallhomepick-travel-after-topup.json` confirms `smallhomepick.com` futureCount=115, lastScheduledAt=`2026-08-01T23:13:00+09:00`; `travel.sellerpit.kr` futureCount=145, lastScheduledAt=`2026-08-09T18:00:00+09:00`.
- Gate: `kdramanote.com` quality report score=94 passed, but all 100 eligible slugs already existed remotely, so no duplicate posts were inserted. `ezfunnel.kr` and `kang4.com` local draft top-ups also inserted 0 because every candidate slug already existed.
- Next: remaining shortfalls require fresh research-first generation and 90+ QA before scheduling; do not publish unverified old drafts.
- State: high-quality content queue top-up partially completed for the 2026-07-10 under-30-day scheduled queue.
- Quality rule: new top-up articles must be research-backed, non-duplicate, and pass a 90+ quality report before scheduling; low-value bulk generation is blocked.
- Freshness source: `pnpm stats:update` generated `data/site-stats.json` at `2026-07-10T06:44:30.884Z`; queue audits used direct WP SSH/local-content evidence, not `gmail-digest`.
- Completed sites: `smallhomepick.com` now has futureCount 152 and lastScheduledAt `2026-08-09T21:13:00+09:00`; `travel.sellerpit.kr` has futureCount 145 and lastScheduledAt `2026-08-09T18:00:00+09:00`; `jasamall.sellerpit.kr` has futureCount 94 and lastScheduledAt `2026-08-09T18:00:00+09:00`.
- New scheduling evidence: `data/schedule-ledger/jasamall-html-export-live-2026-07-10.json` inserted 13; `data/schedule-ledger/smallhomepick-html-export-live-2026-07-10-b.json` inserted 37; `data/schedule-ledger/smallhomepick-html-export-live-2026-07-10-c.json` inserted 1; all reported errors 0.
- `plategogo.com` top-up completed after static content generation and deploy: `D:\web\plategogocom` commit `6f20949` added 92 scheduled posts, quality report score 95, `npm run build` passed, `npm run verify:seo` passed, GitHub Actions `SEO readiness` and `Submit sitemap to Google Search Console` passed, and Vercel production deployment reached Ready from commit `6f20949`.
- Current remaining shortfalls from `data/scheduled-queue-2026-07-10-under30-after-plategogo-topup.json`: `kdramanote.com` 89, `pethomepick.com` 87, `kang4.com` 51, `ezfunnel.kr` 34.
- Next content-queue action: generate new non-duplicate 90+ research-backed articles for the remaining sites; do not reuse packages where remote slugs already exist.
- State: Dashboard refresh and ops-triage evidence refinement completed.
- Command: `pnpm stats:update`.
- Result: 98 sites refreshed; `data/site-stats.json` generated at `2026-07-10T05:25:30.576Z` with zero GA4, GSC, sitemap, AdSense-code, or ads.txt failures reported by the refresh summary.
- Command: `pnpm ops:intel`, `pnpm ops:triage`, `pnpm exec tsx scripts/setup/audit-vercel-api-data-sites.ts`, and `pnpm ops:api-data-freshness`.
- Result: direct ops triage still has only 3 low-severity GSC sitemap-warning findings; API-data freshness remains content-followup=13, source-check-first=14, pipeline-repair-first=0, manual-review=1.
- Change: `scripts/setup/update-ops-intel.ts` now carries sitemap detail evidence into ops findings, so `docs/ops-triage.md` lists the exact sitemap URL, warning/error counts, submitted URL count, last downloaded time, and last submitted time.
- Public read-only check: `nicewomen`, `autorentlab`, and `ezfunnel` homepages, sitemaps, robots.txt, canonical tags, and noindex state checked cleanly from public HTTP evidence; the remaining warning is a GSC-side sitemap warning that should be inspected or resubmitted only with external Search Console action authority.
- Verification: targeted Vitest for `update-ops-intel` and `update-ops-triage` passed; `pnpm type-check` passed; `pnpm lint` passed.
- State: Vercel/API-data freshness triage completed from direct dashboard and repo evidence.
- Command: `pnpm stats:update`.
- Result: 98 sites refreshed; `data/site-stats.json` generated at `2026-07-10T02:18:04.373Z` with zero GA4, GSC, sitemap, AdSense-code, or ads.txt failures reported by the refresh summary.
- Command: `pnpm exec tsx scripts/setup/audit-vercel-api-data-sites.ts`.
- Result: refreshed `data/vercel-api-data-sites.json` and `docs/vercel-api-data-sites.md`; inventory total=28, scheduled-db-ingestion=14, api-backed-content=11, candidate-review=3.
- Command: `pnpm ops:intel` and `pnpm ops:triage`.
- Result: direct ops triage found 3 low-severity findings only; critical=0, high=0, medium=0.
- Change: added `scripts/setup/check-vercel-api-data-freshness.ts` and package script `pnpm ops:api-data-freshness` for read-only API-data content follow-up ranking.
- Output: `data/vercel-api-data-freshness.json`, `docs/vercel-api-data-freshness.md`, and `docs/work-orders/vercel-api-data-freshness-2026-07-10.md`.
- Result: API-data freshness summary is content-followup=13, source-check-first=14, pipeline-repair-first=0, manual-review=1.
- Todaypharm check: latest GitHub evidence showed scheduled public data sync success through batch `25201-25241`, pharmacy content generation reporting all pharmacies already covered, and publish queue success with 1 item published plus IndexNow/GSC submission.
- Next target: inspect `dogswhere` before content work because `todaypharm` is pipeline-healthy and already covered by current content evidence.
- Dogswhere read-only check: public sitemap/feed were fresh on 2026-07-10, but Turso showed places_latest_updated_at=`2026-05-30T23:30:05.172Z`, blog_total=770, draft=741, published=28, scheduled=1.
- Dogswhere finding: 511 draft rows have future `published_at` values through `2026-10-24T15:00:00.000Z`, but only 1 row is actually `scheduled`; next useful work is queue/state repair rather than new API data collection.
- Dogswhere follow-up: added and verified read-only queue audit in `D:\web\dogswherecom`; `pnpm content:audit-queue` generated 511 review-only draft-to-scheduled SQL candidates and performed no live write.
- Dogswhere live repair: after authorization, 511 future-dated drafts were moved into scheduled state. Final audit shows futureDrafts=0, repairCandidates=0, scheduledFuture=512; sitemap/feed did not expose the next scheduled slug before its scheduled time.
- Dogswhere post-repair readiness: `pnpm build` passed; `pnpm content:verify-publish` passed before first due time with dueScheduled=0. First publish-cron evidence should be checked after `2026-07-10T04:00:00.000Z`.
- Dogswhere post-cron verification completed: `pnpm content:verify-publish` at `2026-07-10T05:01:40.869Z` showed dueScheduled=0, draft=230, published=29, scheduled=511, and `cheonan-city-park-dog-guide-2026-237` present in sitemap/feed/blog. Re-run audit showed futureDrafts=0, repairCandidates=0, scheduledFuture=511.
- Dogswhere place-source improvement completed: added read-only source audit and dry-run source sync commands in `D:\web\dogswherecom`. `pnpm places:audit-source` reported stale-fail with latestUpdatedAt=`2026-05-30T23:30:05.172Z`, ageDays=40, totalPlaces=212, openPlaces=212, and public `/api/places` 200. `pnpm places:sync-pet-tour:dry-run -- --area 1 --max-total 1 --max-pages 1` passed with wouldSave=1 and no DB write.
- Verification: `pnpm ops:api-data-freshness` passed; `pnpm type-check` passed.
- Gate: no live DB writes, publishing jobs, production deploys, Search Console writes, AdSense writes, or title/body mutations were executed.

## 2026-07-09

- State: affiliate topic recommendation and WordPress one-click local package completed.
- Command: `pnpm stats:update`.
- Result: 98 sites refreshed; snapshot `data/site-stats.json` generated at `2026-07-09T12:26:40.789Z` with zero GA4, GSC, sitemap, AdSense-code, or ads.txt failures.
- Command: `pnpm ops:monetization`.
- Result: regenerated affiliate and banner workspace data; 35 affiliate programs, 35 affiliate items, and 18 high-value candidates reported.
- Correction: existing-site overlap must be excluded; pet/dog is excluded because several pet/dog sites already exist in the fleet.
- Excluded duplicate topic groups: pet/dog, travel/camping, car, health/insurance, legal, AI/software, seller/shopping, wedding/family, education/certification, public-data/map, and broad beauty.
- Recommendation: prioritize `남성 그루밍·면도·두피케어 제품 비교 가이드` because the refreshed site snapshot does not show a dedicated male grooming/shaving/scalp-care site, while the topic still fits product-comparison affiliate inventory.
- Output: local WordPress launch package created at `output/wp-launch/groomingpicklab` with 100 content contracts, writer CSV, domain candidates, persona, runbooks, rollback/search visibility gates, publishing queue, and dry-run payloads.
- Superseded output: `output/wp-launch/dogoutinglab` was generated first but is not the current recommendation because it overlaps existing pet/dog sites.
- Verification: WordPress package validation returned `status: pass`, `errors: []`, `warnings: []`; writer CSV export returned 100 rows.
- Gate: no domain purchase, SSH/server write, WordPress admin write, affiliate dashboard action, tracking-link generation, or publishing was executed.
- State: `groompicklab.com` domain purchase and SSH setup preparation reached final-confirmation gate.
- Domain evidence: Dynadot production search reported `groompicklab.com` available, non-premium, 1-year registration `10.88 USD`, renewal `10.88 USD`; account balance check reported `73.22 USD`.
- Reputation evidence: deep check found DNS unresolved, zero Internet Archive 200 captures, no helper-detected trademark hints, and risk score 0; Spamhaus DBL and AdSense monetization trace remain manual-review flags.
- SSH evidence: direct read-only probe to the ChemiCloud `nexttech` account succeeded; host `rs6-kor.serverhostgroup.com`, WP-CLI `/usr/local/bin/wp`, PHP `/usr/local/bin/php`, MySQL `/usr/bin/mysql`, starter root `/home/nexttech/blogsample2.nexttech7.com/wp-config.php`.
- Work order: `docs/work-orders/groompicklab-launch-2026-07-10.md`.
- Blocker: live Dynadot purchase still requires exact final confirmation with domain, max/all-in price and currency, duration, and production account authority.
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
