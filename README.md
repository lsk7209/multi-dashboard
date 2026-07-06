# multi-dashboard

Multi-site dashboard setup automation for WordPress, GitHub Actions, Vercel, GA4, and readiness checks.

## Quick Check

```bash
pnpm install
pnpm type-check
pnpm lint
pnpm test
pnpm dashboard:verify
pnpm dashboard:ui-smoke
pnpm setup:verify:dry
```

Use `pnpm dashboard:verify` before relying on dashboard insights. It writes local evidence artifacts, runs dashboard smoke checks, verifies AdSense proof artifacts, and reports external blockers such as Search Console access without mutating production or external systems. After external Search Console recovery, use `pnpm dashboard:acceptance data\\dashboard-verification-YYYY-MM-DD.json` to require the exact verification artifact to be fully actionable before executing dashboard recommendations. Use `pnpm dashboard:ui-smoke` when a local dev server is running to verify the rendered Fleet panel in a real browser.

## Post-Recovery Check

```bash
pnpm dashboard:post-recovery
```

Run this only after Search Console access recovery. It is the one-command form of the generated post-recovery work order, runs the full local chain through `pnpm dashboard:acceptance`, and is expected to fail closed while external blockers such as `yesa.kr` remain.

## Setup

Fill `scripts/setup/sites.yaml` and provide secrets through environment variables, `.env.setup.local`, `.env.local`, or `D:\env\키파일.txt`.

Run:

```bash
pnpm setup:preflight
pnpm setup:all
```
