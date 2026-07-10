# GOAL

## Final Deliverable

Implement the highest-value safe dashboard improvement identified from the current 98-site snapshot and the production UI. Verify it locally and in production through the Git-connected Vercel deployment.

## User Value

Operators can tell which current evidence needs attention, what is only an external follow-up, and what can be acted on locally without mistaking low-severity telemetry for a production blocker.

## Required Features

- Review fresh dashboard data, direct operations triage, Vercel API-data inventory, and the deployed UI.
- Implement one narrow, evidence-backed dashboard improvement with regression coverage.
- Preserve read-only actionability gating and do not mutate external sites, databases, or Search Console.
- Record decisions, validation, and deployment evidence in this harness and project handoff.

## Non-Goals

- No publishing, database writes, GSC changes, or AdSense console actions.
- No broad redesign or cleanup of unrelated generated files.

## Done Conditions

- The chosen improvement is visible on the affected dashboard workflow and is backed by current artifacts.
- Focused tests, typecheck, build, and a rendered UI smoke pass.
- The change is committed, pushed to `main`, deployed by Vercel, and verified at the production alias.

## User-Visible Result

The production dashboard exposes a clearer, safer next action for the current refresh state.
