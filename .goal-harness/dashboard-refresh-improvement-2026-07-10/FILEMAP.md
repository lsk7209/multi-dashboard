# FILEMAP

| Area | Files | Purpose |
|---|---|---|
| Dashboard data | `app/lib/dashboard-data.ts` | Loads current snapshot and dated operations artifacts. |
| Actionability | `app/lib/dashboard-actionability.ts` | Preserves read-only versus safe-to-act gating. |
| Operator UI | `app/page.tsx`, `app/components/*.tsx` | Renders operational prioritization and workflow states. |
| Fresh evidence | `data/site-stats.json`, `data/ops-triage.json`, `data/vercel-api-data-sites.json` | Current source of truth for this review. |
| Verification | `app/lib/*.test.ts`, `scripts/setup/*smoke*.ts` | Regression and rendered UI checks. |
