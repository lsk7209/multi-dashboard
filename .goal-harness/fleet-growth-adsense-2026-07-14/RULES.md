# RULES

1. Do not declare completion without tests or equivalent validation.
2. Do not break existing working behavior.
3. Do not make unrequested broad rewrites.
4. Do not leave temporary code, dummy logic, or TODO-only work as final.
5. Do not expose `.env`, API keys, tokens, credentials, or secrets.
6. Do not change production DBs, live servers, or deploy targets without explicit approval.
7. Record the reason before adding a production dependency.
8. Record risky deletion, migration, permission, or data-changing operations.
9. Do not hide failed tests.
10. Record changes in `CHANGELOG.md` when present.

## Task-Specific Rules

1. Use the fresh snapshot, direct `ops-intel`, and direct `ops-triage` as the operational source of truth; do not use Gmail digest artifacts.
2. Separate a collector failure from an externally verified site defect.
3. Treat all AdSense, SEO, content, and monetization recommendations as read-only until the relevant site's first-party evidence and authorized deployment path are checked.
4. Google visibility work must preserve helpful-content, policy, canonical, robots, sitemap, and noindex contracts; no scaled or duplicate content generation.
5. Production dashboard deployment is authorized by the user's `대시보드 갱신` request, but site/CMS/DB/AdSense/Search Console mutations are not authorized by this harness alone.
6. Record production deployment risk and GitHub-first/Vercel verification before pushing.
