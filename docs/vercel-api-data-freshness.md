# Vercel/API Data Freshness

- Generated at: `2026-07-14T00:47:59.207Z`
- Dashboard stats snapshot: `2026-07-14T00:43:04.577Z`
- Inventory generated at: `2026-07-14T00:32:30.169Z`
- Source-data measurement: `not_collected`
- Production mutation: `false`

## Summary

| Decision | Count |
|---|---:|
| total | 28 |
| sourceDataMeasured | 0 |
| dashboard_evidence_blocked | 0 |
| site_probe_required | 14 |
| source_check_required | 11 |
| manual_review | 3 |

## Site Freshness Gate

| Site | Decision | Dashboard evidence | Source measured | Next step |
|---|---|---|---|---|
| `askore` | `site_probe_required` | current | no | Read-only DB freshness check for askore: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `bojo24` | `site_probe_required` | current | no | Read-only DB freshness check for bojo24: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `campgogo` | `site_probe_required` | current | no | Read-only DB freshness check for campgogo: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `coverclarityhealth` | `source_check_required` | current | no | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `dogswhere` | `source_check_required` | current | no | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `dolbomjigi-ehon365` | `site_probe_required` | current | no | Read-only DB freshness check for dolbomjigi-ehon365: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `doseogogo` | `source_check_required` | current | no | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `dullegilgogo` | `site_probe_required` | current | no | Read-only DB freshness check for dullegilgogo: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `gong365` | `site_probe_required` | current | no | Read-only DB freshness check for gong365: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `gradienttrail` | `source_check_required` | current | no | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `kapti` | `source_check_required` | current | no | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `localgeo` | `source_check_required` | current | no | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `nongsusangogo` | `site_probe_required` | current | no | Read-only DB freshness check for nongsusangogo: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `patentgogo` | `source_check_required` | current | no | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `petjigi` | `site_probe_required` | current | no | Read-only DB freshness check for petjigi: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `picklefriend` | `site_probe_required` | current | no | Read-only DB freshness check for picklefriend: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `pregnancy-ehon365` | `manual_review` | current | no | Review local project evidence before adding this site to a source-data freshness workflow. |
| `rndatlas` | `manual_review` | current | no | Review local project evidence before adding this site to a source-data freshness workflow. |
| `roadways` | `site_probe_required` | current | no | Read-only DB freshness check for roadways: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `sinhonjigi-ehon365` | `manual_review` | current | no | Review local project evidence before adding this site to a source-data freshness workflow. |
| `solarpaybackmap` | `source_check_required` | current | no | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `temon` | `site_probe_required` | current | no | Read-only DB freshness check for temon: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `tennisfrens` | `site_probe_required` | current | no | Read-only DB freshness check for tennisfrens: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `texturb` | `source_check_required` | current | no | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `today2424` | `source_check_required` | current | no | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `todaypharm` | `site_probe_required` | current | no | Read-only DB freshness check for todaypharm: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `wattbenchs` | `site_probe_required` | current | no | Read-only DB freshness check for wattbenchs: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `yungyanggogo` | `source_check_required` | current | no | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |

## Stop Condition

This report does not measure a production database or upstream API. Do not generate or publish content from these rows until a site-specific read-only source-data probe records a current source timestamp and queue state.
