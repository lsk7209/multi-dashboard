# PLAN

## Classification

- Size: large
- Domain Profile: adsense-audit

## Phase 1

- Objective: Establish fresh, trustworthy fleet evidence and classify the dashboard collection defect.
- Tasks: Complete `pnpm dashboard:refresh`; inspect stats, direct ops intelligence, triage, Vercel/API inventory, and current harness/continuity state; obtain independent read-only reviews for AdSense/content, SEO/monetization, and verification risks.
- Expected Files: `data/site-stats.json`, `data/history/2026-07-14.json`, `data/ops-intel.json`, `data/ops-triage.json`, Vercel/API inventory artifacts, harness evidence.
- Completion Criteria: Every direct finding is linked to a specific probe phase or underlying service signal; no stale snapshot is used as the decision source.
- Test Point: Snapshot timestamp, site count, finding totals, and artifact snapshot linkage.
- Rollback/Recovery: If collection fails before data is written, stop site prioritization and record the failed source. Preserve partial data only as a clearly marked diagnostic artifact.

## Phase 2

- Objective: Repair the smallest dashboard-local truthfulness defect and generate the fleet optimization review.
- Tasks: Add collector-state preservation and finding coalescing with focused tests; refresh the snapshot with the repair; extract ranked traffic/search/monetization and readiness candidates; write a read-only work order that separates safe dashboard improvements from site-specific follow-ups.
- Expected Files: Collector/ops source and tests, generated snapshot/intel/triage artifacts, `docs/work-orders/fleet-growth-adsense-2026-07-14.md`, harness and continuity docs.
- Completion Criteria: The same content timeout becomes exactly one collector-freshness finding; review recommendations are evidence-linked and do not authorize production-site mutation.
- Test Point: Targeted Vitest, typecheck, lint, refreshed `dashboard:refresh`, generated-artifact inspection.
- Rollback/Recovery: Revert only the dashboard-local patch if it changes unrelated collector semantics. Do not copy uncommitted changes from other worktrees.

## Phase 3

- Objective: Validate, deploy, and hand off the reviewed dashboard state.
- Tasks: Run `dashboard:verify --skip-stats-update`, acceptance if applicable, build, runtime/UI smoke checks; update harness and project continuity; commit only task-owned paths; push the default branch; verify the Git-connected Vercel deployment and live snapshot marker.
- Expected Files: Verification artifacts, `docs/HANDOFF.md`, `docs/STATUS.md`, harness evidence/review/acceptance, task commit.
- Completion Criteria: Acceptance is satisfied or blocker is explicit; Vercel is traced to the pushed default branch and responds successfully.
- Test Point: Build, smoke, Vercel deployment state, production HTTP response.
- Rollback/Recovery: If any check fails, remain in `REPAIRING`; if production deployment is not Git-connected, stop before domain or further production configuration changes.
