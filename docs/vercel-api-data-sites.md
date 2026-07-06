# Vercel API Data Sites

Generated: 2026-07-06T23:20:27.301Z

This inventory is read-only. It identifies Vercel/Next.js sites that appear to collect or depend on API data and therefore need a new-data check before content enrichment/generation.

## Summary

- Total: 28
- Scheduled DB ingestion: 14
- API-backed content: 11
- Candidate review: 3

## Operating Rule

Before starting or ending relevant work, ask whether to check these sites for newly collected API data and add content enrichment/generation from that data.

## Sites

| Site | URL | Level | Declared platform | Stale label | Collection scripts | Scheduled workflows | Recommended check |
|---|---|---|---|---|---|---|---|
| askore | https://askore.kr/ | scheduled-db-ingestion | wordpress | yes | backfill-editorial-metrics.mjs<br>etl-kfri-sample.mjs<br>etl-nibr-ktsn-live.mjs<br>etl-nibr-live.mjs<br>etl-nibr-sample.mjs | marketing-audit.yml<br>plant-data-pipeline.yml | Read-only DB freshness check for askore: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| bojo24 | https://bojo24.kr/ | scheduled-db-ingestion | wordpress | yes | - | data-sync.yml<br>insert-articles.yml<br>scheduled-post-notify.yml | Read-only DB freshness check for bojo24: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| campgogo | https://campgogo.kr/ | scheduled-db-ingestion | wordpress | yes | collect-bulk.ts<br>import-csv.ts | backup.yml<br>bulk-collect.yml<br>dedup.yml | Read-only DB freshness check for campgogo: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| coverclarityhealth | https://coverclarityhealth.com/ | api-backed-content | nextjs | no | - | - | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| dogswhere | https://dogswhere.com/ | api-backed-content | wordpress | yes | import-real-data.ts<br>run_collector.py<br>sync-pet-tour.ts | - | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| dolbomjigi-ehon365 | https://dolbomjigi.ehon365.kr/ | scheduled-db-ingestion | wordpress | yes | import-quality-blog-batch.mjs | etl.yml | Read-only DB freshness check for dolbomjigi-ehon365: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| doseogogo | https://doseogogo.kr/ | api-backed-content | wordpress | yes | - | - | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| dullegilgogo | https://dullegilgogo.kr/ | scheduled-db-ingestion | wordpress | yes | - | bulk-collect.yml<br>quality-gate.yml | Read-only DB freshness check for dullegilgogo: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| gong365 | https://gong365.kr/ | scheduled-db-ingestion | wordpress | yes | sync-bizinfo-events.ts<br>sync-bizinfo.ts | cron-sync.yml | Read-only DB freshness check for gong365: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| gradienttrail | https://gradienttrail.com/ | api-backed-content | static | no | fetch-nps-data.mjs | nps-sync.yml | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| kapti | https://kapti.kr/ | api-backed-content | nextjs | no | - | - | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| localgeo | https://localgeo.app/ | api-backed-content | static | no | - | - | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| nongsusangogo | https://nongsusangogo.kr/ | scheduled-db-ingestion | wordpress | yes | batch-collect.ts | bulk-collect.yml | Read-only DB freshness check for nongsusangogo: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| patentgogo | https://patentgogo.com/ | api-backed-content | nextjs | no | fetch-kipris-snapshot.mjs<br>import-patent-snapshot.mjs | - | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| petjigi | https://petjigi.kr/ | scheduled-db-ingestion | wordpress | yes | - | etl-businesses.yml<br>etl-insurance-alert.yml<br>etl-registration-agents.yml<br>etl-rescued-animals.yml<br>etl-shelters.yml | Read-only DB freshness check for petjigi: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| picklefriend | https://picklefriend.kr/ | scheduled-db-ingestion | wordpress | yes | collect-courts.ts<br>collect-players.ts | ping-search.yml | Read-only DB freshness check for picklefriend: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| pregnancy-ehon365 | https://pregnancy.ehon365.kr/ | candidate-review | wordpress | yes | - | - | Review local collector/API signals before adding this site to the mandatory new-data workflow. |
| rndatlas | https://rndatlas.com/ | candidate-review | nextjs | no | - | - | Review local collector/API signals before adding this site to the mandatory new-data workflow. |
| roadways | https://roadways.kr/ | scheduled-db-ingestion | wordpress | yes | sync-tourapi.ts | sync-tourapi.yml | Read-only DB freshness check for roadways: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| sinhonjigi-ehon365 | https://sinhonjigi.ehon365.kr/ | candidate-review | wordpress | yes | - | - | Review local collector/API signals before adding this site to the mandatory new-data workflow. |
| solarpaybackmap | https://solarpaybackmap.com/ | api-backed-content | nextjs | no | - | - | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| temon | https://temon.kr/ | scheduled-db-ingestion | wordpress | yes | fix-missing-imports.js | seo-weekly-report.yml | Read-only DB freshness check for temon: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| tennisfrens | https://tennisfrens.com/ | scheduled-db-ingestion | wordpress | yes | fetch-ga4-data.mjs<br>fetch-gsc-data.mjs<br>sync-blog-posts-db.js | auto-content.yml<br>content-refresh.yml | Read-only DB freshness check for tennisfrens: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| texturb | https://texturb.com/ | api-backed-content | wordpress | yes | - | - | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| today2424 | https://today2424.kr/ | api-backed-content | wordpress | yes | - | - | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| todaypharm | https://todaypharm.kr/ | scheduled-db-ingestion | wordpress | yes | fetch-hff-data.ts<br>fetch-medicines.ts<br>sync-pharmacies-from-json.ts<br>sync-pharmacies.ts<br>sync-public-data.ts | auto-enrich-supplements.yml<br>daily-sync.yml<br>generate-blog.yml<br>generate-content.yml<br>publish-content.yml | Read-only DB freshness check for todaypharm: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| wattbenchs | https://wattbenchs.com/ | scheduled-db-ingestion | wordpress | yes | - | gsc-sitemap-submit.yml | Read-only DB freshness check for wattbenchs: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| yungyanggogo | https://yungyanggogo.kr/ | api-backed-content | wordpress | yes | sync-national-nutrition.mjs | - | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |

## Notes

- `scheduled-db-ingestion` means the project has scheduled collection plus DB signals.
- `api-backed-content` means the project uses external/API-backed datasets but may not have a live DB ingestion job yet.
- `candidate-review` means local signals are present but need manual confirmation before treating the site as mandatory.
- Production DB writes, live backfills, content publishing, and deployments remain explicit actions.
