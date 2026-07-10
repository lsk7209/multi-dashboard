# Vercel API Data Freshness - 2026-07-10

## Scope

- Refresh dashboard evidence before site prioritization.
- Inventory Vercel/Next.js API-data sites without production writes.
- Identify content follow-up candidates from direct dashboard, repo, public sitemap/feed, and GitHub workflow evidence.

## Commands

- `pnpm stats:update`
- `pnpm exec tsx scripts/setup/audit-vercel-api-data-sites.ts`
- `pnpm ops:intel`
- `pnpm ops:triage`
- `pnpm ops:api-data-freshness`
- `pnpm type-check`

## Evidence

- Dashboard refresh covered 98 sites and reported GA4 failed=0, GSC failed=0, sitemap failed=0, AdSense-code missing=0, ads.txt failed=0.
- `data/site-stats.json` generated at `2026-07-10T02:18:04.373Z`.
- Vercel API-data inventory generated at `2026-07-10T02:18:12.135Z`: total=28, scheduled-db-ingestion=14, api-backed-content=11, candidate-review=3.
- Direct ops triage found 3 low-severity findings only: critical=0, high=0, medium=0, low=3.
- API-data freshness generated at `2026-07-10T02:51:39.193Z`: content-followup=13, source-check-first=14, pipeline-repair-first=0, manual-review=1.
- The freshness script is read-only for external systems and records mutation flags as false.

## Todaypharm Check

- Repo: `lsk7209/today_yakuk`.
- Local path inspected: `D:\web\todaypharm`.
- Local repo had pre-existing changes in `src/app/nearby/NearbyClient.tsx`; no edits were made there.
- Latest `Scheduled Public Data Sync` run succeeded on GitHub. Log evidence showed pharmacy sync completed in 115s with final batch `25201-25241`.
- Latest `Generate Pharmacy Content` run succeeded and reported that all pharmacies already have content.
- Latest `Publish Content Queue` run succeeded, published 1 item, accepted IndexNow submissions, and submitted the sitemap to GSC.
- Conclusion: todaypharm has a healthy data/publish pipeline and no immediate uncovered pharmacy-content gap from the checked evidence.

## Next Target

- Continue with `dogswhere` as the next API-backed content follow-up candidate.
- Reason: it has fresh sitemap/feed evidence on 2026-07-10, meaningful 7-day users, no high-severity ops blocker, and todaypharm is already covered by its current pipeline evidence.

## Dogswhere Read-Only Check

- Local path inspected: `D:\web\dogswherecom`.
- Repo: `lsk7209/dogwhere`.
- Local repo already had modified Python cache files and untracked `.omc`, `.omx`, and content repair/generation artifacts; no edits were made there.
- Public sitemap check returned 200 with 353 URLs and latest lastmod `2026-07-10T02:53:28.216Z`.
- Public feed check returned 200 and `lastBuildDate` of `Fri, 10 Jul 2026 02:53:28 GMT`.
- GitHub Actions run list for `lsk7209/dogwhere` returned no recent runs.
- Local `pnpm exec tsx scripts/check-db.ts` could not run because `tsx` is not installed in that repo; no dependency install was performed.
- Read-only Turso query via installed `@libsql/client` showed places_total=212, places_open=212, places_latest_updated_at=`2026-05-30T23:30:05.172Z`.
- Read-only Turso query showed blog_total=770: draft=741, published=28, scheduled=1.
- Blog latest published timestamp is `2026-06-26T06:30:21.698Z`; draft latest update is `2026-06-26T06:11:41.561Z`.
- 511 draft rows have future `published_at` values from `2026-07-10T04:00:00.000Z` through `2026-10-24T15:00:00.000Z`, but only 1 row has status `scheduled`.
- Conclusion: dogswhere's next useful work is not a new API backfill. The immediate blocker is the draft/scheduled/published state mismatch and queue repair around the 741 draft rows.
- Follow-up completed in `D:\web\dogswherecom`: added read-only `pnpm content:audit-queue`, generated `docs/work-orders/dogswhere-queue-audit-2026-07-10.md`, and produced review-only SQL with 511 draft-to-scheduled UPDATE candidates. No live DB writes were applied.
- Live repair follow-up was later authorized and completed in `D:\web\dogswherecom`: final audit showed `futureDrafts=0`, `repairCandidates=0`, `scheduledFuture=512`; no deploy, manual cron publish, IndexNow, or GSC submission was run.
- Post-repair readiness: `pnpm build` passed in `D:\web\dogswherecom`; `pnpm content:verify-publish` was added and passed before the first due time with `dueScheduled=0`. Next cron verification is meaningful after `2026-07-10T04:00:00.000Z`.
- Post-cron verification completed at `2026-07-10T05:01:40.869Z`: `pnpm content:verify-publish` showed draft=230, published=29, scheduled=511, dueScheduled=0, and `cheonan-city-park-dog-guide-2026-237` present in sitemap, feed, and its public blog page. Re-run queue audit showed `futureDrafts=0`, `repairCandidates=0`, `scheduledFuture=511`.
- Place-source follow-up improved local tooling without live writes: added `pnpm places:audit-source`, `pnpm places:sync-pet-tour`, `pnpm places:sync-pet-tour:dry-run`, `tsx`, and `--dry-run` support in `scripts/sync-pet-tour.ts`.
- Place-source audit at `2026-07-10T05:12:56.187Z` confirmed the next blocker: `latestUpdatedAt=2026-05-30T23:30:05.172Z`, ageDays=40, status=`stale-fail`, totalPlaces=212, openPlaces=212. Dry-run source sync for area=1/maxTotal=1 succeeded with wouldSave=1 and no DB write.

## Guardrails

- Do not use gmail-digest as source of truth.
- Do not run live DB writes, publishing jobs, production deploys, Search Console writes, AdSense writes, or title/body mutations from this work order without explicit authorization.
- For each target site, verify the current source data or workflow evidence before creating or refreshing content.
