# ACCEPTANCE

## Feature Criteria

| Criteria | Status | Evidence |
|---|---|---|
| Fresh 98-site dashboard evidence | PASS | `data/site-stats.json` generated at `2026-07-14T00:43:04.577Z` |
| Content timeout does not fabricate service incidents | PASS | Focused regression tests plus `data/ops-intel.json` / `data/ops-triage.json` show one `discparty` collection timeout |
| Search, content, AdSense, and monetization follow-up is ranked | PASS | `data/fleet-optimization-plan-2026-07-14.json`, `data/t3-title-content-handoff-2026-07-14.json`, and fleet work order |
| API-source data is gated before content work | PASS | `data/vercel-api-data-freshness.json`: 28 sites, zero source measurements, explicit read-only next steps |
| Local application validation | PASS | Focused Vitest 7/7, typecheck, build, dashboard verification 4/4 `local_verified` |
| Git-connected production deployment serves committed snapshot | PENDING | Complete after task-only commit, push, Vercel Ready, and live HTTP/snapshot check |

## User Flow Criteria

| Criteria | Status | Evidence |
|---|---|---|
| Dashboard reports collector maintenance separately from site defects | PASS | Current ops artifacts report one content timeout rather than synthetic GA4/GSC/AdSense/ads.txt failures |
| Operators receive safe next actions instead of a bulk content command | PASS | Current fleet and API-data work orders require site-level read-only evidence before mutations |

## Stability And Error Handling

- PASS: late content probe timeouts preserve completed service data.
- PASS: missing source-data measurements remain explicit and block content actions.

## Documentation Criteria

- PASS: `docs/HANDOFF.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, and current work orders record source evidence, safety boundary, next steps, and verification.

## Final Report Requirements

- implementation summary
- changed files
- validation level
- commands run
- acceptance status
- known limitations
- how to run
