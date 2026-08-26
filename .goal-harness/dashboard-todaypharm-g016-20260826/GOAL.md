# Goal

## Final Deliverable

Improve the dashboard collector so a 113-site refresh completes under the supported configuration and content-phase timeouts are visibly actionable, then audit and safely improve the highest-priority `todaypharm.kr` quality/indexing slice using current first-party evidence.

## User Value

The dashboard should not silently look healthy after partial collection failure, and the next AdSense-readiness investment should target real high-volume quality risk instead of stale assumptions.

## Required Features

- Preserve the fresh `2026-08-26T11:31:44.665Z` dashboard evidence contract.
- Make full-run timeout behavior appropriate for the current 113-site fleet.
- Surface content-phase collection failure in dashboard/action evidence without converting already completed connectors into synthetic failures.
- Audit `todaypharm.kr` local source, public routes, sitemap/index controls, API-data freshness and YMYL trust boundaries.
- Apply only a bounded reversible change supported by the audit, with tests/build/public verification.

## Non-Goals

- No AdSense review/resubmission or Sites API mutation.
- No GSC sitemap submission, IndexNow request, live API backfill, production DB write, Vercel CLI/API mutation, DNS or account change.
- No bulk article generation or unsupported medical claims.
- No changes to `jeompolab.com` monetization exclusion.

## Done Conditions

- Focused regression tests prove collector timeout/failure visibility behavior.
- Dashboard lint, typecheck, tests and build pass for changed code.
- Todaypharm audit evidence identifies the exact risk and a bounded improvement is implemented or explicitly blocked by evidence.
- Site checks/build and public verification pass for any applied site change.
- Handoff, evidence, rollback and remaining risks are durable.

## User-Visible Result

The dashboard clearly identifies partial content collection failures, refresh configuration matches fleet size, and todaypharm has one evidence-backed quality/indexing improvement with no external review submission.
