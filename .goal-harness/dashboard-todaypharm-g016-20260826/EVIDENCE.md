# Evidence

- Default-budget proof: with `STATS_UPDATE_RUN_TIMEOUT_MS` removed from the process environment, `pnpm stats:update` logged `runTimeoutMs=900000`, exited 0, and wrote 113 sites at `2026-08-26T12:47:22.978Z`.
- The same run recorded one content-phase timeout (`kdramanote`) with `collectionFailureError`, while retaining current GA4/GSC/AdSense statuses as `ok`; runtime dashboard extraction returned `kind=data`, `priority=97`, `value=콘텐츠 수집 실패`.
- Focused regression suite passed 3 files / 98 tests. Full validation passed TypeScript, ESLint, 33 files / 293 tests, and the Next.js production build.
- Runtime smoke passed: 113 sites, 16 actions, 82 insights, current fleet chain, 8 checks. The readiness verdict remains intentionally blocked by GSC access evidence for `lim01.soonsaak.co.kr`, `picturebooks.kr`, and `kang4.com`.
- Independent test review found no remaining code-level blocker after partial-stat preservation and the no-override 113/113 run.
- Todaypharm `origin/main` already includes pharmacy sitemap chunks/counts filtered by `PHARMACY_INDEXABLE_WHERE`; its public home, sitemap index, blog sitemap, and sampled article were reachable with canonical/index metadata.
- Todaypharm local source is dirty and `main...origin/main [ahead 2, behind 6]`; no merge, reset, production DB write, sitemap submission, AdSense action, or Vercel CLI/API mutation was performed.
- API-data inventory refreshed read-only at `2026-08-26T12:27:29.275Z`; Todaypharm remains a Next.js scheduled DB/API-data site, with local source evidence dated 2026-08-23 through 2026-08-24.
