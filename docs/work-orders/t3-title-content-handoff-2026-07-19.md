# T3 Title/Content Handoff - 2026-07-19T00:23:10.487Z

Mutation status: no CMS, database, Search Console, AdSense, production title/body, or deployment mutation performed.

## Dashboard Evidence

- Snapshot: `2026-07-19T00:23:10.487Z`
- Stats path: `data\site-stats.json`
- Plan path: `data\fleet-optimization-plan-2026-07-19.json`
- Sites path: `scripts\setup\sites.yaml`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `skipped_refresh_failed:sitemap:errors:1`

## Summary

| Metric | Count |
|---|---:|
| Sites | 12 |
| Title handoff rows | 9 |
| Content handoff rows | 7 |

## Handoff Queue

| Site | Plan ranks | Actions | 30d GSC | 30d users | Top queries | Local source |
|---|---:|---|---:|---:|---|---|
| `tennisfrens.com` | 1 | `title_handoff` | 14995 impr / 123 clicks / 0.82% CTR / pos 9.73 | 1636 | `ntrp 테스트` (11 impr, pos 1.09) | `D:\web\tennisfrens` |
| `cartain.kr` | 2 | `title_handoff` | 4925 impr / 105 clicks / 2.13% CTR / pos 9.37 | 1157 | `레이 보험료` (10 impr, pos 9.00) | `D:\web\cartainkr` |
| `gong365.kr` | 3, 4 | `title_handoff`, `content_handoff` | 3308 impr / 37 clicks / 1.12% CTR / pos 8.06 | 89 | `missing` | `D:\web\gong365kr` |
| `estat.kr` | 5, 6 | `title_handoff`, `content_handoff` | 2940 impr / 12 clicks / 0.41% CTR / pos 7.78 | 54 | `missing` | `D:\web\estatkr` |
| `dogswhere.com` | 7 | `title_handoff` | 1355 impr / 27 clicks / 1.99% CTR / pos 12.14 | 1782 | `best dog parks near me` (13 impr, pos 6.69)<br>`강아지 맡길 곳` (12 impr, pos 32.75) | `D:\web\dogswherecom` |
| `petinsuer.com` | 8 | `title_handoff` | 1455 impr / 16 clicks / 1.10% CTR / pos 8.96 | 137 | `강아지 요플레 먹어도 되나요` (10 impr, pos 9.70) | `D:\web\petinsuercom` |
| `nexttech7.com` | 9 | `title_handoff` | 1333 impr / 28 clicks / 2.10% CTR / pos 14.10 | 198 | `missing` | `D:\web\nexttech7com` |
| `dogspang.kr` | 10, 11 | `title_handoff`, `content_handoff` | 971 impr / 18 clicks / 1.85% CTR / pos 9.60 | 93 | `missing` | `D:\web\dogspangkr` |
| `today2424.kr` | 13 | `content_handoff` | 796 impr / 38 clicks / 4.77% CTR / pos 9.18 | 80 | `missing` | `D:\web\today2424\2424` |
| `legalser.com` | 15 | `content_handoff` | 696 impr / 2 clicks / 0.29% CTR / pos 40.19 | 23 | `missing` | `D:\web\legalsercom` |
| `healfood.kr` | 17, 19 | `title_handoff`, `content_handoff` | 511 impr / 4 clicks / 0.78% CTR / pos 9.03 | 37 | `missing` | `D:\web\healfoodkr` |
| `homeimer.com` | 18 | `content_handoff` | 537 impr / 0 clicks / 0.00% CTR / pos 66.29 | 13 | `missing` | `D:\web\homeimercom` |

## Technical Status

| Site | Platform | Sitemap | AdSense | ads.txt | Decision |
|---|---|---|---|---|---|
| `tennisfrens.com` | `wordpress` | `https://www.tennisfrens.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `cartain.kr` | `wordpress` | `https://cartain.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `gong365.kr` | `wordpress` | `https://gong365.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `estat.kr` | `wordpress` | `https://estat.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `dogswhere.com` | `wordpress` | `https://dogswhere.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `petinsuer.com` | `wordpress` | `https://petinsuer.com/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `nexttech7.com` | `wordpress` | `https://nexttech7.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `dogspang.kr` | `wordpress` | `https://dogspang.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `today2424.kr` | `wordpress` | `https://today2424.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `legalser.com` | `wordpress` | `https://legalser.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `healfood.kr` | `wordpress` | `https://healfood.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `homeimer.com` | `wordpress` | `https://homeimer.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |

## Stop Conditions

- Do not edit WordPress titles, slugs, article bodies, headings, or in-body internal links from this handoff.
- Do not publish drafts, schedule posts, submit sitemaps, ping IndexNow, deploy, or mutate CMS/API state without an explicit apply step and rollback path.
- If localPath is missing or dirty, collect evidence only and do not create content in production.
- Re-run pnpm stats:update and pnpm fleet:optimize:plan before using this handoff after the next dashboard data window.
