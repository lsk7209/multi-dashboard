# GOAL

## Final Deliverable

Remove Gmail digest from dashboard operational prioritization and retain direct first-party GA4 GSC sitemap AdSense evidence only

## User Value

The dashboard prioritizes only current, first-party operational evidence, so site work is not diverted by stale Gmail digest summaries.

## Required Features

- `dashboard:refresh` no longer fetches, parses, stores, or prioritizes `lsk7209/gmail-digest` GSC alerts.
- The dashboard action queue, priority insights, and GSC issue panel use direct collector errors and current snapshot data only.
- Existing GA4, Search Console, sitemap, AdSense, ads.txt, and direct ops collection continue to work.
- Tests prove the removed email-alert path cannot reappear in refreshed stats or dashboard actions.

## Non-Goals

- Do not change any managed site, GSC property, sitemap submission, or external service configuration.
- Do not remove the separate direct `ops:triage` system unless it still depends on Gmail digest.
- Do not migrate historical snapshot data beyond replacing the newly generated snapshot.

## Done Conditions

- Repository search has no executable `gmail-digest` dependency in the dashboard refresh/action pipeline.
- A fresh dashboard refresh completes without contacting or reporting Gmail digest alerts.
- Focused regression tests plus typecheck, lint, build, dashboard acceptance, and a live production smoke check pass.
- Only task-related code and generated dashboard artifacts are committed and deployed.

## User-Visible Result

The dashboard stops presenting Gmail-derived GSC alerts as current action items; its queue reflects direct GA4, GSC, sitemap, AdSense, and ads.txt evidence.
