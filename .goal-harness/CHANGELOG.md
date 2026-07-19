# CHANGELOG

## Changed Files

| File | Change | Reason |
|---|---|---|
| `scripts/setup/update-ga4-stats.ts` | Removed Gmail digest fetch, parse, and stat injection path. | Direct operations must not depend on legacy digest summaries. |
| `app/lib/dashboard-data.ts` | Removed Gmail-derived action, insight, and issue branches. | Prioritization now uses direct collection evidence only. |
| `app/page.tsx` | Removed Gmail-specific GSC issue copy. | GSC issue presentation is limited to direct collector failures. |
| `app/lib/dashboard-data.test.ts` | Added a legacy snapshot regression test. | Gmail-shaped legacy data cannot create a queue item. |
|---|---|---|
