# T3 Title/Content Handoff - 2026-07-11T16:18:45.043Z

Mutation status: no CMS, database, Search Console, AdSense, production title/body, or deployment mutation performed.

## Dashboard Evidence

- Snapshot: `2026-07-11T16:18:45.043Z`
- Stats path: `data\site-stats.json`
- Plan path: `data\fleet-optimization-plan-2026-07-12.json`
- Sites path: `scripts\setup\sites.yaml`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `skipped_refresh_failed:adsense_collector:transient_error:18`, `skipped_refresh_failed:ads_txt_collector:transient_error:18`

## Summary

| Metric | Count |
|---|---:|
| Sites | 14 |
| Title handoff rows | 11 |
| Content handoff rows | 6 |

## Handoff Queue

| Site | Plan ranks | Actions | 30d GSC | 30d users | Top queries | Local source |
|---|---:|---|---:|---:|---|---|
| `tennisfrens.com` | 1 | `title_handoff` | 13784 impr / 115 clicks / 0.83% CTR / pos 9.69 | 1473 | `이알라` (52 impr, pos 12.58) | `D:\web\tennisfrens` |
| `cartain.kr` | 2 | `title_handoff` | 3681 impr / 67 clicks / 1.82% CTR / pos 9.46 | 1013 | `그랜저 세금` (10 impr, pos 4.70)<br>`2026년 신차 출시 일정` (13 impr, pos 7.46) | `D:\web\cartainkr` |
| `gong365.kr` | 3, 5 | `title_handoff`, `content_handoff` | 2910 impr / 35 clicks / 1.20% CTR / pos 8.10 | 81 | `missing` | `D:\web\gong365kr` |
| `estat.kr` | 4, 6 | `title_handoff`, `content_handoff` | 2669 impr / 13 clicks / 0.49% CTR / pos 7.89 | 41 | `missing` | `D:\web\estatkr` |
| `dogswhere.com` | 7 | `title_handoff` | 999 impr / 17 clicks / 1.70% CTR / pos 13.25 | 1448 | `강아지 맡길 곳` (10 impr, pos 30.70)<br>`부산 지하철 근처 애견 유치원` (10 impr, pos 42.40) | `D:\web\dogswherecom` |
| `petinsuer.com` | 8 | `title_handoff` | 1309 impr / 19 clicks / 1.45% CTR / pos 9.54 | 104 | `노견 기준` (10 impr, pos 7.10) | `D:\web\petinsuercom` |
| `dogspang.kr` | 9, 11 | `title_handoff`, `content_handoff` | 1073 impr / 19 clicks / 1.77% CTR / pos 9.93 | 86 | `강아지 발바닥 각화증` (20 impr, pos 7.80) | `D:\web\dogspangkr` |
| `ehon365.kr` | 10 | `title_handoff` | 744 impr / 18 clicks / 2.42% CTR / pos 14.67 | 636 | `missing` | `D:\web\ehon365\temp_clone` |
| `texturb.com` | 13 | `title_handoff` | 776 impr / 19 clicks / 2.45% CTR / pos 8.41 | 304 | `missing` | `D:\web\texturb` |
| `nexttech7.com` | 14 | `title_handoff` | 823 impr / 16 clicks / 1.94% CTR / pos 12.92 | 178 | `missing` | `D:\web\nexttech7com` |
| `today2424.kr` | 15 | `content_handoff` | 902 impr / 36 clicks / 3.99% CTR / pos 9.34 | 92 | `missing` | `D:\web\today2424\2424` |
| `homeimer.com` | 16 | `content_handoff` | 909 impr / 0 clicks / 0.00% CTR / pos 66.63 | 10 | `missing` | `D:\web\homeimercom` |
| `legalser.com` | 18 | `content_handoff` | 637 impr / 2 clicks / 0.31% CTR / pos 59.60 | 17 | `missing` | `D:\web\legalsercom` |
| `healfood.kr` | 19 | `title_handoff` | 498 impr / 4 clicks / 0.80% CTR / pos 8.86 | 29 | `missing` | `D:\web\healfoodkr` |

## Technical Status

| Site | Platform | Sitemap | AdSense | ads.txt | Decision |
|---|---|---|---|---|---|
| `tennisfrens.com` | `wordpress` | `https://www.tennisfrens.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `cartain.kr` | `wordpress` | `https://cartain.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `gong365.kr` | `wordpress` | `https://gong365.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `estat.kr` | `wordpress` | `https://estat.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `dogswhere.com` | `wordpress` | `https://dogswhere.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `petinsuer.com` | `wordpress` | `https://petinsuer.com/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `dogspang.kr` | `wordpress` | `https://dogspang.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `ehon365.kr` | `wordpress` | `https://www.ehon365.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `texturb.com` | `wordpress` | `https://texturb.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `nexttech7.com` | `wordpress` | `https://nexttech7.com/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `today2424.kr` | `wordpress` | `https://today2424.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `homeimer.com` | `wordpress` | `https://homeimer.com/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `legalser.com` | `wordpress` | `https://legalser.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `healfood.kr` | `wordpress` | `https://healfood.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |

## Stop Conditions

- Do not edit WordPress titles, slugs, article bodies, headings, or in-body internal links from this handoff.
- Do not publish drafts, schedule posts, submit sitemaps, ping IndexNow, deploy, or mutate CMS/API state without an explicit apply step and rollback path.
- If localPath is missing or dirty, collect evidence only and do not create content in production.
- Re-run pnpm stats:update and pnpm fleet:optimize:plan before using this handoff after the next dashboard data window.
