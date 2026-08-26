# T3 Title/Content Handoff - 2026-08-26T12:47:22.978Z

Mutation status: no CMS, database, Search Console, AdSense, production title/body, or deployment mutation performed.

## Dashboard Evidence

- Snapshot: `2026-08-26T12:47:22.978Z`
- Stats path: `data\site-stats.json`
- Plan path: `data\fleet-optimization-plan-2026-08-26.json`
- Sites path: `scripts\setup\sites.yaml`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `skipped_refresh_failed:gsc:auth_error:3`, `skipped_refresh_failed:adsense:api_error:3`, `skipped_refresh_failed:adsense_collector:transient_error:24`, `skipped_refresh_failed:ads_txt:api_error:1`, `skipped_refresh_failed:ads_txt_collector:transient_error:18`

## Summary

| Metric | Count |
|---|---:|
| Sites | 11 |
| Title handoff rows | 7 |
| Content handoff rows | 7 |

## Handoff Queue

| Site | Plan ranks | Actions | 30d GSC | 30d users | Top queries | Local source |
|---|---:|---|---:|---:|---|---|
| `tennisfrens.com` | 1 | `title_handoff` | 12085 impr / 129 clicks / 1.07% CTR / pos 11.09 | 1475 | `ntrp 테스트` (25 impr, pos 1.00)<br>`사라 베일렉` (789 impr, pos 10.03)<br>`사라베일렉` (73 impr, pos 10.59) | `D:\web\tennisfrens` |
| `estat.kr` | 2, 3 | `title_handoff`, `content_handoff` | 11831 impr / 69 clicks / 0.58% CTR / pos 7.68 | 94 | `missing` | `D:\web\estatkr` |
| `sorimate.com` | 4 | `title_handoff` | 4950 impr / 15 clicks / 0.30% CTR / pos 13.97 | 343 | `eolmayeyo` (23 impr, pos 8.22)<br>`gwaenchanayo meaning` (11 impr, pos 9.09) | `missing` |
| `petinsuer.com` | 5 | `title_handoff` | 1719 impr / 30 clicks / 1.75% CTR / pos 9.21 | 258 | `missing` | `D:\web\petinsuercom` |
| `legalser.com` | 8 | `content_handoff` | 1035 impr / 6 clicks / 0.58% CTR / pos 32.03 | 59 | `missing` | `D:\web\legalsercom` |
| `seniorlivingnote.com` | 9 | `content_handoff` | 929 impr / 28 clicks / 3.01% CTR / pos 8.15 | 82 | `missing` | `missing` |
| `patentgogo.com` | 10, 11 | `title_handoff`, `content_handoff` | 779 impr / 4 clicks / 0.51% CTR / pos 10.36 | 28 | `missing` | `D:\web\tukhugogo` |
| `travelpang.kr` | 13 | `content_handoff` | 609 impr / 18 clicks / 2.96% CTR / pos 11.71 | 53 | `missing` | `D:\web\travelpangkr` |
| `wedfairguide.com` | 14 | `title_handoff` | 489 impr / 7 clicks / 1.43% CTR / pos 11.42 | 97 | `missing` | `D:\web\wedding-fair-decision-hub` |
| `trave.kr` | 15, 17 | `title_handoff`, `content_handoff` | 511 impr / 11 clicks / 2.15% CTR / pos 6.89 | 42 | `missing` | `D:\web\travekr` |
| `gradienttrail.com` | 16 | `content_handoff` | 531 impr / 6 clicks / 1.13% CTR / pos 22.79 | 63 | `missing` | `D:\web\park-trail` |

## Technical Status

| Site | Platform | Sitemap | AdSense | ads.txt | Decision |
|---|---|---|---|---|---|
| `tennisfrens.com` | `wordpress` | `https://www.tennisfrens.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `estat.kr` | `wordpress` | `https://estat.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `sorimate.com` | `wordpress` | `https://sorimate.com/sitemap.xml`, warnings=0, errors=0 | `unknown` | `unknown` | Evidence collection only: no controlled local content source is registered; do not create or edit production content. |
| `petinsuer.com` | `wordpress` | `https://petinsuer.com/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `legalser.com` | `wordpress` | `https://legalser.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `seniorlivingnote.com` | `wordpress` | `https://seniorlivingnote.com/wp-sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Evidence collection only: no controlled local content source is registered; do not create or edit production content. |
| `patentgogo.com` | `nextjs` | `https://patentgogo.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `travelpang.kr` | `wordpress` | `https://travelpang.kr/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |
| `wedfairguide.com` | `nextjs` | `https://wedfairguide.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `trave.kr` | `wordpress` | `https://trave.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `gradienttrail.com` | `static` | `https://gradienttrail.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Persona/content workflow only; do not directly edit article bodies from this handoff. |

## Stop Conditions

- Do not edit WordPress titles, slugs, article bodies, headings, or in-body internal links from this handoff.
- Do not publish drafts, schedule posts, submit sitemaps, ping IndexNow, deploy, or mutate CMS/API state without an explicit apply step and rollback path.
- If localPath is missing or dirty, collect evidence only and do not create content in production.
- Re-run pnpm stats:update and pnpm fleet:optimize:plan before using this handoff after the next dashboard data window.
