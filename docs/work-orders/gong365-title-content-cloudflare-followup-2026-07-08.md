# gong365.kr Title/Content And Cloudflare Follow-Up - 2026-07-08

## Evidence

- Source policy: direct dashboard snapshot, public HTTP checks, GitHub PR/Actions, and local repo inspection only; no `gmail-digest`.
- Dashboard snapshot: `2026-07-08T04:15:13.350Z` from `data/site-stats.json`.
- Dashboard row: `gong365.kr`, siteId `gong365`, local path `D:\web\gong365kr`.
- 30d GSC: 1,876 impressions / 24 clicks / 1.28% CTR / avg position 8.30.
- 30d GA4 users: 63.
- Top queries:
  - `전남 2026 기업 지원사업 공고`: 13 impressions / avg position 7.23.
  - `충남 충북 2026 기업 지원사업 공고`: 10 impressions / avg position 9.20.

## Platform Correction

- Existing handoff metadata labels the site as `wordpress` with `https://gong365.kr/wp-json/wp/v2`.
- Public and repo evidence show the active site is a Next.js app on Vercel:
  - Home response: `200`, `Server: Vercel`, `X-Matched-Path: /`.
  - Local repo: `D:\web\gong365kr`, GitHub remote `https://github.com/lsk7209/gong365kr.git`.
  - WP REST search is not usable for this site.
- Future work for this site should use the Next/Vercel route and repo model, not WordPress/CMS mutation assumptions.

## Cloudflare Cleanup

- User policy: Cloudflare is not used; Cloudflare/Wrangler/Workers/Pages/D1 residue is cleanup scope.
- Real residue already removed:
  - `D:\web\gong365kr\public\cf1bbae352df4a22a23cbf48bb08350d.txt`
- Follow-up PR:
  - `https://github.com/lsk7209/gong365kr/pull/3`
  - Merged: `2026-07-08T04:08:59Z`
  - Merge commit: `13c255a37dac596307a63814f32f168ebcbd05dd`
  - Removed stale `wrangler pages deploy` detection from `scripts/audit-hosting-costs.mjs`.
  - Preserved Vercel production deploy detection.
  - Checks: Hosting Cost Guard `audit-hosting-costs` success; Vercel status success.
- Remaining Cloudflare-looking matches are non-actionable dependency metadata:
  - `pnpm-lock.yaml` optional peer metadata for `@cloudflare/workers-types`.

## Public Page Findings

### Home

- `https://gong365.kr/`
- Status: `200`
- Title: `창업머니맵(gong365.kr) - 지원사업 공고를 한 번에 확인`
- Meta description: `공365(gong365.kr)는 창업지원사업, 정책자금, 지역별 공고와 마감 임박 정보를 한 화면에서 확인합니다. 신청 체크와 원문 공고 이동까지 빠르게 연결합니다.`
- Robots: `index, follow`
- Canonical: `https://gong365.kr`

### Regional Query Targets

- `https://gong365.kr/regions/jeonnam`
  - Status: `200`
  - Title/H1: `전남 창업지원금 공고`
  - Description: `전남 사업자가 확인할 수 있는 창업지원사업과 정책자금 공고를 정리했습니다.`
  - Canonical: `https://gong365.kr/regions/jeonnam`
- `https://gong365.kr/regions/chungnam`
  - Status: `200`
  - Title/H1: `충남 창업지원금 공고`
  - Description: `충남 사업자가 확인할 수 있는 창업지원사업과 정책자금 공고를 정리했습니다.`
  - Canonical: `https://gong365.kr/regions/chungnam`
- `https://gong365.kr/regions/chungbuk`
  - Status: `200`
  - Title/H1: `충북 창업지원금 공고`
  - Description: `충북 사업자가 확인할 수 있는 창업지원사업과 정책자금 공고를 정리했습니다.`
  - Canonical: `https://gong365.kr/regions/chungbuk`

### Programs Index

- `https://gong365.kr/programs`
- Rechecked with `curl.exe` after an initial extraction false-positive.
- Status/content: page renders as the programs index.
- Title: `창업 공고 | 창업머니맵`
- Description: `진행 중인 공고를 우선 보여주고, 마감된 공고도 삭제 없이 기록으로 남겨 과거 공고도 확인할 수 있습니다.`
- Canonical: `https://gong365.kr/programs`

### Event Detail Runtime Issue

- Sample sitemap event URLs matched `app/events/[slug]` but returned `500 Internal Server Error` in production:
  - `https://gong365.kr/events/education-jeonnam-2026-2--2026-even-000000000068732`
  - `https://gong365.kr/events/education-chungnam-2026-7-fta--2026-even-000000000068724`
- Both 500 responses included correct per-event title/canonical metadata, but Next error handling added `robots=noindex`.
- Local verification in `D:\web\gong365kr`:
  - `pnpm.cmd install`: completed without lockfile changes.
  - `pnpm.cmd run type-check`: passed.
  - `pnpm.cmd run build`: passed.
  - `postbuild` submitted IndexNow successfully for 273 URLs; GSC submission skipped because service account env was missing.
- Assessment: production event-detail 500 is not a compile/type failure. Treat as deployment runtime or production data/env issue.

## Title And Content Plan

- Priority: T3 title/content handoff, but with one technical runtime blocker.
- Do not edit article/title/body text blindly; this site is a dynamic Next app and should be patched through route templates and data-backed page copy.

Recommended sequence:

1. Event detail runtime follow-up:
   - Inspect Vercel function logs for `app/events/[slug]`.
   - Compare production env/data access with local `.env.production.local` behavior.
   - Fix the runtime-only 500 before requesting indexing for event URLs.
2. Regional query title refinement:
   - Update regional route metadata to include the exact search intent:
     - `전남 2026 기업 지원사업 공고 | 창업머니맵`
     - `충남 2026 기업 지원사업 공고 | 창업머니맵`
     - `충북 2026 기업 지원사업 공고 | 창업머니맵`
   - Keep `창업지원금` as secondary wording in description/body, not the only title term.
3. 충남/충북 combined intent:
   - The query `충남 충북 2026 기업 지원사업 공고` is not a perfect fit for either single-region page.
   - Prefer a comparison/listing route or content block that internally links to both `/regions/chungnam` and `/regions/chungbuk`.
4. Content block improvement:
   - Add short region-specific explanatory blocks that mention `기업 지원사업 공고`, `2026`, `정책자금`, and application deadline checks naturally.
   - Preserve data-first utility; avoid generic long-form filler.
5. Revalidation:
   - After patch/deploy, recheck public status/meta/canonical/robots for `/regions/jeonnam`, `/regions/chungnam`, `/regions/chungbuk`, `/programs`, and two event detail URLs.
   - Then submit sitemap/IndexNow from the normal project script, not from `gmail-digest`.

## Local State Notes

- `D:\web\gong365kr` is intentionally not force-cleaned.
- Pre-existing dirty files observed:
  - `app/page.tsx`
  - `lib/blog/posts.ts`
  - `.omc/`
  - `lib/blog/batches/batch-31.ts`
- Local `main` is behind `origin/main` by 5 commits after PR #3, but user dirty files were preserved. Do not reset or checkout over them without a deliberate repo-cleanup step.

