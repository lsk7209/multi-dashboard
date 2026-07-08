# cartain.kr Title And Cloudflare Follow-Up - 2026-07-08

Dashboard evidence snapshot: `2026-07-08T04:15:13.350Z`

## Site State

- Site id: `cartain-2`
- Host: `cartain.kr`
- Local path inspected: `D:\web\cartainkr`
- Fresh dashboard status:
  - GA4 last 7 days: 284 users / 322 sessions / 321 views
  - GA4 previous 7 days: 225 users / 252 sessions / 254 views
  - GA4 last 30 days: 950 users / 1,078 sessions / 1,120 views
  - GSC last 30 days: 39 clicks / 2,564 impressions / 1.52% CTR / average position 9.82
  - GSC last 7 days: 9 clicks / 970 impressions / 0.93% CTR / average position 8.95
  - Sitemap: `https://cartain.kr/sitemap.xml`, 928 submitted, 0 warnings/errors, last downloaded `2026-07-03T02:40:11.957Z`
  - AdSense and `ads.txt`: dashboard checks pass

## Public Crawl Checks

- `https://cartain.kr/` responds with 200 from Vercel.
- No public `cf-ray` or Cloudflare serving-header signal was observed.
- Homepage metadata:
  - Title: `카테인 - 자동차 정보 플랫폼`
  - Description: `카테인 - 자동차 구매, 유지비, 세금 계산 등 스마트한 자동차 정보를 제공합니다.`
  - Canonical: `https://cartain.kr`
- Priority sample page:
  - `https://cartain.kr/magazine/car-guide-2026-20260514-mptr`: 200, Vercel, cache miss on sample check.

## Cloudflare Residue Check

- No `cf*.txt` token file was found under `D:\web\cartainkr`.
- Repository string search did not find operational Cloudflare, Wrangler, Pages, Workers, or D1 usage outside non-actionable matches.
- Non-actionable matches:
  - `index.html` and `api/ssr.ts` contain a Naver verification token beginning with `cf244...`; this is not Cloudflare and must be preserved.
  - `package-lock.json` contains hash/integrity substrings with `D1`; these are dependency metadata, not Cloudflare D1.

## Git And Pipeline State

- Local `D:\web\cartainkr` has a pre-existing modified file:
  - `scripts/auto_publish.py`
- Recent GitHub Actions for `lsk7209/cartainkr` are passing:
  - `Auto Publish Article`, schedule, success, latest run `2026-07-08T01:15:47Z`
  - Prior scheduled runs on `2026-07-07`, `2026-07-06`, `2026-07-05`, `2026-07-04`, `2026-07-03`, `2026-07-02`, `2026-07-01`, `2026-06-30`, `2026-06-29` also succeeded.

## Title Handoff Evidence

Top GSC opportunity from the fresh dashboard snapshot:

| Query | Clicks | Impressions | CTR | Avg Position |
| --- | ---: | ---: | ---: | ---: |
| `2026년 신차 출시 일정` | 1 | 24 | 4.17% | 6.88 |

Site-wide opportunity:

- 30-day GSC average position is near page one at 9.82, but CTR is only 1.52%.
- 7-day CTR dropped to 0.93% while impressions increased to 970.
- This points to snippet/title quality and query-page matching rather than an indexing failure.

## Critical Metadata Finding

Sitemap inspection shows several `car-guide-2026...` URLs that can compete for broad 2026 car-intent searches. Sample metadata checks found mojibake in live titles/descriptions on some pages:

- `https://cartain.kr/magazine/car-guide-2026-20260514-mptr`
  - Live title begins with garbled text: `�ڵ��� Ÿ�̾�...`
  - Live description also begins with garbled text.
- `https://cartain.kr/magazine/car-guide-2026-20260514-xsnr`
  - Live title begins with garbled text: `�����ڽ� ����...`
  - Live description also begins with garbled text.

Other sampled `car-guide-2026...` pages render Korean correctly:

- `https://cartain.kr/magazine/car-guide-2026-20260513-w1uj`
  - `자동차 불법 튜닝 완전 정리 2026: 합법과 불법 경계선·과태료·보험 영향 - 자동차 정보 | 카테인`
- `https://cartain.kr/magazine/car-guide-2026-20260513-cs45`
  - `자동차 리콜 조회·신청 방법 2026: 무상 수리 받는 법과 놓쳤을 때 대처법 - 자동차 정보 | 카테인`
- `https://cartain.kr/magazine/car-guide-2026-20260513-wo0v`
  - `자동차 의무보험 완전 가이드 2026: 미가입 과태료·책임보험 최소 가입 기준 - 자동차 정보 | 카테인`

## Recommended Work Plan

### P1: Mojibake cleanup before title optimization

The highest-risk issue is broken Korean text in live title/description fields. Fix this before rewriting titles for CTR.

Recommended steps:

1. Identify the source records for the affected slugs in the publishing DB or generation queue.
2. Confirm whether mojibake exists in stored title/description/content or is introduced at render time.
3. Re-decode or regenerate affected records from the original Korean source where available.
4. Add a pre-publish guard that rejects titles/descriptions containing replacement characters like `�`.
5. Re-submit the repaired URLs through the existing sitemap/GSC process after deploy.

### P2: Query-page mapping for `2026년 신차 출시 일정`

The dashboard handoff has query-level evidence but not URL-level GSC data. Before changing any title, pull URL dimension data for the query and choose one canonical target page.

Candidate title directions after P1:

1. `2026년 신차 출시 일정 총정리 | 국산차·수입차 주요 모델`
2. `2026 신차 출시 일정 | 전기차·SUV·세단 주요 모델 정리`
3. `2026년 출시 예정 신차 캘린더 | 브랜드별 일정과 체크포인트`

Recommended page strategy:

- Keep one main page for `2026년 신차 출시 일정`.
- Convert overlapping `car-guide-2026...` pages into narrower supporting pages, or internally link them to the main schedule page.
- Avoid many generic `car-guide-2026...` titles that differ only by slug/date.

### P3: Homepage title refinement

Homepage title is valid but generic. Defer until the broken article metadata is fixed.

Candidate homepage titles:

1. `카테인 | 자동차 구매·보험·유지비 정보 플랫폼`
2. `카테인 | 신차·중고차·자동차 유지비 가이드`
3. `카테인 | 자동차 정보와 비용 계산 가이드`

## Decision

- Classification: T3 title handoff, with P1 metadata repair prerequisite.
- Applied now: no source edit. The local repo has pre-existing changes, and the highest-risk fix likely touches generated article records or publishing code.
- Cloudflare action: no cleanup needed; no actionable Cloudflare residue was found.
- Next implementation should happen in the `cartainkr` repo after reconciling `scripts/auto_publish.py` and confirming whether the mojibake source is DB data or render logic.
