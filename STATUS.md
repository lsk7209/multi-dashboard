# Status | 마지막: 2026-06-09
## 현재 작업
**AdSense 승인 파이프라인** — 미승인 65개 사이트를 이력 남기며 순차 검증·보완. 계획: `.omc/plans/adsense-approval-pipeline.md`, 이력 SSOT: `docs/adsense-approval-log.md`(11승인+65대상, GSC노출순). 우선순위 거부확정→노출순, 보완 안전항목자동·본문수동.
- **Tier0 cartain.kr**: 봇 SSR 배포·검증OK. 재심사 요청 대기(30일).
- **todaypharm.kr**: thin content 수정+커밋+push 모두 완료 (`80ed5d8`). 재신청 대기.
- **다음 대상**: gong365.kr (About/Contact/Privacy/Terms 전부 404 — 최우선 차단항목)
## 최근 변경 (최근 5개만)
- 06-09: 이력 파일 3건 커밋 push (`5a8643c`) — audit batch 2026-06-08 결과 반영
- 06-07: todaypharm thin content 해결+커밋 완료 — `generateTemplateContent` 추가, isThin noindex
- 06-07: AdSense 파이프라인 착수 — 이력SSOT·계획 생성, cartain 봇SSR 완료
- 06-06: 레포 정리 — NUL 사고파일 삭제, .gitignore에 .omc/·NUL 추가, tracked .omc 추적해제
- 06-06: AdSense 체크 415 오탐 52건 수정 — update-ga4-stats.ts fetch 3곳에 브라우저 UA+Accept 헤더
## TODO
- [ ] T2 Google 색인진출(mbti-tasko·crepika 등 네이버검증·Google노출0) / T3 순위(insupang·legalser·goesku) / T4 CTR(askore 노출1254)
- [ ] T5 campgogo sitemap 에러 283건 (SSH정보 없음 — chemicloud_ssh.txt 미등록), esgyo 방치 점검
- [ ] P5: diag에 계측끊김 자동탐지(노출≥50 & GA4<10 포함) 추가 / P10 위험레포
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
