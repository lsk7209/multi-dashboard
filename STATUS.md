# Status | 마지막: 2026-06-05
## 현재 작업
개선우선순위 10가지 plan(.omc/plans/improvement-priorities-2026-06-05.md) 실행 중. P1~P4 완료, P2(haemongdream GA4 태그)·P5~P10 남음
## 최근 변경 (최근 5개만)
- 06-05: P1 자동수집 복구 — "결제 중단"은 오진. 실제는 1425dad가 monetization required 추가→type-check 깨짐(수집은 성공, Validate step이 commit 차단). 타입에러 3건 수정(update-ga4-stats/06-verify-readiness/import-ga4-sites)
- 06-05: P3·P4 대시보드 오탐 제거 — 급락 게이트 통일·상향(MIN_USERS 50/CLICKS 10, 헬퍼화), sitemap지연을 stale에서 분리. 트래픽급락 6~7→1건, 일일이슈 38→0
- 06-05: haemongdream GA4 계측 끊김 발견 — 06-03부터 일일 0·사이트 정상·HTML에 gtag 전무. 트래픽 하락 아닌 태그 유실
- 06-05: 급락 12건 재판정 — 대부분 극소트래픽 노이즈/캐시잔상. 진짜는 haemongdream(태그유실)·temon(Google노출 반토막, 네이버는 건재)뿐
- 06-05: 운영 지식 영속화 docs/OPERATIONS.md(SSOT) + `npm run diag`
## TODO
- [ ] P2: haemongdream GA4 태그 재삽입 (nexttech@158.247.212.123:/home/nexttech/haemongdream.com, WP) — measurement ID 매핑 확인 후
- [ ] P5: diag에 계측끊김 자동탐지(30일>100 & 어제=0) 추가
- [ ] P6 temon Google 노출 회복 / P7 Google 색인진출 / P8 GSC형식 교정확인 / P9 .gitignore / P10 위험레포
- [ ] temon 순위 파일럿 (docs/temon-ranking-pilot.md)
## 결정사항
- 날짜 기준: UTC 완료일 기준, 오늘 제외
- GSC 도메인 속성은 sc-domain: 형식 사용 (https:// 아님)
- sorimate는 쇼핑몰이라 AdSense 미적용 — monetization:false로 수익화 체크 제외
- 급락 판정: 변동률만으론 극소트래픽이 오탐 → 절대규모 게이트(직전 사용자≥50 / 클릭≥10) 필수
- sitemap 수집지연은 Google 크롤링 의존 → 운영상태(stale) 아님, 점수 감점으로만 반영
- SEO 재정의: 주요 사이트는 네이버 의존(96~98%)·Google 미개척 → 증분 기회는 Google 색인·진출
## 주의
- 운영 문제 점검은 `docs/OPERATIONS.md` 먼저 읽고 `npm run diag` 실행 — 코드 재분석 금지
- 워크플로우 실패 시 결제부터 의심 금지 — Validate(type-check/lint/build) step이 흔한 원인. `gh run view <id> --log-failed`로 확인
- repo에 실제 secret 파일 커밋 금지
- 2대 컴퓨터 작업 → 작업 전 git pull, 후 push 필수
- 산출물(.omc·reports·tmp·.env) .gitignore 추가 권장 (P9)
