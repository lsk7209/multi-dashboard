# Goal

Eliminate current npm/pnpm and GitHub Dependabot findings in `multi-dashboard` and `wedding-fair-decision-hub` with exact, reviewable dependency versions, while preserving application behavior and deployment safety.

## Done condition
- Both local audits report zero known vulnerabilities.
- Type checks, lint/tests, production builds, and Wedfair content/SEO/AdSense audits pass.
- Each repository uses its own dependency-only branch and PR.
- Vercel Preview, merge, production deployment, and live smoke pass.
- No site content, AdSense configuration, production DB, or unrelated dirty checkout is changed.
