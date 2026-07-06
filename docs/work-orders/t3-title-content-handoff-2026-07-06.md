# T3 Title/Content Handoff - 2026-07-06T14:36:12.558Z

Mutation status: no CMS, database, Search Console, AdSense, production title/body, or deployment mutation performed.

## Dashboard Evidence

- Snapshot: `2026-07-06T14:36:12.558Z`
- Stats path: `data\site-stats.json`
- Plan path: `data\fleet-optimization-plan-2026-07-06.json`
- Sites path: `scripts\setup\sites.yaml`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `skipped_refresh_failed:gsc:auth_error:1`

## Summary

| Metric | Count |
|---|---:|
| Sites | 13 |
| Title handoff rows | 10 |
| Content handoff rows | 8 |

## Handoff Queue

| Site | Plan ranks | Actions | 30d GSC | 30d users | Top queries | Local source |
|---|---:|---|---:|---:|---|---|
| `tennisfrens.com` | 1 | `title_handoff` | 7970 impr / 113 clicks / 1.42% CTR / pos 10.56 | 1517 | `ntrp 테스트` (12 impr, pos 1.75)<br>`아르튀르 랭데르크네슈` (797 impr, pos 10.36)<br>`마르틴 란달루세` (361 impr, pos 10.64) | `D:\web\tennisfrens` |
| `cartain.kr` | 2 | `title_handoff` | 2275 impr / 40 clicks / 1.76% CTR / pos 10.08 | 915 | `2026년 신차 출시 일정` (25 impr, pos 6.88) | `D:\web\cartainkr` |
| `estat.kr` | 3, 4 | `title_handoff`, `content_handoff` | 2453 impr / 16 clicks / 0.65% CTR / pos 7.97 | 56 | `라조기` (52 impr, pos 5.42)<br>`라조기 레시피` (11 impr, pos 3.27) | `D:\web\estatkr` |
| `gong365.kr` | 5, 7 | `title_handoff`, `content_handoff` | 1584 impr / 19 clicks / 1.20% CTR / pos 8.17 | 47 | `충남 충북 2026 기업 지원사업 공고` (10 impr, pos 9.00) | `D:\web\gong365kr` |
| `dogswhere.com` | 6 | `title_handoff` | 858 impr / 16 clicks / 1.86% CTR / pos 12.91 | 1424 | `부산 지하철 근처 애견 유치원` (11 impr, pos 40.36)<br>`강아지 맡길 곳` (10 impr, pos 34.30) | `D:\web\dogswherecom` |
| `petinsuer.com` | 9, 11 | `title_handoff`, `content_handoff` | 1208 impr / 17 clicks / 1.41% CTR / pos 9.86 | 83 | `노견 기준` (10 impr, pos 7.20) | `D:\web\petinsuercom` |
| `fastjob.kr` | 10 | `title_handoff` | 887 impr / 12 clicks / 1.35% CTR / pos 14.78 | 683 | `aso 키워드 이해 및 분석` (10 impr, pos 59.60) | `D:\web\fastjob` |
| `homeimer.com` | 12 | `content_handoff` | 1197 impr / 0 clicks / 0.00% CTR / pos 66.63 | 7 | `missing` | `D:\web\homeimercom` |
| `ehon365.kr` | 13 | `title_handoff` | 758 impr / 14 clicks / 1.85% CTR / pos 14.16 | 654 | `양육비 산정표 2026` (14 impr, pos 9.21) | `D:\web\ehon365\temp_clone` |
| `dogspang.kr` | 14, 15 | `title_handoff`, `content_handoff` | 995 impr / 17 clicks / 1.71% CTR / pos 10.03 | 88 | `강아지 발바닥 각화증` (22 impr, pos 7.59) | `D:\web\dogspangkr` |
| `today2424.kr` | 16 | `content_handoff` | 726 impr / 25 clicks / 3.44% CTR / pos 9.56 | 89 | `월세 계약해지 통보 문자 예시` (19 impr, pos 5.84) | `D:\web\today2424\2424` |
| `nexttech7.com` | 18, 19 | `title_handoff`, `content_handoff` | 575 impr / 14 clicks / 2.43% CTR / pos 10.76 | 58 | `missing` | `D:\web\nexttech7com` |
| `legalser.com` | 20 | `content_handoff` | 554 impr / 1 clicks / 0.18% CTR / pos 67.85 | 16 | `legalser` (19 impr, pos 10.53) | `D:\web\legalsercom` |

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
| `homeimer.com` | `wordpress` | `https://homeimer.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `ehon365.kr` | `wordpress` | `https://www.ehon365.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `dogspang.kr` | `wordpress` | `https://dogspang.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `today2424.kr` | `wordpress` | `https://today2424.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `nexttech7.com` | `wordpress` | `https://nexttech7.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `legalser.com` | `wordpress` | `https://legalser.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |

## Stop Conditions

- Do not edit WordPress titles, slugs, article bodies, headings, or in-body internal links from this handoff.
- Do not publish drafts, schedule posts, submit sitemaps, ping IndexNow, deploy, or mutate CMS/API state without an explicit apply step and rollback path.
- If localPath is missing or dirty, collect evidence only and do not create content in production.
- Re-run pnpm stats:update and pnpm fleet:optimize:plan before using this handoff after the next dashboard data window.
