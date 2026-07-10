# PLAN

## Classification

- Size: large
- Domain Profile: general

## Phase 1

- Objective: Establish the current source of truth and select a safe, high-impact dashboard improvement.
- Tasks: Review the fresh snapshot, direct triage, API-data inventory, deployed UI, and dashboard actionability code; compare independent review findings.
- Expected Files: harness evidence and review documents only.
- Completion Criteria: One improvement has concrete user impact, local file scope, and an explicit validation plan.
- Test Point: Current artifacts parse and production dashboard returns HTTP 200.
- Rollback/Recovery: Keep external data and site operations read-only.

## Phase 2

- Objective: Implement the selected improvement without weakening actionability gates.
- Tasks: Add focused behavior and regression tests using established dashboard patterns.
- Expected Files: affected `app/` modules and focused tests.
- Completion Criteria: Current evidence is represented accurately and blocked states remain explicit.
- Test Point: Focused tests and typecheck pass.
- Rollback/Recovery: Revert only the new commit if validation or live behavior regresses.

## Phase 3

- Objective: Validate, document, and deploy the completed dashboard change.
- Tasks: Run build and rendered smoke, update harness/project handoff, commit, push, await Vercel, and check the production alias.
- Expected Files: harness evidence/review, project handoff/status, coherent source/test files.
- Completion Criteria: Acceptance criteria are marked with evidence and Vercel production is Ready.
- Test Point: build, UI smoke, production HTTP check.
- Rollback/Recovery: Use the prior Vercel deployment or a Git revert if the production check fails.
