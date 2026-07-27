# T3 Title/Content Handoff - 2026-07-27T13:07:27.938Z

Mutation status: no CMS, database, Search Console, AdSense, production title/body, or deployment mutation performed.

## Dashboard Evidence

- Snapshot: `2026-07-27T13:07:27.938Z`
- Stats path: `data\site-stats.json`
- Plan path: `data\fleet-optimization-plan-2026-07-27.json`
- Sites path: `scripts\setup\sites.yaml`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `none`

## Summary

| Metric | Count |
|---|---:|
| Sites | 13 |
| Title handoff rows | 11 |
| Content handoff rows | 6 |

## Handoff Queue

| Site | Plan ranks | Actions | 30d GSC | 30d users | Top queries | Local source |
|---|---:|---|---:|---:|---|---|
| `tennisfrens.com` | 1 | `title_handoff` | 15371 impr / 134 clicks / 0.87% CTR / pos 9.82 | 1663 | `missing` | `D:\web\tennisfrens` |
| `cartain.kr` | 2 | `title_handoff` | 5481 impr / 119 clicks / 2.17% CTR / pos 9.20 | 1314 | `missing` | `D:\web\cartainkr` |
| `estat.kr` | 3, 4 | `title_handoff`, `content_handoff` | 3497 impr / 18 clicks / 0.51% CTR / pos 7.59 | 64 | `냉면 양념장 황금 레시피` (17 impr, pos 2.88) | `D:\web\estatkr` |
| `gong365.kr` | 5, 6 | `title_handoff`, `content_handoff` | 2894 impr / 31 clicks / 1.07% CTR / pos 8.13 | 92 | `missing` | `D:\web\gong365kr` |
| `nexttech7.com` | 7 | `title_handoff` | 1754 impr / 38 clicks / 2.17% CTR / pos 14.77 | 213 | `missing` | `D:\web\nexttech7com` |
| `petinsuer.com` | 8 | `title_handoff` | 1577 impr / 15 clicks / 0.95% CTR / pos 8.81 | 165 | `강아지 요플레 먹어도 되나요` (11 impr, pos 9.91) | `D:\web\petinsuercom` |
| `dogspang.kr` | 11, 12 | `title_handoff`, `content_handoff` | 677 impr / 10 clicks / 1.48% CTR / pos 9.79 | 71 | `missing` | `missing` |
| `legalser.com` | 13 | `content_handoff` | 682 impr / 3 clicks / 0.44% CTR / pos 24.76 | 32 | `legalser` (11 impr, pos 9.09) | `D:\web\legalsercom` |
| `plategogo.com` | 14, 16 | `title_handoff`, `content_handoff` | 560 impr / 0 clicks / 0.00% CTR / pos 10.37 | 87 | `김치찌개 칼로리` (40 impr, pos 9.88)<br>`바나나 1개 단백질` (18 impr, pos 8.06)<br>`그릭요거트 100g 칼로리` (12 impr, pos 11.33) | `D:\web\plategogocom` |
| `today2424.kr` | 15 | `content_handoff` | 594 impr / 31 clicks / 5.22% CTR / pos 9.30 | 66 | `missing` | `D:\web\today2424\2424` |
| `patentgogo.com` | 17 | `title_handoff` | 467 impr / 1 clicks / 0.21% CTR / pos 10.93 | 57 | `missing` | `D:\web\tukhugogo` |
| `healfood.kr` | 18 | `title_handoff` | 388 impr / 4 clicks / 1.03% CTR / pos 10.64 | 45 | `missing` | `D:\web\healfoodkr` |
| `yungyanggogo.kr` | 19 | `title_handoff` | 314 impr / 3 clicks / 0.96% CTR / pos 6.97 | 166 | `missing` | `D:\web\yungyanggogo` |

## Technical Status

| Site | Platform | Sitemap | AdSense | ads.txt | Decision |
|---|---|---|---|---|---|
| `tennisfrens.com` | `wordpress` | `https://www.tennisfrens.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `cartain.kr` | `wordpress` | `https://cartain.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `estat.kr` | `wordpress` | `https://estat.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `gong365.kr` | `wordpress` | `https://gong365.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `nexttech7.com` | `wordpress` | `https://nexttech7.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `petinsuer.com` | `wordpress` | `https://petinsuer.com/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `dogspang.kr` | `wordpress` | `https://dogspang.kr/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Evidence collection only: no controlled local content source is registered; do not create or edit production content. |
| `legalser.com` | `wordpress` | `https://legalser.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `plategogo.com` | `nextjs` | `https://plategogo.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `today2424.kr` | `wordpress` | `https://today2424.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `patentgogo.com` | `nextjs` | `https://patentgogo.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `healfood.kr` | `wordpress` | `https://healfood.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `yungyanggogo.kr` | `wordpress` | `https://yungyanggogo.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |

## Stop Conditions

- Do not edit WordPress titles, slugs, article bodies, headings, or in-body internal links from this handoff.
- Do not publish drafts, schedule posts, submit sitemaps, ping IndexNow, deploy, or mutate CMS/API state without an explicit apply step and rollback path.
- If localPath is missing or dirty, collect evidence only and do not create content in production.
- Re-run pnpm stats:update and pnpm fleet:optimize:plan before using this handoff after the next dashboard data window.
