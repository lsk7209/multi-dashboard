# T3 Title/Content Handoff - 2026-07-11T07:04:23.041Z

Mutation status: no CMS, database, Search Console, AdSense, production title/body, or deployment mutation performed.

## Dashboard Evidence

- Snapshot: `2026-07-11T07:04:23.041Z`
- Stats path: `data\site-stats.json`
- Plan path: `data\fleet-optimization-plan-2026-07-11.json`
- Sites path: `scripts\setup\sites.yaml`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `none`

## Summary

| Metric | Count |
|---|---:|
| Sites | 12 |
| Title handoff rows | 9 |
| Content handoff rows | 7 |

## Handoff Queue

| Site | Plan ranks | Actions | 30d GSC | 30d users | Top queries | Local source |
|---|---:|---|---:|---:|---|---|
| `tennisfrens.com` | 1 | `title_handoff` | 13978 impr / 115 clicks / 0.82% CTR / pos 9.70 | 1463 | `ntrp 테스트` (10 impr, pos 2.10)<br>`아르튀르 랭데르크네슈` (62 impr, pos 10.60)<br>`이알라` (60 impr, pos 11.80) | `D:\web\tennisfrens` |
| `cartain.kr` | 2 | `title_handoff` | 3833 impr / 71 clicks / 1.85% CTR / pos 9.43 | 1004 | `그랜저 세금` (10 impr, pos 4.70)<br>`2026년 신차 출시 일정` (18 impr, pos 7.33) | `D:\web\cartainkr` |
| `gong365.kr` | 3, 5 | `title_handoff`, `content_handoff` | 2947 impr / 35 clicks / 1.19% CTR / pos 8.08 | 79 | `missing` | `D:\web\gong365kr` |
| `estat.kr` | 4, 6 | `title_handoff`, `content_handoff` | 2734 impr / 13 clicks / 0.48% CTR / pos 7.89 | 40 | `missing` | `D:\web\estatkr` |
| `dogswhere.com` | 7 | `title_handoff` | 1013 impr / 19 clicks / 1.88% CTR / pos 13.21 | 1391 | `부산 지하철 근처 애견 유치원` (12 impr, pos 41.42)<br>`강아지 맡길 곳` (11 impr, pos 31.09) | `D:\web\dogswherecom` |
| `petinsuer.com` | 8 | `title_handoff` | 1331 impr / 19 clicks / 1.43% CTR / pos 9.55 | 101 | `노견 기준` (12 impr, pos 7.00) | `D:\web\petinsuercom` |
| `dogspang.kr` | 9, 10 | `title_handoff`, `content_handoff` | 1109 impr / 19 clicks / 1.71% CTR / pos 9.94 | 88 | `강아지 발바닥 각화증` (24 impr, pos 7.79) | `D:\web\dogspangkr` |
| `nexttech7.com` | 12 | `title_handoff` | 834 impr / 16 clicks / 1.92% CTR / pos 12.86 | 164 | `missing` | `D:\web\nexttech7com` |
| `today2424.kr` | 13 | `content_handoff` | 931 impr / 37 clicks / 3.97% CTR / pos 9.34 | 93 | `missing` | `D:\web\today2424\2424` |
| `homeimer.com` | 14 | `content_handoff` | 952 impr / 0 clicks / 0.00% CTR / pos 66.65 | 10 | `missing` | `D:\web\homeimercom` |
| `legalser.com` | 16 | `content_handoff` | 642 impr / 2 clicks / 0.31% CTR / pos 59.75 | 17 | `missing` | `D:\web\legalsercom` |
| `healfood.kr` | 17, 18 | `title_handoff`, `content_handoff` | 500 impr / 4 clicks / 0.80% CTR / pos 8.86 | 29 | `missing` | `D:\web\healfoodkr` |

## Technical Status

| Site | Platform | Sitemap | AdSense | ads.txt | Decision |
|---|---|---|---|---|---|
| `tennisfrens.com` | `wordpress` | `https://www.tennisfrens.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `cartain.kr` | `wordpress` | `https://cartain.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `gong365.kr` | `wordpress` | `https://gong365.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `estat.kr` | `wordpress` | `https://estat.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `dogswhere.com` | `wordpress` | `https://dogswhere.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `petinsuer.com` | `wordpress` | `https://petinsuer.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `dogspang.kr` | `wordpress` | `https://dogspang.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `nexttech7.com` | `wordpress` | `https://nexttech7.com/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `today2424.kr` | `wordpress` | `https://today2424.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `homeimer.com` | `wordpress` | `https://homeimer.com/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `legalser.com` | `wordpress` | `https://legalser.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `healfood.kr` | `wordpress` | `https://healfood.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |

## Stop Conditions

- Do not edit WordPress titles, slugs, article bodies, headings, or in-body internal links from this handoff.
- Do not publish drafts, schedule posts, submit sitemaps, ping IndexNow, deploy, or mutate CMS/API state without an explicit apply step and rollback path.
- If localPath is missing or dirty, collect evidence only and do not create content in production.
- Re-run pnpm stats:update and pnpm fleet:optimize:plan before using this handoff after the next dashboard data window.
