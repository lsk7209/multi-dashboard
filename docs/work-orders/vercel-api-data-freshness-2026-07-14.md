# Vercel/API Data Freshness Work Order - 2026-07-14

## Current Contract

- This is a read-only triage artifact, not proof of new source data.
- A site-specific adapter must record its source timestamp and queue state before content generation is added.
- Do not pull production secrets, write databases, publish, deploy, submit to Search Console, or change titles/bodies from this work order.

## Candidates

- `askore` — `site_probe_required`: Read-only DB freshness check for askore: compare latest source updated_at/created_at and pending content queue counts before generating content.
- `bojo24` — `site_probe_required`: Read-only DB freshness check for bojo24: compare latest source updated_at/created_at and pending content queue counts before generating content.
- `campgogo` — `site_probe_required`: Read-only DB freshness check for campgogo: compare latest source updated_at/created_at and pending content queue counts before generating content.
- `coverclarityhealth` — `source_check_required`: Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded.
- `dogswhere` — `source_check_required`: Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded.
- `dolbomjigi-ehon365` — `site_probe_required`: Read-only DB freshness check for dolbomjigi-ehon365: compare latest source updated_at/created_at and pending content queue counts before generating content.
- `doseogogo` — `source_check_required`: Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded.
- `dullegilgogo` — `site_probe_required`: Read-only DB freshness check for dullegilgogo: compare latest source updated_at/created_at and pending content queue counts before generating content.
- `gong365` — `site_probe_required`: Read-only DB freshness check for gong365: compare latest source updated_at/created_at and pending content queue counts before generating content.
- `gradienttrail` — `source_check_required`: Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded.
- `kapti` — `source_check_required`: Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded.
- `localgeo` — `source_check_required`: Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded.
- `nongsusangogo` — `site_probe_required`: Read-only DB freshness check for nongsusangogo: compare latest source updated_at/created_at and pending content queue counts before generating content.
- `patentgogo` — `source_check_required`: Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded.
- `petjigi` — `site_probe_required`: Read-only DB freshness check for petjigi: compare latest source updated_at/created_at and pending content queue counts before generating content.
- `picklefriend` — `site_probe_required`: Read-only DB freshness check for picklefriend: compare latest source updated_at/created_at and pending content queue counts before generating content.
- `pregnancy-ehon365` — `manual_review`: Review local project evidence before adding this site to a source-data freshness workflow.
- `rndatlas` — `manual_review`: Review local project evidence before adding this site to a source-data freshness workflow.
- `roadways` — `site_probe_required`: Read-only DB freshness check for roadways: compare latest source updated_at/created_at and pending content queue counts before generating content.
- `sinhonjigi-ehon365` — `manual_review`: Review local project evidence before adding this site to a source-data freshness workflow.
- `solarpaybackmap` — `source_check_required`: Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded.
- `temon` — `site_probe_required`: Read-only DB freshness check for temon: compare latest source updated_at/created_at and pending content queue counts before generating content.
- `tennisfrens` — `site_probe_required`: Read-only DB freshness check for tennisfrens: compare latest source updated_at/created_at and pending content queue counts before generating content.
- `texturb` — `source_check_required`: Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded.
- `today2424` — `source_check_required`: Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded.
- `todaypharm` — `site_probe_required`: Read-only DB freshness check for todaypharm: compare latest source updated_at/created_at and pending content queue counts before generating content.
- `wattbenchs` — `site_probe_required`: Read-only DB freshness check for wattbenchs: compare latest source updated_at/created_at and pending content queue counts before generating content.
- `yungyanggogo` — `source_check_required`: Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded.

## Stop Condition

This report does not measure a production database or upstream API. Do not generate or publish content from these rows until a site-specific read-only source-data probe records a current source timestamp and queue state.
