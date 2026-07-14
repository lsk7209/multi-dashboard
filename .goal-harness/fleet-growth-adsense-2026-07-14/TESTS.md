# TESTS

## Required Checks

- Run/start: `pnpm dashboard:refresh` regenerates current dashboard artifacts.
- Lint: changed-file ESLint, then project lint if timing permits.
- Typecheck: `pnpm type-check`.
- Unit tests: collector state and ops-intel focused Vitest; applicable artifact/planning suites.
- Build: `pnpm build`.
- Smoke test: `pnpm dashboard:verify --skip-stats-update`; runtime/UI smoke against the owned dashboard when available.
- Domain-specific validation: snapshot integrity; direct finding count; AdSense/ads.txt, indexability/canonical/sitemap/robots evidence; content-quality and duplication evidence coverage; GSC/GA4 status.

## Error And Edge Cases

- Content-phase site timeout after completed GA4/GSC/monetization probes.
- GA4 quota failures versus a site-level collection timeout.
- Disabled monetization sites must not be reported as failed.
- Missing Vercel/API source-data collector must remain an explicit freshness gap.

## User Scenario Tests

- Operator sees one `collection_timeout` finding for `discparty`, not four service incidents.
- Operator can distinguish a verified optimization candidate from a recommendation blocked by missing source evidence.

## Completion Checklist

- [ ] Available checks have been run or marked N/A with reasons.
- [ ] Failed checks have been fixed or documented as blocked.
- [ ] Acceptance criteria have matching evidence.
