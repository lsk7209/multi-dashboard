# Dashboard Refresh Runbook

1. Confirm the worktree is clean apart from the current refresh artifacts; never include unrelated paths such as `launches/` or local `tmp/` logs.
2. Run `pnpm dashboard:refresh` with the approved local GCP service-account path available to the process.
3. Confirm `data/site-stats.json` is newly generated and the GA4, GSC, and sitemap failure counts are zero. Treat a failed collection as a stop condition until it is recovered.
4. Run `pnpm dashboard:verify --skip-stats-update` against an owned local or current dashboard URL, then run `pnpm dashboard:acceptance data/dashboard-verification-YYYY-MM-DD.json`.
5. Commit only the code, tests, generated evidence, and continuity docs for this refresh; push `HEAD` to `origin/main`.
6. Confirm the Git-connected Vercel production deployment is ready and that `https://multi-dashboard-one.vercel.app` returns HTTP 200.

Secrets remain in approved local paths such as `D:\env`; do not add secret values to this repository or these documents.
