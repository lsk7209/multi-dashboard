# Vercel/API Data Sites

- Generated at: `2026-07-19T05:02:45.579Z`
- Scope: WordPress excluded by default; Vercel/Next.js API-data sites included from dashboard and local evidence.
- Production mutation: `false`

## Summary

| Evidence level | Count |
|---|---:|
| total | 28 |
| scheduled-db-ingestion | 14 |
| api-backed-content | 11 |
| candidate-review | 3 |

## Sites

| Site | URL | Evidence level | Recommended check |
|---|---|---|---|
| `askore` | https://askore.kr/ | scheduled-db-ingestion | Read-only DB freshness check for askore: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `bojo24` | https://bojo24.kr/ | scheduled-db-ingestion | Read-only DB freshness check for bojo24: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `campgogo` | https://campgogo.kr/ | scheduled-db-ingestion | Read-only DB freshness check for campgogo: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `coverclarityhealth` | https://coverclarityhealth.com/ | api-backed-content | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `dogswhere` | https://dogswhere.com/ | api-backed-content | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `dolbomjigi-ehon365` | https://dolbomjigi.ehon365.kr/ | scheduled-db-ingestion | Read-only DB freshness check for dolbomjigi-ehon365: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `doseogogo` | https://doseogogo.kr/ | api-backed-content | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `dullegilgogo` | https://dullegilgogo.kr/ | scheduled-db-ingestion | Read-only DB freshness check for dullegilgogo: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `gong365` | https://gong365.kr/ | scheduled-db-ingestion | Read-only DB freshness check for gong365: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `gradienttrail` | https://gradienttrail.com/ | api-backed-content | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `kapti` | https://kapti.kr/ | api-backed-content | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `localgeo` | https://localgeo.app/ | api-backed-content | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `nongsusangogo` | https://nongsusangogo.kr/ | scheduled-db-ingestion | Read-only DB freshness check for nongsusangogo: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `patentgogo` | https://patentgogo.com/ | api-backed-content | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `petjigi` | https://petjigi.kr/ | scheduled-db-ingestion | Read-only DB freshness check for petjigi: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `picklefriend` | https://picklefriend.kr/ | scheduled-db-ingestion | Read-only DB freshness check for picklefriend: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `pregnancy-ehon365` | https://pregnancy.ehon365.kr/ | candidate-review | Review local collector/API signals before adding this site to the mandatory new-data workflow. |
| `rndatlas` | https://rndatlas.com/ | candidate-review | Review local collector/API signals before adding this site to the mandatory new-data workflow. |
| `roadways` | https://roadways.kr/ | scheduled-db-ingestion | Read-only DB freshness check for roadways: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `sinhonjigi-ehon365` | https://sinhonjigi.ehon365.kr/ | candidate-review | Review local collector/API signals before adding this site to the mandatory new-data workflow. |
| `solarpaybackmap` | https://solarpaybackmap.com/ | api-backed-content | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `temon` | https://temon.kr/ | scheduled-db-ingestion | Read-only DB freshness check for temon: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `tennisfrens` | https://tennisfrens.com/ | scheduled-db-ingestion | Read-only DB freshness check for tennisfrens: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `texturb` | https://texturb.com/ | api-backed-content | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `today2424` | https://today2424.kr/ | api-backed-content | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
| `todaypharm` | https://todaypharm.kr/ | scheduled-db-ingestion | Read-only DB freshness check for todaypharm: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `wattbenchs` | https://wattbenchs.com/ | scheduled-db-ingestion | Read-only DB freshness check for wattbenchs: compare latest source updated_at/created_at and pending content queue counts before generating content. |
| `yungyanggogo` | https://yungyanggogo.kr/ | api-backed-content | Check whether upstream API/reference data changed, then create or refresh SEO content only after source-date evidence is recorded. |
