# Plan

## Phase 1 - Current Wiring Audit
- Objective: identify existing Gmail digest collection and missing dashboard surfaces.
- Tasks: inspect `ops:triage`, stats updater, dashboard data loader, and existing editable dashboard APIs.
- Expected Files: read-only.
- Completion Criteria: missing pieces are known.
- Test Point: static inspection.
- Recovery: keep existing partial GSC alert path unchanged.

## Phase 2 - Data And Parser
- Objective: expose Gmail digest findings as dashboard data.
- Tasks: extend `update-ops-triage.ts` for AdSense/GA4; add ops mail report loader and review state store.
- Expected Files: `scripts/setup/update-ops-triage.ts`, `app/lib/dashboard-data.ts`, `app/lib/ops-mail-review-store.ts`.
- Completion Criteria: typed data includes counts, findings, and review state.
- Test Point: typecheck and `pnpm ops:triage`.
- Recovery: fail closed to an empty mail report if artifact is missing or invalid.

## Phase 3 - UI And API
- Objective: add dashboard tab and editing API.
- Tasks: add client panel, API route, tab wiring, responsive CSS.
- Expected Files: `app/components/ops-mail-report-panel.tsx`, `app/api/ops-mail-review/route.ts`, `app/page.tsx`, `app/globals.css`.
- Completion Criteria: operator can filter, edit status, edit note, and save.
- Test Point: build and rendered dashboard smoke.
- Recovery: keep writes disabled on Vercel without persistent state path.

## Phase 4 - Refresh, Validation, Deploy
- Objective: refresh artifacts, verify, commit, push, and deploy through Git.
- Tasks: add `dashboard:refresh`, run checks, commit, push, verify Vercel deployment.
- Expected Files: `package.json`, generated data/docs artifacts.
- Completion Criteria: latest GitHub commit is deployed to `multi-dashboard-one.vercel.app`.
- Test Point: `pnpm build`, smoke check, Git/Vercel evidence.
- Recovery: if deployment is delayed, report exact commit and failed check.
