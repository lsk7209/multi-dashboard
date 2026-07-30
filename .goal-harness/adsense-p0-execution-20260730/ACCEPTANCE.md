# Acceptance

- [x] Pre-change dashboard snapshot is fresh and P0 targets are reconciled. — `2026-07-30T09:57:00.509Z`, 99 sites, GA4/GSC/sitemap failures 0.
- [x] Relevant API-data freshness is checked read-only before material site work. — `pnpm ops:api-data-freshness` succeeded; GradientTrail and Nongsusan were `source-check-first` with no blockers; no DB write followed.
- [x] Each target has verified repo/stack/deployment/dirty-state evidence. — Park Trail and Nongsusan Git/Vercel state, Chatgipt WordPress SSH/MU plugin, and Shotsetup live/readiness evidence were inspected.
- [x] No active editorial or launch hold is bypassed. — Nongsusan remained unchanged under `publicLaunchAllowed=false`, `publishAllowed=false`, and fixture-fallback constraints; Plategogo/Caregos were excluded.
- [x] Every implemented change is minimal and appropriately scoped. — Only the dashboard evidence adapter/schema/test and two site metadata blocks changed; no site repository or WordPress files changed.
- [x] Relevant lint/test/build checks pass for every changed component. — Targeted Vitest 1/1, ESLint, schema parse, `pnpm type-check`, full tests 284/284, and `pnpm build` passed in the clean worktree.
- [x] Every deployment is verified live for the intended fix. — PR #50 Preview passed; merge commit `8606aed` received Vercel production success; public alias returned HTTP 200 and rendered all four P0 rows.
- [x] Post-change dashboard evidence confirms the expected state or records a concrete hold. — Final snapshot `2026-07-30T10:58:20.646Z`: GradientTrail/Chatgipt/Shotsetup `ok`; Nongsusan remains intentional hold. Queue excludes the three resolved sites.
- [x] No unrelated worktree changes, production DB writes, or permanent exclusions are touched. — Dirty primary worktree was preserved via an isolated worktree and explicit file staging; `picturebooks.kr` remains non-monetized.
