# multi-dashboard

Multi-site dashboard setup automation for WordPress, GitHub Actions, Vercel, GA4, and readiness checks.

## Quick Check

```bash
pnpm install
pnpm type-check
pnpm lint
pnpm setup:verify:dry
```

## Setup

Fill `scripts/setup/sites.yaml` and provide secrets through environment variables, `.env.setup.local`, `.env.local`, or `D:\env\키파일.txt`.

Run:

```bash
pnpm setup:preflight
pnpm setup:all
```
