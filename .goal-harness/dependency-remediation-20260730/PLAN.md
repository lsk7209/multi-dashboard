# Plan

1. Fetch latest main and inspect direct/transitive dependency paths and current audits read-only.
2. Remove unused vulnerable parents and pin direct security upgrades exactly.
3. Add the narrowest exact transitive overrides needed for packages whose parents still pin vulnerable releases.
4. Regenerate only each repository's lockfile and run full local validation.
5. Review and commit each repository independently, then open separate PRs.
6. Require Vercel Preview and independent review before merge.
7. Verify production, live behavior, and remaining GitHub alerts; record any delayed alert closure separately.
