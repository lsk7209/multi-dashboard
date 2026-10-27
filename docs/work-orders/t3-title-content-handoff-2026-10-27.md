# T3 Title/Content Handoff - 2026-10-27T09:45:07.000Z

Mutation status: no CMS, database, Search Console, AdSense, production title/body, or deployment mutation performed.

## Dashboard Evidence

- Snapshot: `2026-10-27T09:45:07.000Z`
- Stats path: `data\site-stats.json`
- Plan path: `data\fleet-optimization-plan-2026-10-27.json`
- Sites path: `scripts\setup\sites.yaml`
- Refresh command: `pnpm stats:update`
- Refresh failed sources: `skipped_refresh_failed:gsc:auth_error:17`, `skipped_refresh_failed:adsense:api_error:21`, `skipped_refresh_failed:adsense:missing_config:3`, `skipped_refresh_failed:adsense_collector:transient_error:21`, `skipped_refresh_failed:ads_txt:api_error:20`, `skipped_refresh_failed:ads_txt:missing_config:4`, `skipped_refresh_failed:ads_txt_collector:transient_error:20`

## Summary

| Metric | Count |
|---|---:|
| Sites | 4 |
| Title handoff rows | 4 |
| Content handoff rows | 2 |

## Handoff Queue

| Site | Plan ranks | Actions | 30d GSC | 30d users | Top queries | Local source |
|---|---:|---|---:|---:|---|---|
| `yungyanggogo.kr` | 1, 2 | `title_handoff`, `content_handoff` | 6807 impr / 57 clicks / 0.84% CTR / pos 7.18 | 86 | `갈비탕 단백질` (18 impr, pos 9.61)<br>`과자 영양성분표` (10 impr, pos 8.40) | `D:\web\yungyanggogo` |
| `sorimate.com` | 3, 4 | `title_handoff`, `content_handoff` | 4439 impr / 27 clicks / 0.61% CTR / pos 8.37 | 11 | `gwaenchanayo` (24 impr, pos 9.00)<br>`eolmayeyo meaning in english` (17 impr, pos 8.00)<br>`jal meokgesseumnida` (12 impr, pos 5.92) | `missing` |
| `petinsuer.com` | 6 | `title_handoff` | 636 impr / 9 clicks / 1.42% CTR / pos 8.72 | 148 | `missing` | `D:\web\petinsuercom` |
| `patentgogo.com` | 7 | `title_handoff` | 302 impr / 0 clicks / 0.00% CTR / pos 10.94 | 31 | `missing` | `D:\web\tukhugogo` |

## Technical Status

| Site | Platform | Sitemap | AdSense | ads.txt | Decision |
|---|---|---|---|---|---|
| `yungyanggogo.kr` | `nextjs` | `https://yungyanggogo.kr/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title + content workflow; do not directly edit live titles or article bodies from this handoff. |
| `sorimate.com` | `wordpress` | `https://sorimate.com/sitemap.xml`, warnings=0, errors=0 | `unknown` | `unknown` | Evidence collection only: no controlled local content source is registered; do not create or edit production content. |
| `petinsuer.com` | `wordpress` | `https://petinsuer.com/sitemap_index.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |
| `patentgogo.com` | `nextjs` | `https://patentgogo.com/sitemap.xml`, warnings=0, errors=0 | `ok` | `ok` | Title workflow only; do not directly edit live titles from this handoff. |

## Stop Conditions

- Do not edit WordPress titles, slugs, article bodies, headings, or in-body internal links from this handoff.
- Do not publish drafts, schedule posts, submit sitemaps, ping IndexNow, deploy, or mutate CMS/API state without an explicit apply step and rollback path.
- If localPath is missing or dirty, collect evidence only and do not create content in production.
- Re-run pnpm stats:update and pnpm fleet:optimize:plan before using this handoff after the next dashboard data window.
