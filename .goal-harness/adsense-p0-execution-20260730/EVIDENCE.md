# Evidence

## Scope
- Started: 2026-07-30 18:50 KST
- Completed: 2026-07-30 20:00 KST
- Targets: `gradienttrail.com`, `nongsusangogo.kr`, `chatgipt.kr`, `shotsetup.com`
- Explicit edit holds excluded: `plategogo.com`, `caregos.com`
- Permanent exclusion: `picturebooks.kr`
- Production DB mutation allowed/performed: `false` / `false`

## Fresh evidence
- Pre-change `pnpm stats:update`: PASS; snapshot `2026-07-30T09:57:00.509Z`, 99 sites, GA4/GSC/sitemap failures 0.
- `pnpm ops:api-data-freshness`: PASS; content-followup 8, source-check-first 17, pipeline-repair-first 1, manual-review 2. GradientTrail and Nongsusan were read-only `source-check-first` checks.
- Targeted readiness audit: PASS command; Shotsetup `review`, score 90, issues 0. The other three results exposed the audit's site-wide-loader assumption rather than proving site defects.

## Site evidence and decisions
- GradientTrail: `D:\web\park-trail` was heavily dirty; `origin/main=049738b` and Vercel status were successful. Current source intentionally scopes the loader to reader articles. Live `https://gradienttrail.com/us-trails/articles/acadia-carriage-road-gentle-hike` contained `pagead2` and publisher evidence. The collector-selected hub was a false positive; no site change was made.
- Nongsusan: `D:\web\nongsusangogo` had three pre-existing dirty files; `origin/main=3086b12`, Vercel/Actions successful. HANDOFF records `publicLaunchAllowed=false`, `publishAllowed=false`, `dataMode=fixture_fallback`, missing KAMIS credentials, and intentional advertising containment. No site/config/DB/publish mutation was made.
- Chatgipt: actual source is WordPress 7.0.2 over SSH alias `chatgipt`, root `/home/chatgipt/public_html`. MU plugin emits the loader only for singular posts. Live `https://chatgipt.kr/llm-batch-api-cost-2/` contained `pagead2` and publisher evidence. Dashboard `local-app` metadata was stale; no WordPress write was made.
- Shotsetup: readiness score 90 with 0 issues; trust pages, loader, ads.txt, and sitemap passed. No site change was required.

## Implemented dashboard change
- `scripts/setup/lib/sites.ts`: optional validated `adsenseSampleUrls`.
- `scripts/setup/update-ga4-stats.ts`: configured reader sample precedes sitemap discovery.
- `scripts/setup/update-ga4-stats-sitemap.test.ts`: network-free precedence regression test.
- `scripts/setup/sites.yaml`: GradientTrail/Chatgipt reader samples; Chatgipt metadata corrected to `wordpress-ssh` and actual root.

## Isolated validation
- Worktree: `D:\web\multi-dashboard-adsense-reader-20260730`, based on `origin/main=26483e6`.
- `pnpm exec vitest run scripts/setup/update-ga4-stats-sitemap.test.ts`: PASS, 1/1.
- Changed-file ESLint: PASS.
- sites.yaml schema/value assertion: PASS.
- `pnpm type-check`: PASS.
- `pnpm test`: PASS, 31 files and 284 tests.
- `pnpm build`: PASS, Next.js production build and TypeScript.
- `git diff --check`: PASS.
- The primary checkout's earlier type-check failure at `app/components/banner-management-console.tsx:229` was confirmed unrelated; clean `origin/main` validation passed.

## Git and deployment
- Scoped commit: `6114c61` (`fix(adsense): sample reader-scoped pages`).
- Remote branch: `fix/adsense-reader-samples-20260730`.
- PR: https://github.com/lsk7209/multi-dashboard/pull/50
- Vercel Preview: PASS; PR mergeable.
- Squash merge: `8606aed9059647d856ef3f739dd83b7481b3c205` at `2026-07-30T10:40:36Z`.
- Git-connected Vercel production status: SUCCESS at `2026-07-30T10:41:03Z`.
- Live alias: `https://multi-dashboard-one.vercel.app/?v=8606aed` returned HTTP 200, 1,161,176 bytes, and rendered all four P0 site rows.
- Independent reviewer subagent could not run because the service throttled the request; PR CI and complete local verification remained successful.

## Post-deploy verification
- A first isolated refresh failed closed before collection because the worktree intentionally lacked gitignored `GCP_SA_KEY_JSON`; no output or external mutation occurred.
- Re-run used `SETUP_KEY_FILE=D:\web\multi-dashboard\.env.setup.local` by path reference only, without copying or exposing secrets.
- Final `pnpm stats:update`: PASS; snapshot `2026-07-30T10:58:20.646Z`, 104 sites, GA4/GSC/sitemap failures 0, AdSense transient 0, ads.txt transient 0.
- Final states:
  - GradientTrail: `adsense=ok`, `adsTxt=ok`, configured article HTTP 200, `matchedSignal=pagead2`.
  - Chatgipt: `adsense=ok`, `adsTxt=ok`, configured post HTTP 200, `matchedSignal=pagead2`.
  - Shotsetup: `adsense=ok`, `adsTxt=ok`, sample HTTP 200, `matchedSignal=pagead2`.
  - Nongsusan: `adsense=missing_config`, `adsTxt=ok`; intentional launch/publish hold retained.
  - Caregos: existing `adsense=editorial_hold` retained.
  - Picturebooks: `monetization=false` retained.
- `pnpm adsense:queue`: PASS; snapshot `2026-07-30T10:58:20.646Z`, 89 reviewed rows, 3 ordinary proof rows. GradientTrail, Chatgipt, and Shotsetup are absent; Nongsusan remains recorded for manual hold handling and must not trigger site remediation before its release gates change.
