# Changelog

| File | Change | Reason |
|---|---|---|
| `scripts/setup/update-ops-triage.ts` | Extended digest kinds for AdSense and GA4. | Site-related Gmail alerts were not reflected. |
| `app/lib/dashboard-data.ts` | Added ops mail report loading and review state merge. | Dashboard needed a single data source for the mail tab. |
| `app/lib/ops-mail-review-store.ts` | Added file-backed review state store. | Operators need editable status and notes. |
| `app/api/ops-mail-review/route.ts` | Added GET/POST review API. | UI needs a save path for review edits. |
| `app/components/ops-mail-report-panel.tsx` | Added filterable editable mail report panel. | User-visible dashboard surface. |
| `app/page.tsx` | Added `메일` tab and refresh command copy. | Expose the new report in the dashboard. |
| `app/globals.css` | Added responsive mail report styling. | Prevent UI overlap and keep dashboard layout consistent. |
| `package.json` | Added `dashboard:refresh`. | Refresh stats and Gmail ops triage together. |
