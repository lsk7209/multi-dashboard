# PLAN

## Classification

- Size: medium
- Domain Profile: general

## Phase 1

- Objective: Map every executable Gmail digest dependency in the refresh-to-dashboard path.
- Tasks: Inspect the stats collector, dashboard data builder, UI helpers, and existing tests; record the current leak into the action queue.
- Expected Files: read-only inspection plus harness evidence.
- Completion Criteria: All removal points and regression checks are identified.
- Test Point: focused test discovery and an action-queue fixture/run.
- Rollback/Recovery: Keep direct collector error handling untouched.

## Phase 2

- Objective: Remove Gmail digest ingestion and presentation without weakening direct evidence collection.
- Tasks: Delete obsolete collector types/functions/wiring; remove dashboard action, insight, and panel branches; add or update focused tests.
- Expected Files: `scripts/setup/update-ga4-stats.ts`, `app/lib/dashboard-data.ts`, `app/page.tsx`, relevant tests.
- Completion Criteria: Refresh data does not contain `gscEmailAlerts`; action queue and GSC issues exclude Gmail-derived rows.
- Test Point: focused tests, typecheck, and a fresh local dashboard data read.
- Rollback/Recovery: Revert the task commit; direct API errors remain visible independently.

## Phase 3

- Objective: Validate, deploy through Git, and prove the public dashboard reflects direct-only operations.
- Tasks: Run dashboard refresh and project checks, inspect artifacts, commit/push/merge, verify Vercel production and public dashboard response.
- Expected Files: task code, generated snapshot artifacts, harness evidence.
- Completion Criteria: All acceptance criteria pass with command and production evidence.
- Test Point: `pnpm dashboard:refresh`, tests, typecheck, lint, build, dashboard acceptance, Vercel/public smoke.
- Rollback/Recovery: Revert the merged commit if direct collection regresses; no managed-site data is mutated.
