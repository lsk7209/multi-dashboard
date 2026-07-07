# Acceptance

| Criteria | Status | Evidence |
|---|---|---|
| User can open a dashboard mail tab and see Gmail digest findings. | Pass | `pnpm build`, `pnpm dashboard:ui-smoke` |
| User can filter mail findings by kind, severity, status, and text. | Pass | `app/components/ops-mail-report-panel.tsx`, `pnpm build` |
| User can save review status and note through an API. | Pass | `pnpm exec vitest run app/lib/ops-mail-review-store.test.ts` |
| AdSense and GA4 digest tags are parsed into ops triage. | Pass | `pnpm exec vitest run scripts/setup/update-ops-triage.test.ts`; current `pnpm ops:triage` found AdSense=1 |
| No existing dashboard build behavior regresses. | Pass | Typecheck, lint, build, runtime smoke, rendered UI smoke passed |
| GitHub/Vercel deployment reflects the new dashboard. | Pending | Local acceptance passed; commit/push/deploy pending |
