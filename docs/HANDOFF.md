# Handoff

## 2026-07-14 Fleet Growth / AdSense Quality Review

- Fresh dashboard snapshot: `data/site-stats.json` generated at `2026-07-14T00:43:04.577Z` for 98 sites. All GA4, GSC, sitemap, AdSense-install, and ads.txt service probe statuses are `ok`; the only direct operational finding is the `discparty` content-phase collection timeout.
- Collector classification repair: a timeout after service probes complete now preserves the completed GA4/GSC/AdSense/ads.txt statuses and emits one `collection_timeout` maintenance finding instead of false service incidents. Focused regression coverage exists in `scripts/setup/update-ga4-stats.test.ts` and `scripts/setup/update-ops-intel.test.ts`.
- Fleet growth evidence: `data/fleet-optimization-plan-2026-07-14.json` has 18 evidence-qualified SEO candidates (9 title, 2 technical SEO, 7 content); `docs/work-orders/fleet-growth-adsense-2026-07-14.md` provides the site-level gates. No title/body, CMS, DB, Search Console, AdSense, or individual-site deployment mutation was performed.
- Vercel/API data gate restored: `pnpm ops:api-data-freshness` now produces a non-mutating report. Of 28 sites, 14 need a read-only DB/queue freshness probe, 11 need an upstream source-date check, and 3 need implementation review. Do not create or publish content from those rows until source evidence is measured.
- Local verification: focused Vitest 7/7, `pnpm type-check`, `pnpm build`, and `DASHBOARD_URL=http://127.0.0.1:3102/ pnpm dashboard:verify --skip-stats-update` all passed. Verification result is `local_verified` (4/4), matching snapshot `2026-07-14T00:43:04.577Z`.
- Deployment handoff: commit and push this isolated worktree only, then confirm the Git-connected Vercel production deployment and that `https://multi-dashboard-one.vercel.app` serves the new snapshot marker.

## 2026-07-12 Dashboard Refresh

- Current snapshot: `data/site-stats.json` generated at `2026-07-11T16:18:45.043Z` for 98 sites. GA4, GSC, and sitemap failures are zero; direct ops intelligence and triage both report 0 findings.
- `discparty` exceeded the normal 90-second site timeout but completed in 102 seconds under the one-run recovery limit. No collector default was changed.
- Durable fix: valid AdSense installation and ads.txt evidence now keeps matching transient collector timeouts in the maintenance lane. The remediation queue, runtime actionability, and dashboard verifier now agree that these rows are not readiness blockers.
- Evidence: focused Vitest 42/42, `pnpm type-check`, `pnpm build`, dashboard verification `local_verified` (4/4), and acceptance `ready=true` (10/10). The rendered local production UI smoke matches this exact snapshot.
- Deployment: commit `9f853c5` is live through Git-connected Vercel production deployment `dpl_GAZEMC7Ns9g7rPweWmeMQLpwMGtY`. `https://multi-dashboard-one.vercel.app` returned HTTP 200 with the current snapshot marker.

## Current State

- Sitemap follow-up complete: `nicewomen.kr`, `ezfunnel.kr`, and `autorentlab.com` were resubmitted through Search Console after public XML verification. The fresh `2026-07-11T07:54:16.328Z` 98-site snapshot reports warnings=0 and errors=0 for all three; direct ops findings and triage are both 0.
- `todaypharm.kr` inventory corrected to `nextjs`: public responses are served by Vercel, `/api/pharmacies` is the live app API, and the configured WordPress REST path returns 403. Its 71% user drop is concentrated in Naver referral/organic traffic while scheduled pharmacy-content and queue-publish workflows are succeeding, so no unsupported SEO or data-pipeline mutation was made.
- Fresh dashboard snapshot: `data/site-stats.json` generated at `2026-07-11T07:54:16.328Z` for 98 sites; GA4, GSC, sitemap, AdSense-code, and ads.txt collector failures are all zero.
- Matching post-recovery evidence is `ready_to_act`: GSC permission audit, dashboard verification, and acceptance passed 3/3 with artifact integrity passing. The rendered UI smoke used the locally built dashboard with this exact snapshot before its evidence artifacts were deployed.
- GA4 source/medium and landing-page current-vs-previous 7-day breakdowns are now collected and shown in the site table. Coverage is 86/98 properties for both breakdowns; remaining zero-data properties are not treated as collector failures.
- Cause evidence is now concrete: `tasko.kr` is down in `m.search.naver.com / referral` (1 from 31 users), `todaypharm.kr` is down in Naver referral/organic, and `dogbreedcost.com` is down in direct traffic (27 from 65). Do not apply generic SEO mutations to those drops without site-specific evidence.
- `nicewomen.kr` sitemap XML was serving stale LiteSpeed cache content. Rank Math generated current post sitemap lastmod values, and a WordPress cache purge restored the public sitemap index to `2026-07-09` post/category lastmod values. The unchanged page sitemap lastmod is valid because that page was not modified.
- `ezfunnel.kr` sitemap generator was run through the configured SSH port `1988`; public post sitemap duplicate checks are clean. Its GSC warning remains an observation until Google reprocesses the already-correct sitemap.
- `tennisfrens.com` commit `ada2363` is live on Vercel: `/players/marta-kostyuk-legacy` returns `308` to `/players/marta-kostyuk`, and the legacy URL is absent from sitemap and AI index.
- Fresh snapshot: `data/site-stats.json` generated at `2026-07-11T04:59:29.505Z` for 98 sites; direct collection rebuilt `ops-intel` and `ops-triage` with 3 low-severity sitemap findings.
- Parallel remediation audit: `ezfunnel.kr` has 5 duplicate public sitemap URLs, while `nicewomen.kr` has sitemap-index lastmod drift and `autorentlab.com` has no public-file defect. Ezfunnel's WordPress SSH endpoint currently refuses port 22, so do not claim a sitemap repair until remote access is restored.
- Traffic drops reviewed across 8 sites do not have enough GA4 channel or GSC page/query evidence for SEO mutations. Add source/medium and landing-page comparisons before content changes.
- Texturb: public `/tools/fullwidth-halfwidth-converter/` metadata was corrected from `반각(Fullwidth)` to `반각(Halfwidth)`, committed as `985adfe`, and verified on Vercel production with a cache-MISS response.

- Fresh dashboard snapshot: `data/site-stats.json` generated at `2026-07-11T03:35:08.164Z`; all 98 GA4, GSC, sitemap, AdSense-code, and ads.txt collector checks completed without failures. Post-recovery is `ready_to_act` (3/3, artifact integrity passed).
- Rendered UI verification now requires `DASHBOARD_URL` to point to an owned, current multi-dashboard server. Do not rely on an ambient localhost port; after a build, restart that server before running `pnpm dashboard:post-recovery`.
- Page/query CTR evidence is now collected directly with `pnpm exec tsx scripts/setup/collect-gsc-page-query-opportunities.ts`. The 2026-07-11 artifact covers `estat-2`, `cartain-2`, `texturb`, and `tennisfrens` over the preceding 28 days and is the source for page-level title/meta work; do not infer a specific page/query pair from site-level CTR alone.
- Confirmed follow-up completed from this evidence: `tennisfrens` player title updates were pushed to its GitHub `main`; `texturb` fullwidth/halfwidth tool metadata duplication was fixed and pushed to its GitHub `main`. Await each Vercel deployment's live metadata verification before recording final impact.
- `estat`'s exact candidate already leads with `라조기 만들기`; defer title mutation until the page/query collector proves a title-specific gap. `cartain` has a safe title/excerpt-only Turso update path but requires a deliberate content mutation and post-change SSR verification.
- Fresh dashboard snapshot: `data/site-stats.json` generated at `2026-07-10T23:13:31.297Z`; 98 sites completed with zero GA4, GSC, sitemap, AdSense-code, and ads.txt failures. The matching post-recovery chain is `ready_to_act` with artifact integrity passed.
- `dogbreedcost.com` inventory was corrected to `platform: static` with the source repository `D:\web\dog-breed\repo` / `lsk7209/dog-breed`. Do not use WordPress REST or WordPress deployment routes for this site.
- Current sitemap warnings for `nicewomen.kr`, `ezfunnel.kr`, and `autorentlab.com` have no verified public or source defect. Preserve them for exact GSC warning-detail review; do not mutate sitemap submission or generators merely from the warning count.

- Dashboard post-recovery evidence is current for snapshot `2026-07-10T22:58:31.347Z`: `data/dashboard-post-recovery-chain-2026-07-11.json` reports `readiness=ready_to_act`, 3/3 commands passed, and artifact integrity passed. The current GSC permission audit reports zero access findings.
- Root cause of the prior read-only banner: after `stats:update`, the dated GSC audit/Fleet/T3 artifacts still referenced the older `2026-07-10T15:12:35.317Z` snapshot. Strict loaders correctly rejected them, but the surface message called the stale audit "missing". Post-recovery now uses `dashboard:verify --skip-stats-update` so it validates the already-current snapshot without invalidating it through a nested collector refresh.
- Before the next site action, use the current `ready_to_act` evidence and then refresh only when new dashboard source data is required. A new `stats:update` necessarily requires a new Fleet/post-recovery evidence chain before actionability is reported again.
- Qualified banner CTR is implemented locally but not deployed. The dashboard has a separate HMAC-hashed, anonymous-session event path and loader; do not label it as live until `MONETIZATION_BANNER_EVENT_SECRET`, one Next/Vite canary, and one WordPress canary are verified against remote LibSQL. See `.goal-harness/banner-ctr-accuracy-2026-07-11/HANDOFF.md`.

- Dashboard top-level `배너` tab was removed on 2026-07-11. The dedicated `/banner-management` route remains available for banner operations.
- Banner console metric labels now describe internal redirect-call to image-request ratios, not CTR. The 7-day ranking requires at least 100 image requests; lower-volume sites appear separately as sample-insufficient.
- Read-only sitemap review on 2026-07-10 after snapshot `2026-07-10T13:09:12.180Z`: `nicewomen.kr` and `ezfunnel.kr` returned homepage/robots/sitemap HTTP 200, self-canonical URLs, index-follow metadata, and valid sitemap index structures. Their single GSC sitemap warnings require Search Console's internal warning detail before a safe mutation.
- `autorentlab.com` has a concrete sitemap defect: 26 public sitemap URLs have future `lastmod` values through `2026-07-16`. Repo evidence in `D:\web\autorentlab\lib\blog-articles.ts` marks those future `publishAt` items as `published`, and `getPublicBlogArticles()` exposes every published item without checking its publish time. This is a post-recovery code-fix candidate; no site mutation or deployment was made while dashboard actionability remains read-only.
- Fresh dashboard collection otherwise completed for all 98 sites: GSC and sitemap collection succeeded, while `runmania` has one transient GA4 `DEADLINE_EXCEEDED` error. Do not use that one GA4 row for traffic-priority decisions until a later refresh succeeds.
- GA4 collection pacing was added on 2026-07-10. All Data API reports now pass through a global default-one-request queue with a 250ms minimum interval; environment overrides are `STATS_UPDATE_GA4_CONCURRENCY` (1-4) and `STATS_UPDATE_GA4_MIN_INTERVAL_MS` (0-10000). The default full-run timeout is now 10 minutes to cover a paced 98-site refresh.
- Fresh direct snapshot: `pnpm dashboard:refresh` completed at `2026-07-10T12:19:48.153Z` for 98 sites. GA4 failed=0, GSC failed=0, sitemap failures=0, AdSense failures=0, and ads.txt failures=0. The prior GA4 429 condition affecting 40 sites is cleared.
- Current direct ops triage has only three low GSC sitemap warnings (`nicewomen`, `autorentlab`, `ezfunnel`). They are not deployment or collector failures.
- GitHub Actions collection remains intentionally skipped: local secret files contain only the `GH_TOKEN` template key and no effective `GITHUB_TOKEN`/`GH_TOKEN` was loaded. Do not treat this as a zero-failure result; configure the token in an approved local secret source before relying on GitHub Actions signals.
- Validation: `pnpm exec vitest run scripts/setup/update-ga4-stats.test.ts` passed (15 tests), `pnpm type-check` passed, and the full live collector refresh completed successfully.
- Next operator action: inspect the three low GSC sitemap warnings with Search Console authority. After any dashboard refresh, Git-push the generated snapshot and wait for the Git-connected Vercel deployment before reporting it current.
- Production verification: GitHub commits `889e5e8`, `ac70a5f`, and `c00458f` are deployed through Vercel production deployment `dpl_CHQVDFg9jhp2My5zEZXZK26QC31R` (`https://multi-dashboard-q1avj26xb-limsubs-projects.vercel.app`). `https://multi-dashboard-one.vercel.app` returned HTTP 200 and the 10-check rendered UI smoke passed with the 98-site, zero-blocking snapshot.

- Content quality polish for the 2026-07-10 scheduled top-up batches is complete for known recurring Korean wording defects. Harness: `.goal-harness/content-quality-polish-2026-07-10/`.
- Local artifacts were corrected with `scripts/content-quality-polish-2026-07-10.mjs`: `data/content-polish/local-apply-2026-07-10.json` reports 458 replacements across 55 files; `data/content-polish/local-scan-after-2026-07-10.json` reports hitCount 0.
- Remote scheduled WordPress posts were corrected only when `post_status='future'`: dry-run `data/content-polish/remote-dry-run-targeted-2026-07-10.json` found 434 replacements across 208 future posts; live ledger `data/content-polish/remote-apply-2026-07-10.json` updated 208 future posts with errors 0; verification `data/content-polish/remote-verify-after-2026-07-10.json` reports hitCount 0 and errors 0.
- Post-polish queue coverage remains intact. `data/scheduled-queue-2026-07-10-under30-after-content-polish.json` shows all 8 target sites have neededPosts 0; target under30Count is 0.
- Important limitation: this pass corrected grammar/particle defects. It did not resolve broader SEO/helpful-content structural risks flagged by read-only review: repeated outlines, repeated source bundles, and keyword-pattern overuse, especially in `pethomepick`, `kdramanote`, and `kang4`. Treat that as the next editorial diversification pass before generating more similar batches.
- 2026-07-10 under-30-day scheduled queue top-up is complete for all 8 direct-evidence target sites. Final audit: `data/scheduled-queue-2026-07-10-under30-after-kdramanote-topup.json`, generated `2026-07-10T08:03:38.148Z`; target-site under-30 list is empty.
- Final coverage: `smallhomepick.com` futureCount 152, `plategogo.com` 192, `kdramanote.com` 145, `pethomepick.com` 145, `kang4.com` 143, `travel.sellerpit.kr` 145, `ezfunnel.kr` 94, `jasamall.sellerpit.kr` 94. Each target has `neededPosts=0` from the final 30-day calculation.
- Additional completed live ledgers after the earlier partial handoff: `data/schedule-ledger/pethomepick-html-export-live-2026-07-10.json` inserted 87, `data/schedule-ledger/ezfunnel-html-export-live-2026-07-10.json` inserted 34, `data/schedule-ledger/kang4-topup-live-2026-07-10-b.json` inserted 51, and `data/schedule-ledger/kdramanote-html-export-live-2026-07-10.json` inserted 89. All reported errors 0.
- Quality reports for the final four generated batches all passed at score 95: `output/pethomepick-topup-2026-07-10/docs/quality-report.json`, `output/ezfunnel-topup-2026-07-10/docs/quality-report.json`, `output/kang4-topup-2026-07-10/docs/quality-report.json`, and `output/kdramanote-topup-2026-07-10/docs/quality-report.json`.
- 2026-07-10 scheduled-queue top-up completed for the safe 90+ quality sources found during the under-30-day audit.
- Freshness gate was rerun with `pnpm stats:update`; `data/site-stats.json` generated at `2026-07-10T06:44:30.884Z`, and the refresh summary reported 98 sites with zero GA4, GSC, sitemap, AdSense-code, or ads.txt failures.
- Full SSH/local scheduled-queue audit found 8 sites below 30 days of future coverage: `smallhomepick.com`, `plategogo.com`, `kdramanote.com`, `pethomepick.com`, `kang4.com`, `travel.sellerpit.kr`, `ezfunnel.kr`, and `jasamall.sellerpit.kr`.
- Quality gate for this run: schedule only research-backed articles with quality score >= 90, remote duplicate-slug checks, and 5-hour future intervals from the current last scheduled post.
- `smallhomepick.com`: scheduled 79 new articles from the 92-point research/QA manifest `output/wp-jachi-sinhon-salim/docs/smallhomepick-additional-articles-022-100-manifest.json`. Live ledger: `data/schedule-ledger/smallhomepick-md-manifest-live-2026-07-10.json`, inserted=79, skippedExisting=0, errors=0.
- `travel.sellerpit.kr`: scheduled 51 new articles from the 97-point deepened travel export `D:\web\travelsellerpitkr\content-runs\travel-100-20260601-221305\exports\wp-posts-deepened.json`. Live ledger: `data/schedule-ledger/travel-sellerpit-html-export-live-2026-07-10.json`, inserted=51, skippedExisting=0, errors=0.
- Post-top-up SSH queue audit: `data/scheduled-queue-2026-07-10-smallhomepick-travel-after-topup.json`. It confirms `smallhomepick.com` futureCount=115 and lastScheduledAt=`2026-08-01T23:13:00+09:00`; `travel.sellerpit.kr` futureCount=145 and lastScheduledAt=`2026-08-09T18:00:00+09:00`.
- `kdramanote.com`: local quality report score=94 passed, but remote duplicate-slug preflight found all 100 eligible manifest rows already exist, so no new posts were inserted.
- `ezfunnel.kr` and `kang4.com`: existing local HTML top-up drafts were attempted safely and skipped as duplicates, with inserted=0 and errors=0.
- Remaining content work should not publish old unmatched drafts. `plategogo.com`, `pethomepick.com`, `kang4.com`, `ezfunnel.kr`, `jasamall.sellerpit.kr`, plus the remaining `smallhomepick.com` shortfall require fresh research-first generation, duplicate/cannibalization checks, and 90+ QA before scheduling.
- Dashboard snapshot refresh completed on 2026-07-10 with `pnpm stats:update`; 98 sites refreshed and the refresh summary reported zero GA4, GSC, sitemap, AdSense-code, or ads.txt failures.
- Latest dashboard snapshot for the current API-data triage: `data/site-stats.json` generated at `2026-07-10T05:25:30.576Z`.
- Ops triage was regenerated from direct evidence after the refresh. Current triage has 3 low-severity GSC sitemap-warning findings only: `nicewomen`, `autorentlab`, and `ezfunnel`.
- Ops finding quality was improved in `scripts/setup/update-ops-intel.ts`: sitemap warning findings now include exact sitemap path, warning/error count, submitted URL count, last downloaded time, and last submitted time in `sourceLine` and `recommendedAction`.
- Public read-only checks for those 3 sitemap-warning sites found homepage 200, sitemap 200, robots.txt 200 with matching Sitemap entries, canonical present, and no homepage noindex. The remaining warning should be inspected in GSC or resubmitted only after explicit external Search Console action authority.
- Vercel/API-data inventory refreshed with `pnpm exec tsx scripts/setup/audit-vercel-api-data-sites.ts`; current inventory is total=28, scheduled-db-ingestion=14, api-backed-content=11, candidate-review=3.
- API-data freshness triage added as `pnpm ops:api-data-freshness`; outputs are `data/vercel-api-data-freshness.json` and `docs/vercel-api-data-freshness.md`.
- Latest API-data freshness summary: content-followup=13, source-check-first=14, pipeline-repair-first=0, manual-review=1.
- Work order: `docs/work-orders/vercel-api-data-freshness-2026-07-10.md`.
- Todaypharm was checked first because it ranked high and has strong traffic. Direct GitHub evidence showed the scheduled public data sync, pharmacy content generator, and publish queue are currently healthy; content generation reported all pharmacies already covered.
- Dogswhere was checked next with read-only evidence. Public sitemap/feed were fresh on 2026-07-10, but Turso showed stale source place data (`places_latest_updated_at=2026-05-30T23:30:05.172Z`) and a content queue mismatch: blog_total=770, draft=741, published=28, scheduled=1.
- Dogswhere follow-up added `pnpm content:audit-queue` in `D:\web\dogswherecom`; it generated a local queue audit and review-only SQL with 511 draft-to-scheduled candidates, without applying live DB writes.
- Dogswhere live queue repair was later authorized and completed. Final audit in `D:\web\dogswherecom` showed futureDrafts=0, repairCandidates=0, scheduledFuture=512.
- Dogswhere post-repair cron verification is green. After the first scheduled time, `pnpm content:verify-publish` at `2026-07-10T05:01:40.869Z` showed draft=230, published=29, scheduled=511, dueScheduled=0, and the first scheduled slug `cheonan-city-park-dog-guide-2026-237` present in sitemap, feed, and `/blog/{slug}`.
- Dogswhere queue audit at `2026-07-10T05:00:59.617Z` showed futureDrafts=0, repairCandidates=0, scheduledFuture=511.
- Dogswhere place-source tooling was improved after queue repair. Added read-only `pnpm places:audit-source`, dry-run/live sync package commands, local `tsx` runner, and `--dry-run` support in `scripts/sync-pet-tour.ts`.
- Dogswhere place-source audit at `2026-07-10T05:12:56.187Z` confirmed the next blocker: totalPlaces=212, openPlaces=212, latestUpdatedAt=`2026-05-30T23:30:05.172Z`, ageDays=40, status=`stale-fail`, public `/api/places` 200. Dry-run source sync with area=1/maxTotal=1 succeeded with wouldSave=1 and no DB write.
- Current next target: treat the `dogswhere` queue repair as complete; if continuing this site, run a small live source sync sample only with explicit DB-write authorization, then audit the DB delta before considering a production cron/deploy.
- Guardrail: the initial API-data triage performed no live writes. The later authorized `dogswhere` queue repair performed only the draft-to-scheduled DB state update; it did not run publishing jobs, production deploys, Search Console writes, AdSense writes, or title/body mutations.
- Guardrail: the place-source improvement performed only read-only audit and API dry-run. It did not run live source sync, add a production cron, or deploy.
- Dashboard snapshot refresh completed on 2026-07-09 21:26 KST.
- Source command: `pnpm stats:update`.
- Latest snapshot files:
  - `data/site-stats.json`
  - `data/history/2026-07-09.json`
- Snapshot `generatedAt`: `2026-07-09T12:26:40.789Z`.
- Covered date ranges use `Asia/Seoul` completed-day basis through 2026-07-08.
- Affiliate workspace refreshed on 2026-07-09 21:27 KST with `pnpm ops:monetization`; output reported 35 affiliate programs, 35 affiliate items, and 18 high-value candidates.
- User correction applied on 2026-07-09: exclude site topics that already exist in the fleet.
- Current recommended affiliate WordPress topic is `남성 그루밍·면도·두피케어 제품 비교 가이드`, prepared as local package `output/wp-launch/groomingpicklab` for site name `그루밍픽랩`.
- Domain finalist selected on 2026-07-10: `groompicklab.com`. Dynadot production search reported available, non-premium, registration `10.88 USD`, renewal `10.88 USD`; account balance check reported `73.22 USD`.
- `groompicklab.com` deep reputation check found no DNS resolution, zero Internet Archive 200 captures, no helper-detected trademark hints, and risk score 0. Spamhaus DBL and AdSense monetization trace remain manual-review flags.
- SSH preflight found the intended ChemiCloud target through direct credentials because local alias `server-1` did not resolve: `rs6-kor.serverhostgroup.com`, user `nexttech`, WP-CLI `/usr/local/bin/wp`, PHP `/usr/local/bin/php`, MySQL `/usr/bin/mysql`, and starter root `/home/nexttech/blogsample2.nexttech7.com/wp-config.php`.
- Launch work order: `docs/work-orders/groompicklab-launch-2026-07-10.md`.
- Duplicate-topic exclusions from the refreshed dashboard snapshot include pet/dog, travel/camping, car, health/insurance, legal, AI/software, seller/shopping, wedding/family, education/certification, public-data/map, and broad beauty. The earlier `output/wp-launch/dogoutinglab` package is superseded because the fleet already has several pet/dog sites.
- Topic selection evidence: updated affiliate inventory favored low/medium-risk banner-capable programs such as Coupang Partners, Naver Shopping Connect, LinkPrice, and Korean shopping/product affiliate surfaces; updated site stats showed no dedicated male grooming/shaving/scalp-care site in the current fleet.
- External program checks were limited to official/public sources; live affiliate account eligibility, exact commission, allowed channels, API access, and generated tracking links remain gated.
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
- Coupang A/B/C weight optimizer was added on 2026-07-09 as `pnpm ops:coupang-optimize`. It reads recent assignment-level image requests and redirect calls, recommends bounded weights, and only writes when run with `--apply`.
- Runtime banner assets:
  - `public/assets/affiliate/coupang-theme-household-728x90.png`
  - `public/assets/affiliate/coupang-theme-pet-728x90.png`
  - `public/assets/affiliate/coupang-theme-car-outdoor-728x90.png`
  - `public/assets/affiliate/coupang-theme-tech-work-728x90.png`

## Verification Evidence

## 2026-07-11 Dashboard Verification and Cartain Title Experiment

- Fresh dashboard snapshot: `pnpm stats:update` completed at `2026-07-11T03:35:08.164Z` for 98 sites. GA4, GSC, sitemap, AdSense, and ads.txt failures were all 0.
- Verification guard: `scripts/setup/run-dashboard-verification.ts` now requires an explicit `DASHBOARD_URL` for rendered UI verification. This prevents `dashboard:post-recovery` from validating an unrelated service on port 3000. Targeted Vitest (19 tests), `pnpm type-check`, `pnpm build`, and `DASHBOARD_URL=http://127.0.0.1:3102/ pnpm dashboard:post-recovery` passed.
- Cartain title experiment: current GSC page/query evidence selected only the existing 2026 new-car release-schedule article. The title was updated without changing slug, body, excerpt, thumbnail, or publish date.
- Cartain API repair: `lsk7209/cartainkr` commit `a8197b0` makes the admin update route parse JSON string bodies, reject missing IDs, verify affected rows, and return success only after a real DB update. Lint and production build passed; Vercel deployment reached Ready.
- Live Cartain verification: cache-MISS API read confirmed the target ID/slug, exact updated title, intact excerpt/content/thumbnail fields, and `updatedAt=2026-07-11T03:49:58.324Z`. The public SSR page rendered the new title and `og:title`, canonical `https://cartain.kr/magazine/new-car-release-schedule-2026-second-half`, and index/follow robots metadata.

- 2026-07-11: `pnpm type-check` and `pnpm build` passed after removing the dashboard tab. A source guard confirmed no dashboard `banners` tab or banner-console reference remains in `app/page.tsx`.
- 2026-07-11: banner metric helper tests and banner store tests passed (10 assertions); targeted ESLint, TypeScript, and production build passed after the low-sample ranking fix.

- Content quality polish follow-up on 2026-07-10 completed grammar, structure, and queue-drift corrections for the scheduled-content top-up work.
- Harness: `.goal-harness/content-quality-polish-2026-07-10/` is complete.
- Grammar polish: `scripts/content-quality-polish-2026-07-10.mjs` applied 458 local artifact corrections and 434 remote future-post replacements across 208 scheduled posts; final verify `data/content-polish/remote-verify-after-2026-07-10.json` reported hitCount 0 and errors 0.
- Structural polish: `scripts/content-structural-diversify-2026-07-10.mjs` diversified repeated H2/source-note structure for `pethomepick.com`, `kdramanote.com`, and `kang4.com`; `data/content-polish/structural-local-apply-2026-07-10-c.json` showed outlineSignatureUniqueRatio 1.0, duplicateSourceNoteRatio 0, and topH2Share <= 0.35 for all three.
- Remote structural verify: `data/content-polish/structural-remote-verify-after-2026-07-10-final.json` checked 227 future posts and reported postsNeedingUpdate 0, errors 0.
- Queue drift repair: one additional `ezfunnel.kr` article was generated in `output/ezfunnel-extension-2026-07-10/` and scheduled with `data/schedule-ledger/ezfunnel-extension-live-2026-07-10.json` (`inserted=1`, errors 0).
- Final queue state: `data/scheduled-queue-2026-07-10-under30-after-final-polish.json` shows direct evidence for the 8 target sites; extracted check found under30Count 0. `ezfunnel.kr` is now futureCount 95, lastScheduledAt `2026-08-09T22:00:00+09:00`.
- Content queue top-up on 2026-07-10 used refreshed dashboard evidence from `data/site-stats.json` generated `2026-07-10T06:44:30.884Z`.
- `jasamall.sellerpit.kr`: generated 13 research-backed articles with quality report `output/jasamall-topup-2026-07-10/docs/quality-report.json` (`score=94`, pass, min sources 4) and scheduled them with `data/schedule-ledger/jasamall-html-export-live-2026-07-10.json` (`inserted=13`, errors 0). Reaudit `data/scheduled-queue-2026-07-10-under30-after-jasamall-topup.json` showed futureCount 94, lastScheduledAt `2026-08-09T18:00:00+09:00`.
- `smallhomepick.com`: generated 38 research-backed articles with quality report `output/smallhomepick-topup-2026-07-10/docs/quality-report.json` (`score=95`, pass, min article score 95, min sources 5, min body 4545 chars) and scheduled them with ledgers `data/schedule-ledger/smallhomepick-html-export-live-2026-07-10-b.json` (`inserted=37`) and `data/schedule-ledger/smallhomepick-html-export-live-2026-07-10-c.json` (`inserted=1`). Reaudit `data/scheduled-queue-2026-07-10-under30-after-smallhomepick-c-topup.json` showed futureCount 152, lastScheduledAt `2026-08-09T21:13:00+09:00`.
- `plategogo.com`: generated 92 research-backed static scheduled articles in `D:\web\plategogocom` with quality report `docs/content-topup-2026-07-10/quality-report.json` (`score=95`, pass, min article score 94, min body 4481 chars), committed as `6f20949`, pushed to GitHub, and verified Vercel production deployment `plategogo-pppeplopx-limsubs-projects.vercel.app` reached Ready from commit `6f20949`.
- Current 30-day queue status from `data/scheduled-queue-2026-07-10-under30-after-plategogo-topup.json`: complete for `smallhomepick.com`, `travel.sellerpit.kr`, `jasamall.sellerpit.kr`, and `plategogo.com`; remaining direct-evidence shortfalls are `kdramanote.com` 89, `pethomepick.com` 87, `kang4.com` 51, and `ezfunnel.kr` 34.
- `pnpm stats:update` completed successfully for 98 sites on the latest run, generating `data/site-stats.json` at `2026-07-10T05:25:30.576Z`.
- Summary: GA4 failed=0, GSC failed=0, GSC email alerts=0, sitemaps failed=0, AdSense code not detected=0, AdSense transient=0, ads.txt failed=0, ads.txt transient=0.
- `pnpm ops:intel` completed and regenerated `data/ops-intel.json` with detailed sitemap warning evidence.
- `pnpm ops:triage` completed and regenerated `data/ops-triage.json` plus `docs/ops-triage.md`.
- `pnpm test -- scripts/setup/update-ops-intel.test.ts scripts/setup/update-ops-triage.test.ts` passed.
- `pnpm type-check` passed.
- `pnpm lint` passed.
- `pnpm ops:monetization` completed successfully and regenerated `data/affiliate-inventory.json` and `data/banner-management.json`.
- `python C:\Users\dlatj\.codex\skills\wordpress-one-click-generator\scripts\wp-launch-package.py --target output\wp-launch\groomingpicklab --mode validate-only` returned `status: pass`, `errors: []`, `warnings: []`.
- `python C:\Users\dlatj\.codex\skills\wordpress-one-click-generator\scripts\wp_launch\export_writer_csv.py --seed output\wp-launch\groomingpicklab\docs\wp-content-seed.json --out output\wp-launch\groomingpicklab\docs\wp-writer-titles.csv` exported 100 rows.
- `python C:\Users\dlatj\.codex\skills\wordpress-one-click-generator\scripts\wp-launch-package.py --target output\wp-launch\dogoutinglab --mode validate-only` returned `status: pass`, `errors: []`, `warnings: []`.
- `python C:\Users\dlatj\.codex\skills\wordpress-one-click-generator\scripts\wp_launch\export_writer_csv.py --seed output\wp-launch\dogoutinglab\docs\wp-content-seed.json --out output\wp-launch\dogoutinglab\docs\wp-writer-titles.csv` exported 100 rows.
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
- `pnpm ops:coupang-optimize` dry-run on 2026-07-09 read the remote banner DB and returned `changedPlacements=0`. Current samples are still too small or have too few redirects for safe automatic reweighting.

## Next Steps

- Use the refreshed `data/site-stats.json` as the source of truth for dashboard-driven site prioritization.
- For `그루밍픽랩`, review `output/wp-launch/groomingpicklab/docs/wp-site-brief.md`, `wp-persona.md`, `wp-content-seed.json`, `wp-domain-candidates.json`, and `wp-launch-manifest.json` before any live domain, SSH, WordPress admin, affiliate dashboard, or publishing action.
- Current blocker: live Dynadot registration requires exact final confirmation for `groompicklab.com`, max/all-in price and currency, duration, and production account authority.
- Treat `output/wp-launch/dogoutinglab` as superseded unless the user explicitly asks to revive a pet/dog topic despite existing-site overlap.
- Keep publication blocked until persona review, 10-row contract audit, 5-draft dry run, affiliate channel/account approval, search visibility review, rollback review, and explicit live authorization are complete.
- Before the next refresh in a non-interactive Codex session, keep `pnpm-workspace.yaml` so approved build scripts for `esbuild`, `protobufjs`, and `sharp` do not block dependency restore.
- For a stronger click-through version, add impression/click-rate based weight updates so weak variants are automatically reduced and winning variants are promoted.
- Run `pnpm ops:coupang-optimize` daily as a dry-run until at least one placement has enough impressions and redirects. Use `pnpm ops:coupang-optimize -- --apply` only when the dry-run recommends changes backed by sufficient sample.
- Consider adding separate health and sports image themes after the first A/B/C performance window; those topics currently use the closest household or car/outdoor theme.
- Add a separate "Coupang accepted clicks" import/report if exact partner-side performance needs to appear in the dashboard. Internal redirect counts should not be used as revenue-performance proof.
- Monitor internal redirect counts against Coupang Partners accepted clicks; the dashboard now represents redirect-call activity, not partner-side approved click/reporting truth.

## 2026-07-10 Dashboard Refresh and Runtime Recovery

- Freshness: `pnpm dashboard:refresh` completed for 98 sites. The snapshot is `data/site-stats.json` generated at `2026-07-10T08:51:36.848Z`; GA4, GSC, sitemap, AdSense, and ads.txt collector failures were all 0.
- Direct operations triage has only three low-severity GSC sitemap warnings (`nicewomen`, `autorentlab`, `ezfunnel`). Public homepage, sitemap, robots, canonical, and noindex checks are clean; any resubmission remains an external Search Console action.
- Recovery: regenerated the current non-mutating fleet chain with `pnpm fleet:optimize -- --skip-stats-update --skip-api-data-audit`. It produced `data/fleet-optimization-chain-2026-07-10.json` with 4/4 commands passed and a matching snapshot.
- Runtime fix: Next.js 16/Turbopack could not resolve local TypeScript/TSX modules when App Router source imports used NodeNext `.js` specifiers. App source imports now omit local extensions and `tsconfig.json` uses `module=ESNext` with `moduleResolution=Bundler`.
- Verification: `pnpm type-check`, targeted Vitest (112 tests), `pnpm build`, and `pnpm dashboard:ui-smoke -- --url=http://127.0.0.1:3004/` passed. The browser smoke checked the current 98-site snapshot with 9 checks.
- Validation gap: repository-wide `pnpm lint` still reports 7 existing unused-variable errors in untracked content-generation scripts (`generate-jasamall-topup-articles.mjs`, `schedule-wp-html-manifest.mjs`, `schedule-wp-md-manifest.mjs`, and `topup-wordpress-drafts.mjs`); these are outside the dashboard runtime change.
- Deployment: GitHub `main` commit `30930aa` triggered Vercel production deployment `dpl_68vCyzgoi5h3pfkjxwN1pKE5axyS`. It is Ready at `https://multi-dashboard-one.vercel.app`; the deployment URL and production alias both returned HTTP 200 and rendered the 98-site dashboard.

## 2026-07-10 Read-Only Action Evidence Improvement

- Current dashboard review found that read-only mode replaced all 16 action rows with generic text, hiding distinct sitemap, traffic-drop, and CTR evidence.
- `app/page.tsx` now preserves each action's reason and read-only-safe inspection guidance. The known mutation instruction, Search Console sitemap resubmission, is replaced with a read-only status/lastmod/robots inspection until post-recovery passes.
- Regression evidence: focused ESLint passed; focused Vitest passed (4 files, 108 tests); `pnpm type-check`, `pnpm build`, and the 9-check rendered UI smoke passed for the current 98-site snapshot.
- Deployment: commit `084b414` reached Vercel production deployment `dpl_EVpN3PnWk6dJgZCzEaU5hoLRRfWo`. The production alias returned HTTP 200 with sitemap and GA4 evidence visible, resubmission text absent, and the read-only mutation-suppression marker present.

## 2026-07-11 Read-Only Candidate Confirmation

- Fresh snapshot: `data/site-stats.json` was regenerated at `2026-07-10T15:12:35.317Z`; all 98 GA4/GSC/sitemap collections completed normally.
- Confirmed candidates: only `softwa` has a meaningful GSC ranking/CTR signal, and only the `tennisfrens` Arthur Rinderknech page has page-query-backed title evidence. Both remain pending because the dashboard is read-only.
- Hold sitemap generator changes for `nicewomen`, `ezfunnel`, and `autorentlab`: public robots/sitemaps are healthy, while GSC submitted URL counts diverge from current public inventories. Exact Search Console warning details are required before a repair.
- `ezfunnel` and `dogbreedcost` remain GA4 low-sample/channel-unknown cases, not confirmed SEO declines.
