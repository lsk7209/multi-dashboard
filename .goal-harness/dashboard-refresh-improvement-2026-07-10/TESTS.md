# TESTS

- Focused dashboard data/actionability unit tests, including the selected behavior.
- `pnpm type-check`.
- `pnpm build`.
- `pnpm dashboard:ui-smoke -- --url=http://127.0.0.1:<port>/` against a local server.
- Production alias HTTP check after Git-connected Vercel deployment.
- `pnpm lint` is informative only until unrelated untracked content scripts are cleaned; record its known existing failures rather than masking them.
