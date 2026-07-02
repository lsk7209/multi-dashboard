# Status | 마지막: 2026-06-14
## 현재 작업
**구글 상위노출 보강 — 전체 311편 완료 ✅** (10사이트)
- 보강+교체: 글당 공식기관 아웃링크1+내부링크2+검증불가수치 처리. 백업 data/backups/, 예약일 보존
- 자동색인: 10사이트 전부 Rank Math Instant Indexing에 서비스계정(id-ai-179@cursorai) 주입 → 발행 즉시 자동 색인. 일쿼터 200(발행 10/일이라 여유)
## 최근 변경 (최근 5개만)
- 06-14: 10사이트 Rank Math Google Instant Indexing 설정완료(7사이트 신규주입+limsight 모듈활성화). 색인API 인증OK(쿼터초과=권한정상)
- 06-14: 구글보강 311편 — certifi30 homeimer28 gpt-nexttech726 todayshops34 limsight61 trave61 chatgipt24 smartsellerpit16 ezfunnel15 kang416
- 06-14: WP매핑은 draft SLUG↔WP slug 안전매칭(미발행 여분 자동제외). smartsellerpit 32draft중 발행16만 매칭
- 06-14: chemicloud_ssh.txt kang4 WP_PATH·ezfunnel keyHint 보강(접속주석=-i라인 필수, findKey가 keyHint만 봄). 백업 .bak-20260614
- 06-14: 콘텐츠 예약발행 10사이트 300편 완료 (06-15~08-14 하루1편)
- 06-14: homeimer 28편 예약발행 완료 (07-15~08-11)
- 06-14: gpt.nexttech7 26편 예약발행 완료 (07-18~08-12)
- 06-14: certifi.kr 30편 예약발행 완료 (07-14~08-12)
- 06-14: 대시보드 워크플로우 에러 3개 수정 후 성공 복구 (TS+ESLint)
## TODO
- [ ] **예약큐 3개월 보충 (다음 작업)**: max(마지막예약일)<2026-09-14 사이트 24개 식별 완료. 분석 `data/3month-gap-2026-06-14.json`, 도구 `scripts/collect-scheduled-queue.sh`(OUT 동적날짜)+`scripts/analyze-3month-gap.mjs`. 명목 부족 727편(하루1편 가정—실제 발행빈도 보정 필요, chatgipt 등 하루다편). **즉시시급: healthgotoo.com 예약2개 2일후소진**. 트래픽보유 우선권장: haemongdream(월2172)·tasko(220)·2mlab(163)·softwa(106)·nicewomen(85)·yesa(61). 트래픽0 신규(kang4·homeimer·limsight·luxurytraver·finan)는 후순위. travelpang.kr 수집실패(키손상). 발행=publish-draft.mjs, 우선순위/범위 사용자결정 대기
- [ ] robots 보완 3개(caregos.com·wattbenchs.com·nongsusangogo.kr): Bytespider 차단 미적용. 이 PC에 로컬 레포 없음 → 다른 PC에서 robots.ts에 `{userAgent:'Bytespider',disallow:'/'}` + 누락 AI봇 추가 후 push. (etique.kr·나머지 14개는 06-14 적용 완료)
- [x] T2 Google 색인진출: 15개 사이트 Indexing API 제출 완료 (15/15 성공)
- [ ] T3 insupang: 로컬 코드 없음·US 보험 극경쟁 키워드(pos 80~97) — 전략 재검토 필요
- [x] T3 legalser: 빈 카테고리(Arbitration/Comparative/AI) 3개 포스트 추가 + Indexing API 제출 완료
- [x] T4 CTR: askore Article JSON-LD dateModified +058358년 버그 수정 (db29f00)
- [x] T5 campgogo sitemap-campsites.xml GSC 제출 완료 — 4개 사이트맵 모두 OK (5138+63+52+112)
- [x] P5: diag 계측끊김 자동탐지 구현 완료 — 파이날팡·homemake 탐지
- [ ] P10 위험레포 (기준 미정)
- [ ] temon 순위 파일럿 (docs/temon-ranking-pilot.md)
## 결정사항
- 날짜 기준: UTC 완료일 기준, 오늘 제외
- GSC 도메인 속성은 sc-domain: 형식 사용 (https:// 아님)
- sorimate는 쇼핑몰이라 AdSense 미적용 — monetization:false로 수익화 체크 제외
- 급락 판정: 변동률만으론 극소트래픽이 오탐 → 절대규모 게이트(직전 사용자≥50 / 클릭≥10) 필수
- sitemap 수집지연은 Google 크롤링 의존 → 운영상태(stale) 아님, 점수 감점으로만 반영
- SEO 재정의: 주요 사이트는 네이버 의존(96~98%)·Google 미개척 → 증분 기회는 Google 색인·진출
- yesa.kr 카테고리: 달러자산=3, 자녀증여=2, 상속세=5, 노후설계=4, 칼럼=9, 재테크=11, 환율헤지=6
## 주의
- 운영 문제 점검은 `docs/OPERATIONS.md` 먼저 읽고 `npm run diag` 실행 — 코드 재분석 금지
- 워크플로우 실패 시 결제부터 의심 금지 — Validate(type-check/lint/build) step이 흔한 원인. `gh run view <id> --log-failed`로 확인
- repo에 실제 secret 파일 커밋 금지
- 2대 컴퓨터 작업 → 작업 전 git pull, 후 push 필수
- 산출물(.omc·reports·tmp·.env) .gitignore 추가 권장 (P9)
