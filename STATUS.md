# Status | 마지막: 2026-06-10
## 현재 작업
**AdSense 승인 파이프라인** — needs_patch 0개. 전체 보완완료.
## 최근 변경 (최근 5개만)
- 06-10: 대시보드 "사이트맵 URL" 컬럼 추가 — GSC submitted 수 표시 (sort 지원)
- 06-10: gover/trave 키등록+SSH검증, 2mlab/gpt.nexttech7.com/esgyo 1번서버 등록
- 06-10: goesku/campgogo/softwa/nongsusangogo/esgyo/youkamap bot 보완완료 6→0
- 06-10: richyou/nicewomen/picklefriend 1번서버 확인→보완완료 8→6
- 06-10: crepika/today2424/pregnancy/sinhonjigi 토큰 확인→보완완료
## TODO
- [ ] T2 Google 색인진출(mbti-tasko·crepika 등 네이버검증·Google노출0) / T3 순위(insupang·legalser·goesku) / T4 CTR(askore 노출1254)
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
## 주의
- 운영 문제 점검은 `docs/OPERATIONS.md` 먼저 읽고 `npm run diag` 실행 — 코드 재분석 금지
- 워크플로우 실패 시 결제부터 의심 금지 — Validate(type-check/lint/build) step이 흔한 원인. `gh run view <id> --log-failed`로 확인
- repo에 실제 secret 파일 커밋 금지
- 2대 컴퓨터 작업 → 작업 전 git pull, 후 push 필수
- 산출물(.omc·reports·tmp·.env) .gitignore 추가 권장 (P9)
