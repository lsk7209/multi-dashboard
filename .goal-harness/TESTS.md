# TESTS

## Required Checks

- Run/start: `pnpm dashboard:refresh`
- Lint: `pnpm lint`
- Typecheck: `pnpm exec tsc --noEmit --pretty false`
- Unit tests: focused stats collector and dashboard data tests, then relevant suite
- Build: `pnpm build`
- Smoke test: `pnpm dashboard:smoke` and public dashboard HTML/status check
- Domain-specific validation: inspect fresh `data/site-stats.json` and `getDashboardData()` output for zero `gscEmailAlerts` and zero Gmail-derived actions/insights

## Error And Edge Cases

- A direct GSC API error must still surface after email-alert removal.
- Existing historical snapshot content must not cause a Gmail-derived action after a fresh refresh.

## User Scenario Tests

- An operator opens the dashboard and sees the Ezfunnel direct sitemap error, but no Gmail-derived noindex/404/redirect action rows.

## Completion Checklist

- [ ] Available checks have been run or marked N/A with reasons.
- [ ] Failed checks have been fixed or documented as blocked.
- [ ] Acceptance criteria have matching evidence.
