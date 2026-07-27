# Evidence

- Failure: the fresh chain at snapshot `2026-07-27T12:40:42.252Z` had 4/4 command passes but exposed `skipped_refresh_failed:adsense:editorial_hold:1`. `pnpm dashboard:smoke` then failed because its readiness-blocker branch requires a GSC audit blocker that does not exist.
- Cause: `isSuccessfulOrSkippedStatus()` recognizes `ok`, `disabled`, and `not_applicable`, but not the deliberate `editorial_hold` status.
- Repair: limited the `editorial_hold` non-failure classifier to `adsenseStatus`; GSC and collector fields remain readiness failures. Focused tests lock both the intended hold and negative cases.
- `pnpm exec vitest run scripts/setup/create-fleet-optimization-plan.test.ts`: PASS, 7 tests.
- `pnpm type-check`: PASS.
- `pnpm lint`: PASS.
- `pnpm build`: PASS.
- `pnpm fleet:optimize -- --date=2026-07-27 --skip-stats-update --skip-api-data-audit`: PASS, snapshot `2026-07-27T12:40:42.252Z`, 4/4 commands passed.
- `pnpm dashboard:smoke`: PASS, 103 sites, current chain, ready verdict, 8 checks.
- `pnpm dashboard:ui-smoke` against a temporary local production server: PASS, 103 sites, 10 checks. The server was stopped after the test.
