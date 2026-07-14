# T3 Title/Content Handoff - 2026-07-14T03:14:43.553Z

Mutation status: no CMS, database, Search Console, AdSense, production title/body, or deployment mutation performed.

## Dashboard Evidence

- Snapshot: `2026-07-14T03:14:43.553Z`
- Stats path: `data\site-stats.json`
- Plan path: `data\fleet-optimization-plan-2026-07-14.json`
- Sites path: `scripts\setup\sites.yaml`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `skipped_refresh_failed:adsense_collector:transient_error:18`, `skipped_refresh_failed:ads_txt_collector:transient_error:18`

## Summary

| Metric | Count |
|---|---:|
| Sites | 12 |
| Title handoff rows | 9 |
| Content handoff rows | 7 |

## Handoff Queue

| Site | Plan ranks | Actions | 30d GSC | 30d users | Top queries | Local source |
|---|---:|---|---:|---:|---|---|
| `tennisfrens.com` | 1 | `title_handoff` | 14404 impr / 117 clicks / 0.81% CTR / pos 9.75 | 1544 | `마르타 코스튜크` (3340 impr, pos 7.89)<br>`카롤리나 무초바` (617 impr, pos 11.48) | `D:\web\tennisfrens` |
| `cartain.kr` | 2 | `title_handoff` | 3955 impr / 78 clicks / 1.97% CTR / pos 9.58 | 1070 | `missing` | `D:\web\cartainkr` |
| `gong365.kr` | 3, 4 | `title_handoff`, `content_handoff` | 3052 impr / 37 clicks / 1.21% CTR / pos 8.13 | 89 | `전남 2026 기업 지원사업 공고` (37 impr, pos 8.19)<br>`충남 충북 2026 기업 지원사업 공고` (25 impr, pos 9.00) | `D:\web\gong365kr` |
| `estat.kr` | 5, 6 | `title_handoff`, `content_handoff` | 2779 impr / 13 clicks / 0.47% CTR / pos 7.85 | 43 | `missing` | `D:\web\estatkr` |
| `dogswhere.com` | 7 | `title_handoff` | 1124 impr / 21 clicks / 1.87% CTR / pos 12.96 | 1575 | `missing` | `D:\web\dogswherecom` |
| `petinsuer.com` | 8 | `title_handoff` | 1368 impr / 18 clicks / 1.32% CTR / pos 9.45 | 119 | `노견 기준` (10 impr, pos 6.90) | `D:\web\petinsuercom` |
| `dogspang.kr` | 9, 11 | `title_handoff`, `content_handoff` | 1106 impr / 20 clicks / 1.81% CTR / pos 9.92 | 92 | `강아지 발바닥 각화증` (20 impr, pos 7.90) | `D:\web\dogspangkr` |
| `nexttech7.com` | 10 | `title_handoff` | 965 impr / 19 clicks / 1.97% CTR / pos 13.41 | 194 | `missing` | `D:\web\nexttech7com` |
| `today2424.kr` | 13 | `content_handoff` | 912 impr / 37 clicks / 4.06% CTR / pos 9.43 | 92 | `missing` | `D:\web\today2424\2424` |
| `homeimer.com` | 14 | `content_handoff` | 807 impr / 0 clicks / 0.00% CTR / pos 66.42 | 13 | `missing` | `D:\web\homeimercom` |
| `legalser.com` | 16 | `content_handoff` | 654 impr / 2 clicks / 0.31% CTR / pos 56.25 | 21 | `missing` | `D:\web\legalsercom` |
| `healfood.kr` | 17, 18 | `title_handoff`, `content_handoff` | 513 impr / 4 clicks / 0.78% CTR / pos 8.87 | 32 | `missing` | `D:\web\healfoodkr` |

## Technical Status

| Site | Platform | Sitemap | AdSense | ads.txt | Decision |
|---|---|---|---|---|---|
| `tennisfrens.com` | `wordpress` | `https://www.tennisfrens.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `cartain.kr` | `wordpress` | `https://cartain.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `gong365.kr` | `wordpress` | `https://gong365.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `estat.kr` | `wordpress` | `https://estat.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `dogswhere.com` | `wordpress` | `https://dogswhere.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `petinsuer.com` | `wordpress` | `https://petinsuer.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `dogspang.kr` | `wordpress` | `https://dogspang.kr/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `nexttech7.com` | `wordpress` | `https://nexttech7.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `today2424.kr` | `wordpress` | `https://today2424.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `homeimer.com` | `wordpress` | `https://homeimer.com/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `legalser.com` | `wordpress` | `https://legalser.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `healfood.kr` | `wordpress` | `https://healfood.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |

## Stop Conditions

- Do not edit WordPress titles, slugs, article bodies, headings, or in-body internal links from this handoff.
- Do not publish drafts, schedule posts, submit sitemaps, ping IndexNow, deploy, or mutate CMS/API state without an explicit apply step and rollback path.
- If localPath is missing or dirty, collect evidence only and do not create content in production.
- Re-run pnpm stats:update and pnpm fleet:optimize:plan before using this handoff after the next dashboard data window.
