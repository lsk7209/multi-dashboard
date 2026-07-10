# CHANGELOG

## Changed Files

| File | Change | Reason |
|---|---|---|
| `app/lib/dashboard-action-readonly.ts` | Added read-only action presentation policy. | Preserve evidence while suppressing only mutation instructions. |
| `app/lib/dashboard-action-readonly.test.ts` | Added policy regression tests. | Lock sitemap resubmission suppression and safe inspection preservation. |
| `app/page.tsx` | Render action-specific reason and safe next step in blocked mode. | Operators can triage 16 current action rows without executing changes. |
| `scripts/setup/verify-dashboard-rendered-ui-smoke.ts` | Updated blocked action smoke assertions. | Verify evidence visibility and mutation suppression in the rendered UI. |
