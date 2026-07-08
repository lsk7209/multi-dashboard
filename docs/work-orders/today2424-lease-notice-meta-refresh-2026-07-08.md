# today2424.kr Lease Notice Meta Refresh - 2026-07-08

## Evidence

- Dashboard snapshot: `data/site-stats.json`, `generatedAt=2026-07-08T01:11:20.285Z`
- Source policy: direct dashboard/GSC/public/repo evidence only; no `gmail-digest`
- Target: `https://today2424.kr/blog/lease-end-notice-template`
- Work order source: `docs/work-orders/title-content-refresh-plan-2026-07-08.md`
- GSC page evidence: 315 impressions, 13 clicks, 4.13% CTR, average position 7.69
- Query focus: `월세 계약해지 통보 문자 예시`

## Current State Captured

- HTTP status: 200
- Hosting/runtime: Vercel/Next.js
- Canonical: `https://today2424.kr/blog/lease-end-notice-template`
- Previous title: `전세·월세 만기 통보 문자 예시: 계약 종료 전에 이렇게 | 이사독립`
- Previous meta description: `만기 전에 언제, 어떤 문구로 통보해야 하는지 헷갈린다면 이 글부터 보세요. 전세·월세 종료 통보 예시와 증거 남기는 방법을 정리했습니다.`
- Local source: `lsk7209/2424`, target content in `data/blog-posts.ts`
- Note: this was a metadata/snippet refresh for an existing page, not a new API-data collection or content-generation pass.

## Change Applied

- PR: `https://github.com/lsk7209/2424/pull/2`
- Merge commit on `main`: `8ead856`
- Updated page source title:
  - `월세 계약해지 통보 문자 예시와 전세 만기 발송 시점`
- Updated page source excerpt:
  - `월세·전세 계약을 끝낼 때 보낼 문자 예시와 발송 시점을 정리했습니다. 만기 전 통보 문구, 증거 남기는 방법, 주의할 표현을 확인하세요.`
- Updated keyword set to include `월세 계약해지 통보 문자 예시`.
- Synced static AI/LLM index entries:
  - `public/ai-index.json`
  - `public/llms-full.txt`

## Cloudflare Residue Check

- Public stack/header check: Vercel/Next.js; no Cloudflare response-header signal recorded.
- Repository residue check after cleanup: no matches for `Cloudflare`, `cloudflare`, `wrangler`, `pages.dev`, `@cloudflare`, `CLOUDFLARE`, or `D1` outside ignored dependency/build directories.
- Cleanup applied: removed the remaining `wrangler pages deploy` detector from `scripts/audit-hosting-costs.mjs` because the managed sites do not use Cloudflare.

## Verification

- `npm run validate:content`: passed
- `npm run lint`: passed
- `npm run build`: passed
- GitHub PR checks:
  - Vercel Preview Comments: passed
  - Vercel: passed
  - `audit-hosting-costs`: passed

## Next

- Recheck GSC CTR after the next data window.
- Continue the planned insight/index checks for `todaypharm`, `2mlab`, `dogswhere`, `temon`, `softwa`, and `today2424`.
