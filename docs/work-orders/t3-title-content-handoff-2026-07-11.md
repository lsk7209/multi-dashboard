# T3 Title/Content Handoff - 2026-07-11T03:35:08.164Z

Mutation status: no CMS, database, Search Console, AdSense, production title/body, or deployment mutation performed.

## Dashboard Evidence

- Snapshot: `2026-07-11T03:35:08.164Z`
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
| Content handoff rows | 6 |

## Handoff Queue

| Site | Plan ranks | Actions | 30d GSC | 30d users | Top queries | Local source |
|---|---:|---|---:|---:|---|---|
| `tennisfrens.com` | 1 | `title_handoff` | 11516 impr / 111 clicks / 0.96% CTR / pos 10.02 | 1463 | `ntrp 테스트` (10 impr, pos 2.10)<br>`아르튀르 랭데르크네슈` (61 impr, pos 10.56)<br>`이알라` (58 impr, pos 11.62) | `D:\web\tennisfrens` |
| `cartain.kr` | 2 | `title_handoff` | 3538 impr / 62 clicks / 1.75% CTR / pos 9.42 | 1004 | `2026년 신차 출시 일정` (18 impr, pos 7.33) | `D:\web\cartainkr` |
| `gong365.kr` | 3, 5 | `title_handoff`, `content_handoff` | 2702 impr / 32 clicks / 1.18% CTR / pos 8.15 | 79 | `missing` | `D:\web\gong365kr` |
| `estat.kr` | 4, 6 | `title_handoff`, `content_handoff` | 2616 impr / 13 clicks / 0.50% CTR / pos 7.92 | 40 | `missing` | `D:\web\estatkr` |
| `dogswhere.com` | 7 | `title_handoff` | 964 impr / 18 clicks / 1.87% CTR / pos 13.24 | 1391 | `부산 지하철 근처 애견 유치원` (10 impr, pos 40.10) | `D:\web\dogswherecom` |
| `petinsuer.com` | 8 | `title_handoff` | 1255 impr / 17 clicks / 1.35% CTR / pos 9.61 | 101 | `노견 기준` (10 impr, pos 7.10) | `D:\web\petinsuercom` |
| `dogspang.kr` | 9, 11 | `title_handoff`, `content_handoff` | 1052 impr / 18 clicks / 1.71% CTR / pos 9.99 | 88 | `강아지 발바닥 각화증` (15 impr, pos 7.67) | `D:\web\dogspangkr` |
| `nexttech7.com` | 12 | `title_handoff` | 789 impr / 15 clicks / 1.90% CTR / pos 12.62 | 164 | `missing` | `D:\web\nexttech7com` |
| `homeimer.com` | 13 | `content_handoff` | 951 impr / 0 clicks / 0.00% CTR / pos 66.67 | 10 | `missing` | `D:\web\homeimercom` |
| `today2424.kr` | 14 | `content_handoff` | 888 impr / 34 clicks / 3.83% CTR / pos 9.43 | 93 | `missing` | `D:\web\today2424\2424` |
| `legalser.com` | 16 | `content_handoff` | 610 impr / 2 clicks / 0.33% CTR / pos 61.80 | 17 | `missing` | `D:\web\legalsercom` |
| `healfood.kr` | 17 | `title_handoff` | 493 impr / 4 clicks / 0.81% CTR / pos 8.85 | 29 | `missing` | `D:\web\healfoodkr` |

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
| `homeimer.com` | `wordpress` | `https://homeimer.com/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `today2424.kr` | `wordpress` | `https://today2424.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `legalser.com` | `wordpress` | `https://legalser.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `healfood.kr` | `wordpress` | `https://healfood.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |

## Stop Conditions

- Do not edit WordPress titles, slugs, article bodies, headings, or in-body internal links from this handoff.
- Do not publish drafts, schedule posts, submit sitemaps, ping IndexNow, deploy, or mutate CMS/API state without an explicit apply step and rollback path.
- If localPath is missing or dirty, collect evidence only and do not create content in production.
- Re-run pnpm stats:update and pnpm fleet:optimize:plan before using this handoff after the next dashboard data window.
