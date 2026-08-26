# Plan

## Phase 1 — Evidence and design

- Objective: bind current snapshot, collector failures and todaypharm source ownership.
- Tasks: inspect collector/UI/tests; run API-data inventory; inspect todaypharm repo/public routes.
- Expected files: harness evidence and audit artifacts.
- Completion criteria: root causes and bounded edit surfaces are identified.
- Test point: reproduce failure semantics through existing unit tests/fixtures.
- Recovery: no mutation; preserve current generated snapshot and dirty worktree.

## Phase 2 — Dashboard implementation

- Objective: fix default run-budget and failure visibility with the smallest change.
- Tasks: add regression tests first, patch collector/data/UI path, update docs if configuration changes.
- Expected files: collector, dashboard data/UI and focused tests only as required.
- Completion criteria: focused tests pass and failed content collection is observable.
- Test point: Vitest, typecheck, lint, build.
- Recovery: revert only G016 source/test hunks; generated stats remain separate.

## Phase 3 — Todaypharm bounded improvement

- Objective: correct one verified content/index/YMYL quality risk.
- Tasks: inspect fresh DB state read-only, public sample set, local repo; implement narrow local change; test/build; push only if coherent and authorized by existing site-fix authority.
- Expected files: todaypharm source/tests/docs as supported by evidence.
- Completion criteria: change is reversible and verified against representative routes.
- Test point: project-native tests/typecheck/build and public GET after Git-connected deployment if pushed.
- Recovery: normal Git revert; no DB/backfill mutation.

## Phase 4 — Review and closure

- Objective: independently review diff and acceptance evidence.
- Tasks: reviewer pass, repair findings, update handoff and acceptance.
- Expected files: EVIDENCE.md, REVIEW.md, HANDOFF.md.
- Completion criteria: all acceptance rows pass or explicit blocker remains.
- Test point: final targeted and full checks.
- Recovery: preserve exact continuation state if interrupted.
