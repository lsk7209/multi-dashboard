# Acceptance

- [x] Full collector default/run-budget supports the current fleet without the observed 600-second abort.
- [x] Content-phase site timeout remains distinguishable from GA4/GSC/AdSense failure and is immediately visible as actionable evidence.
- [x] Existing successful and failed connector evidence is not fabricated or discarded.
- [x] Dashboard focused tests, typecheck, lint, full test suite and build pass.
- [x] Todaypharm audit covers API-data freshness, sitemap/index controls, content differentiation and YMYL trust.
- [x] No unsafe Todaypharm source change was made in the dirty/diverged checkout; the relevant remote sitemap fix was verified directly.
- [x] No AdSense review, GSC/IndexNow submission, production DB write or Vercel API/CLI mutation occurred.
- [x] Handoff and rollback evidence are current.
