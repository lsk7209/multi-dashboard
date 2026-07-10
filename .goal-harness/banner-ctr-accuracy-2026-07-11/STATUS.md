# Status

Current State: IMPLEMENTING
Current Phase: Dashboard measurement path ready for review
Completed: Existing misleading endpoint-call ratio was renamed and low samples are separated. Parallel review mapped 12 Next/Vite and 9 WordPress installations and defined the qualified-event test matrix. The dashboard now records HMAC-hashed, per-session qualified impressions and attributed clicks separately from legacy endpoint calls; a reusable browser loader is available at `/banner-measurement.js`.
In Progress: Prepare deployment commits for the ten clean app installations; two app installations are held to preserve existing untracked work.
Remaining: Configure the production event-secret, deploy dashboard and site changes, validate a Next/Vite and WordPress canary, then audit the full fleet.
Blocked: Production gate pending explicit authorization for a new Vercel secret and external deployments.
Last Verification: `pnpm lint`, `pnpm type-check`, focused Vitest (13 tests), and the nine-site WordPress installer dry-run pass locally. Vercel production lists the LibSQL variables but does not list `MONETIZATION_BANNER_EVENT_SECRET`.
Next Action: With authorization, add the Vercel secret, push the three dashboard commits, deploy a `temon` canary, then deploy a `smallhomepick` WordPress canary and verify remote events.
