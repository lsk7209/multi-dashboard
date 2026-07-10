# ACCEPTANCE

## Feature Criteria

| Criteria | Status | Evidence |
|---|---|---|
| Fresh dashboard evidence is used for prioritization, not stale digest data. | Pending | Current `site-stats`, `ops-triage`, and API-data inventory reviewed. |
| The selected improvement makes the current operator next step or constraint clearer without changing external systems. | Pending | Focused UI/data behavior test and rendered smoke. |
| Existing read-only actionability gating remains intact. | Pending | Existing actionability tests plus focused regression test. |

## User Flow Criteria

| Criteria | Status | Evidence |
|---|---|---|
| An operator can see the new evidence state and its safe next action from the dashboard. | Pending | Rendered UI smoke. |

## Stability And Error Handling

| Criteria | Status | Evidence |
|---|---|---|
| Typecheck and production build pass. | Pending | `pnpm type-check`, `pnpm build`. |
| The affected dashboard route renders from the current snapshot. | Pending | Local UI smoke and production HTTP check. |

## Documentation Criteria

| Criteria | Status | Evidence |
|---|---|---|
| Harness, project handoff, and status record the implemented decision and validation results. | Pending | Updated documents in the deployment commit. |

## Final Report Requirements

- implementation summary
- changed files
- validation level
- commands run
- acceptance status
- known limitations
- how to run
