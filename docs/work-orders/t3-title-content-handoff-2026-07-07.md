# T3 Title/Content Handoff - 2026-07-06T23:20:23.084Z

Mutation status: no CMS, database, Search Console, AdSense, production title/body, or deployment mutation performed.

## Dashboard Evidence

- Snapshot: `2026-07-06T23:20:23.084Z`
- Stats path: `data\site-stats.json`
- Plan path: `data\fleet-optimization-plan-2026-07-07.json`
- Sites path: `scripts\setup\sites.yaml`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `none`

## Summary

| Metric | Count |
|---|---:|
| Sites | 13 |
| Title handoff rows | 10 |
| Content handoff rows | 8 |

## Handoff Queue

| Site | Plan ranks | Actions | 30d GSC | 30d users | Top queries | Local source |
|---|---:|---|---:|---:|---|---|
| `tennisfrens.com` | 1 | `title_handoff` | 7841 impr / 110 clicks / 1.40% CTR / pos 10.57 | 1521 | `ntrp 테스트` (11 impr, pos 1.82)<br>`아르튀르 랭데르크네슈` (751 impr, pos 10.33)<br>`알렉산더 블록스` (363 impr, pos 10.37) | `D:\web\tennisfrens` |
| `cartain.kr` | 2 | `title_handoff` | 2229 impr / 39 clicks / 1.75% CTR / pos 10.08 | 932 | `2026년 신차 출시 일정` (24 impr, pos 6.88) | `D:\web\cartainkr` |
| `estat.kr` | 3, 4 | `title_handoff`, `content_handoff` | 2393 impr / 15 clicks / 0.63% CTR / pos 7.95 | 63 | `라조기` (43 impr, pos 5.40)<br>`라조기 레시피` (11 impr, pos 3.27) | `D:\web\estatkr` |
| `gong365.kr` | 5, 7 | `title_handoff`, `content_handoff` | 1580 impr / 19 clicks / 1.20% CTR / pos 8.18 | 56 | `missing` | `D:\web\gong365kr` |
| `dogswhere.com` | 6 | `title_handoff` | 832 impr / 15 clicks / 1.80% CTR / pos 13.02 | 1396 | `missing` | `D:\web\dogswherecom` |
| `petinsuer.com` | 9, 11 | `title_handoff`, `content_handoff` | 1180 impr / 17 clicks / 1.44% CTR / pos 9.86 | 87 | `missing` | `D:\web\petinsuercom` |
| `fastjob.kr` | 10 | `title_handoff` | 849 impr / 12 clicks / 1.41% CTR / pos 14.94 | 683 | `aso 키워드 이해 및 분석` (10 impr, pos 59.60) | `D:\web\fastjob` |
| `ehon365.kr` | 12 | `title_handoff` | 736 impr / 14 clicks / 1.90% CTR / pos 14.26 | 661 | `missing` | `D:\web\ehon365\temp_clone` |
| `homeimer.com` | 13 | `content_handoff` | 1149 impr / 0 clicks / 0.00% CTR / pos 66.73 | 7 | `missing` | `D:\web\homeimercom` |
| `dogspang.kr` | 14, 15 | `title_handoff`, `content_handoff` | 972 impr / 17 clicks / 1.75% CTR / pos 10.02 | 88 | `강아지 발바닥 각화증` (17 impr, pos 7.59) | `D:\web\dogspangkr` |
| `today2424.kr` | 16 | `content_handoff` | 726 impr / 25 clicks / 3.44% CTR / pos 9.56 | 91 | `월세 계약해지 통보 문자 예시` (17 impr, pos 5.76) | `D:\web\today2424\2424` |
| `nexttech7.com` | 18, 19 | `title_handoff`, `content_handoff` | 566 impr / 14 clicks / 2.47% CTR / pos 10.81 | 58 | `missing` | `D:\web\nexttech7com` |
| `legalser.com` | 20 | `content_handoff` | 549 impr / 1 clicks / 0.18% CTR / pos 68.06 | 16 | `missing` | `D:\web\legalsercom` |

## Technical Status

| Site | Platform | Sitemap | AdSense | ads.txt | Decision |
|---|---|---|---|---|---|
| `tennisfrens.com` | `wordpress` | `https://www.tennisfrens.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `cartain.kr` | `wordpress` | `https://cartain.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `estat.kr` | `wordpress` | `https://estat.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `gong365.kr` | `wordpress` | `https://gong365.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `dogswhere.com` | `wordpress` | `https://dogswhere.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `petinsuer.com` | `wordpress` | `https://petinsuer.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `fastjob.kr` | `wordpress` | `https://fastjob.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `ehon365.kr` | `wordpress` | `https://www.ehon365.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `homeimer.com` | `wordpress` | `https://homeimer.com/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `dogspang.kr` | `wordpress` | `https://dogspang.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `today2424.kr` | `wordpress` | `https://today2424.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `nexttech7.com` | `wordpress` | `https://nexttech7.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `legalser.com` | `wordpress` | `https://legalser.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |

## Stop Conditions

- Do not edit WordPress titles, slugs, article bodies, headings, or in-body internal links from this handoff.
- Do not publish drafts, schedule posts, submit sitemaps, ping IndexNow, deploy, or mutate CMS/API state without an explicit apply step and rollback path.
- If localPath is missing or dirty, collect evidence only and do not create content in production.
- Re-run pnpm stats:update and pnpm fleet:optimize:plan before using this handoff after the next dashboard data window.
