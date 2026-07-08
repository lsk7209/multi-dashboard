# Title/Content Refresh Plan - 2026-07-08

Mutation status: no CMS, database, Search Console, AdSense, production title/body, or deployment mutation performed.

## Evidence

- Dashboard refresh command: `pnpm stats:update`
- Fresh snapshot: `data/site-stats.json`, `generatedAt=2026-07-08T01:11:20.285Z`
- Direct GSC evidence window: 2026-06-08 through 2026-07-07
- Public crawl checks: home, robots, sitemap, canonical, and sample page checks on 2026-07-08 KST
- Source policy: direct project/dashboard/GSC/public collection only. No `gmail-digest` signal used.

## Scope

This packet converts the completed insight/indexing audit into a safe title/content work queue for `temon.kr`, `softwa.kr`, and `today2424.kr`.

It does not authorize direct article-body rewrites or live title changes. Each row needs a site-local implementation pass that confirms current title, meta description, H1, duplicate/cannibalization risk, and rollback path before mutation.

## Priority Queue

| Priority | Site | URL | Problem | Primary Query/Page Evidence | Recommended Action |
| --- | --- | --- | --- | --- | --- |
| P1 | `temon.kr` | `https://temon.kr/` | High impressions with low CTR on the main test hub. | 3,606 impressions, 89 clicks, 2.47% CTR, avg position 8.36; queries include `테스트 모음`, `재밌는 테스트`, `mbti 테스트`. | Refresh home title/meta and above-fold copy around a clear test hub promise. Add internal links to strongest test categories. |
| P1 | `today2424.kr` | `https://today2424.kr/blog/lease-end-notice-template` | Best opportunity page has page-one position but underpowered snippet. | 315 impressions, 13 clicks, 4.13% CTR, avg position 7.69; query `월세 계약해지 통보 문자 예시` has 52 impressions, 5.77% CTR. | Improve title/meta to match template/example intent for 월세/전세 해지 통보 문자. Confirm snippet includes timing and proof angle. |
| P1 | `softwa.kr` | `https://softwa.kr/microsoft-powertoys-trouble-068/` | Low CTR near page one. | 116 impressions, 2 clicks, 1.72% CTR, avg position 8.20. | Refresh title/meta around PowerToys error/setup troubleshooting intent. Add internal links from Windows utility posts if available. |
| P2 | `softwa.kr` | ROFL/LoL replay article | Good CTR but rank is outside top ten; likely refresh/ranking opportunity. | 110 impressions, 12 clicks, 10.91% CTR, avg position 12.95; queries include `rofl 파일 재생`, `롤 리플레이 재생`, `.rofl 파일 보는 법`. | Refresh title/meta and intro angle around ROFL replay playback, storage, and conversion checks. Avoid overpromising MP4 conversion if the article does not actually provide it. |
| P2 | `temon.kr` | `https://temon.kr/tests/kpop-idol` | Residual `www` GSC row plus split CTR between historical and apex URLs. | `www` page: 259 impressions, 21 clicks, 8.11% CTR; apex page: 90 impressions, 3 clicks, 3.33% CTR; queries include `아이돌 테스트`, `아이돌 포지션 테스트`. | Confirm canonical/meta consistency after `www` 308 to apex. Refresh title/meta only if current live title underplays idol-position intent. |
| P2 | `today2424.kr` | `https://today2424.kr/blog/cross-ventilation-window-timing` | Page-one-ish position with low CTR. | 50 impressions, 2 clicks, 4.00% CTR, avg position 9.80. | Align snippet with 원룸 환기, 맞통풍 시간대, and 창문 여는 순서 intent. |
| P3 | `today2424.kr` | `https://today2424.kr/blog/sunlight-window-direction-check` | Ranking improvement candidate. | 27 impressions, 2 clicks, 7.41% CTR, avg position 13.19. | Consider title/meta refresh around 햇빛, 창문 방향, and 집 보기 체크 intent after P1/P2 rows. |

## Candidate Title Directions

These are direction candidates only, not approved live titles.

| Site | URL | Candidate Direction |
| --- | --- | --- |
| `temon.kr` | `/` | `테스트 모음, 재미있는 MBTI·연애·아이돌 테스트` |
| `temon.kr` | `/` | `재밌는 테스트 모음: MBTI부터 아이돌 포지션까지` |
| `temon.kr` | `/tests/kpop-idol` | `아이돌 포지션 테스트: 나는 무대에서 어떤 역할일까` |
| `softwa.kr` | `/microsoft-powertoys-trouble-068/` | `PowerToys 오류 해결: 설치·실행·설정 문제 점검` |
| `softwa.kr` | ROFL/LoL replay article | `ROFL 파일 재생 방법: 롤 리플레이 저장·보는 법` |
| `softwa.kr` | ROFL/LoL replay article | `롤 리플레이 ROFL 파일 보는 법과 MP4 변환 전 확인` |
| `today2424.kr` | `/blog/lease-end-notice-template` | `월세 계약해지 통보 문자 예시와 발송 시점` |
| `today2424.kr` | `/blog/lease-end-notice-template` | `전세·월세 계약 해지 통보 문자 예시 정리` |
| `today2424.kr` | `/blog/cross-ventilation-window-timing` | `원룸 맞통풍 시간대와 창문 여는 순서` |

## Site Notes

### temon.kr

- Public crawl surface is healthy: home 200, robots index/follow, sitemap 200, canonical present.
- `www.temon.kr/tests/kpop-idol` currently 308 redirects to apex, so the residual GSC row should decay.
- The home page is the largest opportunity and should be handled before individual test pages.
- Do not create new tests or rewrite test result copy from this packet.

### softwa.kr

- Public crawl surface is healthy: home 200, sitemap index 200, sample pages indexable, canonical present.
- GSC rows are concentrated on a small set of software-help posts; use page-specific refreshes instead of a site-wide rewrite.
- PowerToys has the clearest CTR problem; ROFL has the clearest ranking refresh opportunity.
- Confirm current article claims before mentioning conversion, downloads, or tool compatibility.

### today2424.kr

- Public crawl surface is healthy: home 200, `www` 307 to apex, sitemap 200, canonical present.
- The lease notice template page is the first implementation target.
- Keep template/legal-adjacent wording practical and avoid legal-advice overclaims.
- Secondary work should focus on one-room living utility pages after the lease template is handled.

## Implementation Gates

Before any live site mutation:

1. Pull the target site repository or WordPress state and check local dirty state.
2. Capture current title, meta description, H1, canonical, and robots for each target URL.
3. Check nearby existing titles to avoid duplicate intent and cannibalization.
4. Apply one page-level change at a time with rollback notes.
5. Verify public HTML after deployment/cache purge.
6. Record the change and verification in this dashboard repository.

## Stop Conditions

- Do not edit article bodies, headings, titles, slugs, or in-body internal links directly from this planning packet.
- Do not publish drafts, schedule posts, submit sitemaps, request indexing, ping IndexNow, deploy, or mutate CMS/API state from this packet.
- If a target repo or WordPress state is dirty, record it and continue with read-only evidence unless the dirty change is known and compatible.
- Re-run `pnpm stats:update` before using this packet after the next dashboard data window.
