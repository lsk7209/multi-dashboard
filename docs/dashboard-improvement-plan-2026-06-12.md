# Dashboard Improvement Plan - 2026-06-12

## Current Snapshot

- Snapshot generated at: `2026-06-12T12:33:15.641Z`
- Sites in dashboard: 83
- Date basis: completed days, `2026-06-05` through `2026-06-11`
- GA4 failures: 0
- GSC failures: 1
- Sitemap failures: 1
- AdSense loader failures: 0
- ads.txt failures: 0

## P0 - Restore Collection Reliability

### GitHub Actions

Status:
- Commit `07a8e67` was pushed to `origin/main`.
- `Update dashboard stats` was changed from twice daily to once daily at 07:00 KST.
- Workflow lint blocker in tracked code was removed.
- Manual workflow dispatch `27416661426` completed successfully.
- GitHub Actions created follow-up snapshot commit `c3a8516`.

Next checks:
- Confirm the next scheduled 07:00 KST run also succeeds.
- If it fails, inspect the failed step log and patch the workflow or validation gate.
- Keep Vercel deployment through GitHub only.

### `travelpang.kr` GSC Verification

Evidence:
- Dashboard reports `gscStatus=auth_error` and sitemap permission error.
- `pnpm diag` confirms true GSC permission issue, not stale dashboard data.
- Search Console property list shows `https://travelpang.kr/` as `siteUnverifiedUser`.

Plan:
- Re-verify ownership for `https://travelpang.kr/` in Search Console.
- Preferred technical route: add/restore Google verification file or meta tag on the WordPress site, then verify.
- After verification, run `pnpm diag` and `pnpm stats:update`.

Tier:
- T2. This touches production site verification state and needs a rollback/backup-aware change path if adding a file or meta tag.

## P1 - Investigate GA4 Measurement Gaps

### `finan.kr`

Evidence:
- GA4 property `520579523` stream measurement ID: `G-BX75JB1MM9`.
- Public HTML includes `G-BX75JB1MM9`.
- GSC last 30 days: 197 impressions, 4 clicks.
- GA4 last 30 days: 4 users.

Interpretation:
- GA4 property mapping and public tag are correct.
- Treat as low-volume organic traffic plus possible tag execution or consent/cache issue, not a missing-tag issue.

Next checks:
- Verify page_view events in GA4 Realtime during a controlled visit.
- Check whether caching, consent mode, ad blockers, or delayed script loading suppresses hits.

### `homeimer.com`

Evidence:
- GA4 property `519582866` stream measurement ID: `G-G9P7DNWRL8`.
- Public HTML includes `G-G9P7DNWRL8`.
- GSC last 30 days: 281 impressions, 0 clicks.
- GA4 last 30 days: 0 users.

Interpretation:
- GA4 property mapping and public tag are correct.
- Since GSC clicks are 0, this may be real traffic absence rather than broken GA4. Still verify Realtime with a controlled visit.

Next checks:
- Trigger one controlled page view and check GA4 Realtime.
- If Realtime does not receive it, inspect script execution, CSP, caching, and consent behavior.

Tier:
- Audit first. Any WordPress mu-plugin or theme change is T2.

## P1 - Traffic And Search Decline Triage

GA4 user-drop candidates:
- `ehon365.kr`: 150 users vs previous 521.
- `tennisfrens.com`: 429 users vs previous 971.

GSC click-drop candidates:
- `picklefriend.kr`: 12 clicks vs previous 33.
- `fastjob.kr`: 5 clicks vs previous 11.
- `haemongdream.com`: 9 clicks vs previous 16.

Plan:
- Pull top GSC queries/pages for each candidate.
- Separate ranking/CTR loss from content freshness or seasonality.
- Check whether recent publishing, sitemap, robots, canonical, and feed are healthy.

Evidence from GSC `2026-06-05..2026-06-11`:
- `ehon365.kr`: main opportunity is `양육비 산정표 2026` at avg position ~10.5 with CTR ~1.2%; homepage receives almost all impressions.
- `tennisfrens.com`: `ntrp 테스트` remains strong at avg position ~1.2; decline is likely traffic mix/volume rather than a total SEO break.
- `picklefriend.kr`: page-level clicks still exist; `indoor-courts-seoul-2026` has 30 impressions at avg position ~8.1 with CTR ~6.7%, worth title/meta/content freshness review.
- `fastjob.kr`: GSC rows are fragmented across low-volume long-tail pages; this looks like topic/intent fragmentation rather than a single technical outage.
- `haemongdream.com`: impressions are spread across many dream-query URLs; page-level clicks exist, so investigate content scale/CTR rather than GSC connectivity.

Tier:
- Audit/T3 for editorial changes.
- T2 for canonical/schema/sitemap/layout changes.

## P2 - Google Visibility Zero Candidates

Sites with meaningful GA4 users but zero GSC clicks and zero impressions:
- `luckyday.kr`
- `crepika.com`
- `klick.kr`
- `spinkorea.kr`

Plan:
- Verify GSC property form and sitemap submission.
- Check robots, canonical host, sitemap URL, RSS/feed, and IndexNow readiness.
- If content exists but Google impressions remain zero, queue URL inspection/indexing work.

Evidence:
- GSC query/page rows are empty for all four sites in `2026-06-05..2026-06-11`.
- Dashboard still has GA4 users for these sites, so this is not necessarily site downtime.
- Treat as Google discovery/indexing/property-form triage, not CTR optimization.

Tier:
- Audit first.
- Indexing API setup or sitemap/canonical changes are T2.

## P2 - Dashboard Data Quality

Finding:
- 31 sites have no `lastPublishedAt` in the dashboard snapshot.

Plan:
- Prioritize high-traffic sites without publish metadata.
- Add or repair `contentSource` metadata where SSH/WordPress source is known.
- Keep this as dashboard accuracy work, not production content work.

Tier:
- T1/T2 depending on whether the change is local dashboard config only or requires production access.
