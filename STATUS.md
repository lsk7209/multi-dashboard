# Status | 마지막: 2026-06-06
## 현재 작업
신규 등록 10개 사이트 검토 완료 — 전부 정상(siteOwner 권한+sitemap 제출됨). workgogo "auth_error/sitemap0"은 캐시잔상으로 확정. 색인 가속 실행: 신규 10개 ×12 URL = 120건 Indexing API 색인요청 성공(120/120). 3일 후 impressions 재측정 예정
## 최근 변경 (최근 5개만)
- 06-06: AdSense 체크 415 오탐 52건 수정 — update-ga4-stats.ts fetch 3곳에 브라우저 UA+Accept 헤더(SITE_FETCH_HEADERS). 헤더없는 undici를 호스팅 WAF가 415 차단(curl/브라우저는 통과). 8개 재검증 home=200·adsense=O·ads.txt=pub-ok. workgogo GSC auth_error는 캐시잔상(diag 실시간 정상)
- 06-05: T1 계측끊김 3건 복구 — haemongdream(헤더 mu-plugin GA4 누락)·finan(GA4가 비활성테마 kadence에 있어 미로드→mu-plugin)·estat(실제정상,캐시오판). measurement ID GA4 API로 확보. 실페이지 출력 검증
- 06-05: P1 자동수집 복구 — "결제중단"은 오진, 실제 type-check 깨짐(1425dad monetization required 누락). 타입에러 3건 수정+술어회귀 수정. 워크플로우 성공 확인
- 06-05: P3·P4 대시보드 오탐 제거 — 급락 게이트 통일·상향(50/10), sitemap지연 stale 분리. 급락 6~7→1, 일일이슈 38→0
- 06-05: 운영 지식 영속화 docs/OPERATIONS.md(SSOT)·site-repo-map·메모리
## TODO
- [ ] T2 Google 색인진출(mbti-tasko·crepika 등 네이버검증·Google노출0) / T3 순위(insupang·legalser·goesku) / T4 CTR(askore 노출1254)
- [ ] T5 campgogo sitemap 에러 283건 (SSH정보 없음 — chemicloud_ssh.txt 미등록), esgyo 방치 점검
- [ ] P5: diag에 계측끊김 자동탐지(노출≥50 & GA4<10 포함) 추가 / P9 .gitignore / P10 위험레포
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
