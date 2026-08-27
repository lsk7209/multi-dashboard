# T3 Title/Content Handoff - 2026-08-27T01:29:24.500Z

Mutation status: no CMS, database, Search Console, AdSense, production title/body, or deployment mutation performed.

## Dashboard Evidence

- Snapshot: `2026-08-27T01:29:24.500Z`
- Stats path: `data\site-stats.json`
- Plan path: `data\fleet-optimization-plan-2026-08-27.json`
- Sites path: `scripts\setup\sites.yaml`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `skipped_refresh_failed:adsense:api_error:2`, `skipped_refresh_failed:adsense_collector:transient_error:26`, `skipped_refresh_failed:ads_txt_collector:transient_error:16`

## Summary

| Metric | Count |
|---|---:|
| Sites | 12 |
| Title handoff rows | 8 |
| Content handoff rows | 7 |

## Handoff Queue

| Site | Plan ranks | Actions | 30d GSC | 30d users | Top queries | Local source |
|---|---:|---|---:|---:|---|---|
| `tennisfrens.com` | 1 | `title_handoff` | 11821 impr / 124 clicks / 1.05% CTR / pos 11.10 | 1511 | `ntrp 테스트` (19 impr, pos 1.00)<br>`사라 베일렉` (584 impr, pos 10.42)<br>`사라베일렉` (73 impr, pos 10.59) | `D:\web\tennisfrens` |
| `estat.kr` | 2, 3 | `title_handoff`, `content_handoff` | 11658 impr / 66 clicks / 0.57% CTR / pos 7.69 | 96 | `missing` | `D:\web\estatkr` |
| `sorimate.com` | 4 | `title_handoff` | 4926 impr / 15 clicks / 0.30% CTR / pos 13.96 | 344 | `eolmayeyo` (20 impr, pos 8.40) | `missing` |
| `dogswhere.com` | 5 | `title_handoff` | 1558 impr / 38 clicks / 2.44% CTR / pos 10.21 | 2825 | `광주 오프리쉬` (50 impr, pos 9.60)<br>`강아지 맡길 곳` (10 impr, pos 33.80) | `D:\web\dogswherecom` |
| `petinsuer.com` | 6 | `title_handoff` | 1662 impr / 29 clicks / 1.74% CTR / pos 9.23 | 258 | `missing` | `D:\web\petinsuercom` |
| `legalser.com` | 9 | `content_handoff` | 998 impr / 6 clicks / 0.60% CTR / pos 32.27 | 59 | `missing` | `D:\web\legalsercom` |
| `seniorlivingnote.com` | 10 | `content_handoff` | 927 impr / 28 clicks / 3.02% CTR / pos 8.16 | 89 | `missing` | `missing` |
| `patentgogo.com` | 11, 12 | `title_handoff`, `content_handoff` | 748 impr / 4 clicks / 0.53% CTR / pos 10.36 | 32 | `missing` | `D:\web\tukhugogo` |
| `travelpang.kr` | 14 | `content_handoff` | 596 impr / 18 clicks / 3.02% CTR / pos 11.77 | 53 | `missing` | `D:\web\travelpangkr` |
| `trave.kr` | 15, 18 | `title_handoff`, `content_handoff` | 509 impr / 11 clicks / 2.16% CTR / pos 6.88 | 42 | `missing` | `D:\web\travekr` |
| `wedfairguide.com` | 16 | `title_handoff` | 471 impr / 7 clicks / 1.49% CTR / pos 11.30 | 101 | `missing` | `D:\web\wedding-fair-decision-hub` |
| `gradienttrail.com` | 17 | `content_handoff` | 516 impr / 6 clicks / 1.16% CTR / pos 22.98 | 60 | `missing` | `D:\web\park-trail` |

## Technical Status

| Site | Platform | Sitemap | AdSense | ads.txt | Decision |
|---|---|---|---|---|---|
| `tennisfrens.com` | `wordpress` | `https://tennisfrens.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `estat.kr` | `wordpress` | `https://estat.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `sorimate.com` | `wordpress` | `https://sorimate.com/sitemap.xml`, warnings=0, errors=0 | `unknown` | `unknown` | Evidence collection only: no controlled local content source is registered; do not create or edit production content. |
| `dogswhere.com` | `nextjs` | `https://dogswhere.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `petinsuer.com` | `wordpress` | `https://petinsuer.com/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `legalser.com` | `wordpress` | `https://legalser.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `seniorlivingnote.com` | `wordpress` | `https://seniorlivingnote.com/wp-sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Evidence collection only: no controlled local content source is registered; do not create or edit production content. |
| `patentgogo.com` | `nextjs` | `https://patentgogo.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `travelpang.kr` | `wordpress` | `https://travelpang.kr/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `trave.kr` | `wordpress` | `https://trave.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `wedfairguide.com` | `nextjs` | `https://wedfairguide.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `gradienttrail.com` | `static` | `https://gradienttrail.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |

## Stop Conditions

- Do not edit WordPress titles, slugs, article bodies, headings, or in-body internal links from this handoff.
- Do not publish drafts, schedule posts, submit sitemaps, ping IndexNow, deploy, or mutate CMS/API state without an explicit apply step and rollback path.
- If localPath is missing or dirty, collect evidence only and do not create content in production.
- Re-run pnpm stats:update and pnpm fleet:optimize:plan before using this handoff after the next dashboard data window.
