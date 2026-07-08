# softwa.kr PowerToys Meta Refresh - 2026-07-08

## Evidence

- Dashboard snapshot: `data/site-stats.json`, `generatedAt=2026-07-08T01:11:20.285Z`
- Source policy: direct dashboard/GSC/public/WP evidence only; no `gmail-digest`
- Target: `https://softwa.kr/microsoft-powertoys-trouble-068/`
- Work order source: `docs/work-orders/title-content-refresh-plan-2026-07-08.md`
- GSC page evidence: 116 impressions, 2 clicks, 1.72% CTR, average position 8.20

## Current State Captured

- HTTP status: 200
- Canonical: `https://softwa.kr/microsoft-powertoys-trouble-068/`
- Robots: `follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large`
- WordPress post ID: `2683`
- Published post title/H1 left unchanged: `Microsoft PowerToys 실행 오류 해결 순서와 재설치 전 점검`
- Previous Rank Math title: `Microsoft PowerToys 실행 오류 해결 순서와 재설치 전 점검`
- Previous Rank Math description: `Microsoft PowerToys 실행 오류 해결 순서와 재설치 전 점검에서 가장 먼저 볼 것은 기능 수가 아니라 실제 업무가 끝까지 이어지는지입니다. [&hellip;]`

## Change Applied

- Updated only Rank Math SEO metadata. No slug, H1, body, category, or publication-state change.
- New Rank Math title: `PowerToys 안 켜짐·설치 오류 해결, 재설치 전 점검 순서`
- New Rank Math description: `PowerToys가 실행되지 않거나 설치 오류가 날 때 확인할 순서입니다. 권한, 백그라운드 프로세스, 업데이트, 재설치 전 백업까지 빠르게 점검하세요.`
- New Rank Math focus keyword: `PowerToys 오류, PowerToys 안 켜짐, PowerToys 설치 오류`

## Backup And Rollback

- Backup directory: `/home/softwa/site-optimizer-backups/softwa-powertoys-meta-20260708-115523`
- Backup contents:
  - `db.sql`
  - `post-2683.json`
  - `post-2683-meta.json`
- Rollback path: restore the previous three Rank Math meta values from `post-2683-meta.json`, or restore the DB dump if a broader rollback is required.

## Cloudflare Residue Check

- Public HTML/header check: no `Cloudflare`, `cf-ray`, `cdn-cgi`, or `wrangler` signal; server header is LiteSpeed.
- WordPress plugin/theme filename check: no Cloudflare plugin/theme artifact found.
- WordPress option cleanup: deleted blank LiteSpeed Cloudflare CDN option rows:
  - `litespeed.conf.cdn-cloudflare`
  - `litespeed.conf.cdn-cloudflare_email`
  - `litespeed.conf.cdn-cloudflare_key`
  - `litespeed.conf.cdn-cloudflare_name`
  - `litespeed.conf.cdn-cloudflare_zone`
  - `litespeed.conf.cdn-cloudflare_clear`
- Post-cleanup option search: `[]`

## Verification

- Public HTML title now renders: `PowerToys 안 켜짐·설치 오류 해결, 재설치 전 점검 순서`
- Public HTML meta description now renders: `PowerToys가 실행되지 않거나 설치 오류가 날 때 확인할 순서입니다. 권한, 백그라운드 프로세스, 업데이트, 재설치 전 백업까지 빠르게 점검하세요.`
- Canonical stayed unchanged.
- Robots stayed indexable.

## Next

- Recheck GSC CTR after the next data window.
- Continue with `today2424.kr` P1 lease notice template metadata refresh.
