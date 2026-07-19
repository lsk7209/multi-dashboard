# T3 Title/Content Handoff - 2026-07-19T05:31:20.047Z

Mutation status: no CMS, database, Search Console, AdSense, production title/body, or deployment mutation performed.

## Dashboard Evidence

- Snapshot: `2026-07-19T05:31:20.047Z`
- Stats path: `data\site-stats.json`
- Plan path: `data\fleet-optimization-plan-2026-07-19.json`
- Sites path: `scripts\setup\sites.yaml`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `skipped_refresh_failed:adsense_collector:transient_error:1`

## Summary

| Metric | Count |
|---|---:|
| Sites | 12 |
| Title handoff rows | 9 |
| Content handoff rows | 7 |

## Handoff Queue

| Site | Plan ranks | Actions | 30d GSC | 30d users | Top queries | Local source |
|---|---:|---|---:|---:|---|---|
| `tennisfrens.com` | 1 | `title_handoff` | 15175 impr / 124 clicks / 0.82% CTR / pos 9.77 | 1637 | `ntrp 테스트` (11 impr, pos 1.09) | `D:\web\tennisfrens` |
| `cartain.kr` | 2 | `title_handoff` | 5141 impr / 109 clicks / 2.12% CTR / pos 9.33 | 1157 | `레이 보험료` (11 impr, pos 9.00)<br>`가장 가까운 lpg 충전소` (10 impr, pos 10.10) | `D:\web\cartainkr` |
| `gong365.kr` | 3, 5 | `title_handoff`, `content_handoff` | 3310 impr / 37 clicks / 1.12% CTR / pos 8.05 | 89 | `missing` | `D:\web\gong365kr` |
| `estat.kr` | 4, 6 | `title_handoff`, `content_handoff` | 3058 impr / 13 clicks / 0.43% CTR / pos 7.75 | 55 | `missing` | `D:\web\estatkr` |
| `dogswhere.com` | 7 | `title_handoff` | 1426 impr / 31 clicks / 2.17% CTR / pos 12.02 | 1784 | `강아지 맡길 곳` (14 impr, pos 32.00)<br>`best dog parks near me` (13 impr, pos 6.69) | `D:\web\dogswherecom` |
| `petinsuer.com` | 8 | `title_handoff` | 1513 impr / 18 clicks / 1.19% CTR / pos 8.95 | 137 | `강아지 발톱 혈관 줄이기` (12 impr, pos 7.92)<br>`강아지 요플레 먹어도 되나요` (13 impr, pos 9.54) | `D:\web\petinsuercom` |
| `nexttech7.com` | 9 | `title_handoff` | 1427 impr / 31 clicks / 2.17% CTR / pos 14.05 | 198 | `missing` | `D:\web\nexttech7com` |
| `dogspang.kr` | 10, 11 | `title_handoff`, `content_handoff` | 971 impr / 18 clicks / 1.85% CTR / pos 9.60 | 93 | `missing` | `missing` |
| `today2424.kr` | 13 | `content_handoff` | 796 impr / 38 clicks / 4.77% CTR / pos 9.18 | 80 | `missing` | `D:\web\today2424\2424` |
| `legalser.com` | 14 | `content_handoff` | 728 impr / 2 clicks / 0.27% CTR / pos 39.52 | 23 | `legalser` (11 impr, pos 9.55) | `D:\web\legalsercom` |
| `healfood.kr` | 17, 19 | `title_handoff`, `content_handoff` | 515 impr / 4 clicks / 0.78% CTR / pos 9.03 | 37 | `missing` | `D:\web\healfoodkr` |
| `homeimer.com` | 18 | `content_handoff` | 538 impr / 0 clicks / 0.00% CTR / pos 66.21 | 13 | `missing` | `D:\web\homeimercom` |

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
| `dogspang.kr` | `wordpress` | `https://dogspang.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Evidence collection only: no controlled local content source is registered; do not create or edit production content. |
| `today2424.kr` | `wordpress` | `https://today2424.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `legalser.com` | `wordpress` | `https://legalser.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `healfood.kr` | `wordpress` | `https://healfood.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `homeimer.com` | `wordpress` | `https://homeimer.com/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |

## Stop Conditions

- Do not edit WordPress titles, slugs, article bodies, headings, or in-body internal links from this handoff.
- Do not publish drafts, schedule posts, submit sitemaps, ping IndexNow, deploy, or mutate CMS/API state without an explicit apply step and rollback path.
- If localPath is missing or dirty, collect evidence only and do not create content in production.
- Re-run pnpm stats:update and pnpm fleet:optimize:plan before using this handoff after the next dashboard data window.
