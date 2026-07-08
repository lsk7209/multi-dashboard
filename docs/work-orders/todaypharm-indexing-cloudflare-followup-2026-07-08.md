# todaypharm.kr Indexing And Cloudflare Follow-Up - 2026-07-08

## Evidence

- Dashboard snapshot: `data/site-stats.json`, `generatedAt=2026-07-08T01:11:20.285Z`
- Source policy: direct dashboard/public/repo/Vercel evidence only; no `gmail-digest`
- Prior audit source: `docs/insight-indexing-audit-2026-07-08.md`
- Site: `https://todaypharm.kr/`
- Repo: `lsk7209/today_yakuk`
- Local path inspected: `D:\web\todaypharm`

## Public Indexing Surface

- Home: HTTP 200
- `robots.txt`: HTTP 200
- `sitemap.xml`: HTTP 200
- Hosting/runtime signal: Vercel
- Home title: `약국오늘 | 실시간 영업 약국 검색`
- Home meta robots: `index, follow`
- Home canonical: `https://todaypharm.kr`
- Sitemap request is served by Vercel and matched to `/sitemap-index.xml`.
- No `cf-ray` header was observed in public header checks.

## DB Freshness Check

- `todaypharm` is classified as `scheduled-db-ingestion` in `docs/vercel-api-data-sites.md`.
- Vercel env names confirm production `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` exist for project `today-yakuk`.
- Production env pull was not performed: materializing live Vercel secrets locally was rejected by the safety gate.
- A generic `D:\env\turso_*` read-only attempt did not match the todaypharm schema, so it was not used as evidence.
- Result: DB source freshness and pending queue counts remain unverified in this pass.

## Cloudflare Residue Cleanup

- Public header check: no Cloudflare response-header signal; server is Vercel.
- D:\web local residue found: untracked Cloudflare verification token file:
  - `D:\web\todaypharm\public\cf1bbae352df4a22a23cbf48bb08350d.txt`
- Local cleanup applied: deleted the untracked `cf*.txt` token file.
- Repo residue found: `scripts/audit-hosting-costs.mjs` still detected `wrangler pages deploy`.
- Repo cleanup PR: `https://github.com/lsk7209/today_yakuk/pull/5`
- Merge commit on `main`: `3b9df70`
- Post-cleanup repo search: no matches for `Cloudflare`, `cloudflare`, `wrangler`, `pages.dev`, `@cloudflare`, `CLOUDFLARE`, `D1`, or the `cf1b...` token outside ignored dependency/build directories.

## Verification

- `npm run lint`: passed
- `npm run build`: passed
- GitHub PR checks:
  - Vercel Preview Comments: passed
  - Vercel: passed
  - `audit-hosting-costs`: passed

## Next

- Monitor GSC after the 2026-07-08 sitemap resubmission noted in `docs/insight-indexing-audit-2026-07-08.md`.
- If DB freshness is required, use a safer non-secret route such as a read-only admin/status endpoint or a trusted CI/Vercel-side check instead of pulling production secrets locally.
- Continue the insight/indexing queue with `2mlab`, `dogswhere`, `temon`, `softwa`, and `today2424`.
