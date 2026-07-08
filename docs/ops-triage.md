# Ops Triage

Generated: 2026-07-08T00:09:27.229Z
Source: direct
Source path: data/ops-intel.json
Source updated: 2026-07-08T00:09:18.923Z

## Summary

- Critical: 6
- High: 8
- Medium: 6
- Low: 3
- GitHub Actions: 20
- GSC: 3
- AdSense: 0
- GA4: 0
- Vercel: 0

## Findings

| Priority | Severity | Kind | Target | Title | Action |
|---:|---|---|---|---|---|
| 115 | critical | github-actions | coverclarityhealth.com | coverclarityhealth.com: Publish scheduled content failed 64 times | Inspect the content queue and publish script assumptions; skip missing input with evidence instead of failing the whole workflow. |
| 115 | critical | github-actions | crepikacom | crepikacom: Auto Publish Blog Post failed 62 times | Inspect the content queue and publish script assumptions; skip missing input with evidence instead of failing the whole workflow. |
| 115 | critical | github-actions | crepikacom | crepikacom: Auto Publish Utility Tool failed 42 times | Inspect the content queue and publish script assumptions; skip missing input with evidence instead of failing the whole workflow. |
| 115 | critical | github-actions | gong365kr | gong365kr: StartupMoneyMap cron failed 113 times | Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause. |
| 115 | critical | github-actions | gungangbohum | gungangbohum: Publish scheduled content failed 65 times | Inspect the content queue and publish script assumptions; skip missing input with evidence instead of failing the whole workflow. |
| 109 | critical | github-actions | askorekr | askorekr: plant-data-pipeline failed 9 times | Inspect the latest workflow logs, then add explicit gates, retries, or upstream API fallback handling. |
| 87 | high | github-actions | 2424 | 2424: Live Cost Watch failed 7 times | Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause. |
| 86 | high | github-actions | nongsusangogo.kr | nongsusangogo.kr: bulk-collect failed 6 times | Inspect the latest workflow logs, then add explicit gates, retries, or upstream API fallback handling. |
| 85 | high | github-actions | campgogo.kr | campgogo.kr: backup failed 5 times | Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause. |
| 83 | high | github-actions | multi-dashboard | multi-dashboard: Update dashboard stats failed 3 times | Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause. |
| 82 | high | github-actions | tennis_friends | tennis_friends: Deploy to GitHub Pages failed 2 times | Fix the source repo and keep deployment through the GitHub integration path. |
| 81 | high | github-actions | campgogo.kr | campgogo.kr: bulk-collect failed 1 time | Inspect the latest workflow logs, then add explicit gates, retries, or upstream API fallback handling. |
| 81 | high | github-actions | crepikacom | crepikacom: Quality Gates failed 1 time | Run the repo quality gate locally and patch the failing build, lint, SEO, schema, or test check. |
| 81 | high | github-actions | park-trail | park-trail: NPS official data sync failed 1 time | Inspect the latest workflow logs, then add explicit gates, retries, or upstream API fallback handling. |
| 51 | medium | github-actions | campgogo.kr | campgogo.kr: dedup-review failed 1 time | Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause. |
| 51 | medium | github-actions | dog-breed | dog-breed: Update BLS Cost Data failed 1 time | Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause. |
| 51 | medium | github-actions | petjigi | petjigi: ETL — Businesses (LOCALDATA 18종) failed 1 time | Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause. |
| 51 | medium | github-actions | petjigi | petjigi: ETL — Registration Agents (검역본부 등록대행업체) failed 1 time | Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause. |
| 51 | medium | github-actions | petjigi | petjigi: ETL — Shelters (전국동물보호센터) failed 1 time | Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause. |
| 51 | medium | github-actions | temon | temon: SEO Weekly Report failed 1 time | Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause. |
| 20 | low | gsc | nicewomen | 나이스우먼 - GA4: GSC direct collector signal sitemap warnings=1 errors=0 | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 20 | low | gsc | autorentlab | autorentlab.com: GSC direct collector signal sitemap warnings=1 errors=0 | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 20 | low | gsc | ezfunnel | ezfunnel.kr: GSC direct collector signal sitemap warnings=1 errors=0 | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
