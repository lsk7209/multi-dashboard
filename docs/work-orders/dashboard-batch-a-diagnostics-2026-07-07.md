# Dashboard Batch A Diagnostics - 2026-07-07

- Generated: `2026-07-07T08:56:47.874Z`
- Stats snapshot: `2026-07-07T00:04:23.401Z`
- Production mutation performed: `false`

## Target Resolution

| SiteId | Host | URL | Local path | Cause | Next read-only step |
|---|---|---|---|---|---|
| todaypharm | todaypharm.kr | https://todaypharm.kr/ | D:/web/todaypharm | submitted_sitemap_but_no_gsc_visibility | Read-only DB freshness check for todaypharm: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| 2mlab-2 | 2mlab.kr | https://2mlab.kr/ | D:\web\2mlabkr | ga4_decline_needs_channel_split | Inspect property, sitemap response, robots, canonical, noindex, and whether this root host has any clean query/page evidence. |
| tasko-2 | tasko.kr | https://tasko.kr/ | D:\web\taskokr | ga4_decline_needs_channel_split | Inspect property, sitemap response, robots, canonical, noindex, and whether this root host has any clean query/page evidence. |
| dogswhere | dogswhere.com | https://dogswhere.com/ | D:/web/dogswherecom | ga4_channel_drop_likely_not_search_drop | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| dullegilgogo | dullegilgogo.kr | https://dullegilgogo.kr/ | D:/web/dullegilgogo | scheduled_api_data_freshness_check_required | Read-only DB freshness check for dullegilgogo: compare latest source updated_at/created_at and pending content queue counts before generating content. |

## Mutation Gate

Do not use mojibake query examples from older work orders as edit input. Use only fresh dashboard/GSC export query text after target resolution.

Avoid these operations from this packet:
- WordPress publish/update/schedule
- Search Console sitemap submit or indexing request
- production DB writes, backfills, migrations, imports
- Vercel deploy/env/domain changes
- AdSense console changes
- GitHub Actions dispatches
- broad sitemap resubmission

## Per-Site Details

### todaypharm / todaypharm.kr

- URL: `https://todaypharm.kr/`
- GSC property: `https://todaypharm.kr/`
- Local path: `D:/web/todaypharm`
- Cause: `submitted_sitemap_but_no_gsc_visibility`
- Gate: Do not publish, backfill, submit sitemaps, request indexing, deploy, or write DB/content until this site's read-only cause is confirmed.
### 2mlab-2 / 2mlab.kr

- URL: `https://2mlab.kr/`
- GSC property: `https://2mlab.kr/`
- Local path: `D:\web\2mlabkr`
- Cause: `ga4_decline_needs_channel_split`
- Gate: Do not publish, backfill, submit sitemaps, request indexing, deploy, or write DB/content until this site's read-only cause is confirmed.

### tasko-2 / tasko.kr

- URL: `https://tasko.kr/`
- GSC property: `https://tasko.kr/`
- Local path: `D:\web\taskokr`
- Cause: `ga4_decline_needs_channel_split`
- Gate: Do not publish, backfill, submit sitemaps, request indexing, deploy, or write DB/content until this site's read-only cause is confirmed.

### dogswhere / dogswhere.com

- URL: `https://dogswhere.com/`
- GSC property: `sc-domain:dogswhere.com`
- Local path: `D:/web/dogswherecom`
- Cause: `ga4_channel_drop_likely_not_search_drop`
- Gate: Do not publish, backfill, submit sitemaps, request indexing, deploy, or write DB/content until this site's read-only cause is confirmed.

### dullegilgogo / dullegilgogo.kr

- URL: `https://dullegilgogo.kr/`
- GSC property: `https://dullegilgogo.kr/`
- Local path: `D:/web/dullegilgogo`
- Cause: `scheduled_api_data_freshness_check_required`
- Gate: Do not publish, backfill, submit sitemaps, request indexing, deploy, or write DB/content until this site's read-only cause is confirmed.
