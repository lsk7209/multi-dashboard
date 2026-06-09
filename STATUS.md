# Status | 마지막: 2026-06-09
## 현재 작업
**AdSense 승인 파이프라인** — 미승인 65개 사이트를 이력 남기며 순차 검증·보완. 계획: `.omc/plans/adsense-approval-pipeline.md`, 이력 SSOT: `docs/adsense-approval-log.md`(11승인+65대상, GSC노출순).
- **Tier0 cartain.kr**: 봇 SSR 배포·검증OK. 재심사 요청 대기(30일).
- **todaypharm.kr**: thin content 수정 완료 (`80ed5d8`). 재신청 대기.
- **gong365.kr**: ✅ verdict→review, score=96. /regions 526토큰(091e5ae). AdSense 신청 대기.
- **다음 대상**: askore.kr (#1, GSC 1254), texturb.com (#2, 704)
## 최근 변경 (최근 5개만)
- 06-09: gong365.kr /regions FAQ+재작성 526토큰(091e5ae) → audit verdict review score=96
- 06-09: gong365.kr /check·/regions 콘텐츠 보강, canonical www통일, sitemap제외 (338fddf)
- 06-09: 대시보드 stats 갱신 (2026-06-09 history 생성, `0946108`)
- 06-09: 이력 파일 3건 커밋 push (`5a8643c`) — audit batch 2026-06-08 결과 반영
- 06-07: todaypharm thin content 해결+커밋 완료 — `generateTemplateContent` 추가, isThin noindex
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
