# T3 Title/Content Handoff - 2026-07-10T12:19:48.332Z

Mutation status: no CMS, database, Search Console, AdSense, production title/body, or deployment mutation performed.

## Dashboard Evidence

- Snapshot: `2026-07-10T12:19:48.332Z`
- Stats path: `data\site-stats.json`
- Plan path: `data\fleet-optimization-plan-2026-07-10.json`
- Sites path: `scripts\setup\sites.yaml`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `none`

## Summary

| Metric | Count |
|---|---:|
| Sites | 13 |
| Title handoff rows | 10 |
| Content handoff rows | 7 |

## Handoff Queue

| Site | Plan ranks | Actions | 30d GSC | 30d users | Top queries | Local source |
|---|---:|---|---:|---:|---|---|
| `tennisfrens.com` | 1 | `title_handoff` | 11684 impr / 114 clicks / 0.98% CTR / pos 10.01 | 1440 | `ntrp 테스트` (12 impr, pos 2.50)<br>`아르튀르 랭데르크네슈` (531 impr, pos 10.20)<br>`이알라` (65 impr, pos 10.86) | `D:\web\tennisfrens` |
| `cartain.kr` | 2 | `title_handoff` | 3621 impr / 64 clicks / 1.77% CTR / pos 9.43 | 979 | `2026년 신차 출시 일정` (22 impr, pos 7.50) | `D:\web\cartainkr` |
| `gong365.kr` | 3, 5 | `title_handoff`, `content_handoff` | 2732 impr / 32 clicks / 1.17% CTR / pos 8.14 | 77 | `missing` | `D:\web\gong365kr` |
| `estat.kr` | 4, 6 | `title_handoff`, `content_handoff` | 2686 impr / 14 clicks / 0.52% CTR / pos 7.92 | 42 | `missing` | `D:\web\estatkr` |
| `dogswhere.com` | 7 | `title_handoff` | 985 impr / 19 clicks / 1.93% CTR / pos 13.27 | 1384 | `부산 지하철 근처 애견 유치원` (12 impr, pos 40.58)<br>`강아지 맡길 곳` (11 impr, pos 32.36) | `D:\web\dogswherecom` |
| `petinsuer.com` | 8, 9 | `title_handoff`, `content_handoff` | 1288 impr / 18 clicks / 1.40% CTR / pos 9.62 | 96 | `노견 기준` (12 impr, pos 6.75) | `D:\web\petinsuercom` |
| `dogspang.kr` | 10, 13 | `title_handoff`, `content_handoff` | 1084 impr / 18 clicks / 1.66% CTR / pos 10.01 | 88 | `강아지 발바닥 각화증` (19 impr, pos 7.74) | `D:\web\dogspangkr` |
| `ehon365.kr` | 12 | `title_handoff` | 769 impr / 19 clicks / 2.47% CTR / pos 14.41 | 650 | `missing` | `D:\web\ehon365\temp_clone` |
| `homeimer.com` | 14 | `content_handoff` | 1005 impr / 0 clicks / 0.00% CTR / pos 66.74 | 10 | `missing` | `D:\web\homeimercom` |
| `today2424.kr` | 15 | `content_handoff` | 906 impr / 35 clicks / 3.86% CTR / pos 9.41 | 94 | `missing` | `D:\web\today2424\2424` |
| `nexttech7.com` | 16 | `title_handoff` | 794 impr / 16 clicks / 2.02% CTR / pos 12.63 | 133 | `missing` | `D:\web\nexttech7com` |
| `legalser.com` | 18 | `content_handoff` | 619 impr / 2 clicks / 0.32% CTR / pos 61.77 | 18 | `missing` | `D:\web\legalsercom` |
| `healfood.kr` | 19 | `title_handoff` | 493 impr / 4 clicks / 0.81% CTR / pos 8.85 | 29 | `missing` | `D:\web\healfoodkr` |

## Technical Status

| Site | Platform | Sitemap | AdSense | ads.txt | Decision |
|---|---|---|---|---|---|
| `tennisfrens.com` | `wordpress` | `https://www.tennisfrens.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `cartain.kr` | `wordpress` | `https://cartain.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `gong365.kr` | `wordpress` | `https://gong365.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `estat.kr` | `wordpress` | `https://estat.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `dogswhere.com` | `wordpress` | `https://dogswhere.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `petinsuer.com` | `wordpress` | `https://petinsuer.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `dogspang.kr` | `wordpress` | `https://dogspang.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `ehon365.kr` | `wordpress` | `https://www.ehon365.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `homeimer.com` | `wordpress` | `https://homeimer.com/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `today2424.kr` | `wordpress` | `https://today2424.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `nexttech7.com` | `wordpress` | `https://nexttech7.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `legalser.com` | `wordpress` | `https://legalser.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `healfood.kr` | `wordpress` | `https://healfood.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |

## Stop Conditions

- Do not edit WordPress titles, slugs, article bodies, headings, or in-body internal links from this handoff.
- Do not publish drafts, schedule posts, submit sitemaps, ping IndexNow, deploy, or mutate CMS/API state without an explicit apply step and rollback path.
- If localPath is missing or dirty, collect evidence only and do not create content in production.
- Re-run pnpm stats:update and pnpm fleet:optimize:plan before using this handoff after the next dashboard data window.
