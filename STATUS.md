# Status | 마지막: 2026-06-05
## 현재 작업
멀티사이트 SEO 진단·동기화 정리 완료. temon 순위 파일럿 계획 수립(구현은 temon 레포 세션)
## 최근 변경 (최근 5개만)
- 06-05: 2대 컴퓨터 동기화 정리 — 7개 레포 origin 통일(작업 전부 stash 백업, 유실 0)
- 06-05: 사이트→레포 지도(docs/site-repo-map) + SEO 진단 — 제목·메타는 이미 양호, 병목은 순위
- 06-05: temon 파일럿 계획(docs/temon-ranking-pilot) — related-tests 컴포넌트 미연결이 레버
- 06-04: etique/luxurytraver GSC FILE verify 자동화 → siteOwner 승격, 수집 실패 0건
- 06-04: sorimate monetization:false 제외 + cron 하루2회
## TODO
- [ ] temon 순위 파일럿 구현 (temon 레포 세션, docs/temon-ranking-pilot.md 참조)
- [ ] 위험 레포 정리 — goeskucom 충돌 잔재, cartainkr·askorekr·sinhonjigi 소스 미커밋
- [ ] GitHub Actions 결제/스펜딩 제한 해제 후 워크플로우 재실행
## 결정사항
- 날짜 기준: UTC 완료일 기준, 오늘 제외
- GSC 도메인 속성은 sc-domain: 형식 사용 (https:// 아님)
- sorimate는 쇼핑몰이라 AdSense 미적용 — monetization:false로 수익화 체크 제외
- SEO: 사이트 제목·메타는 이미 양호 → 개선 레버는 순위(콘텐츠·내부링크), 제목 아님
## 주의
- repo에 실제 secret 파일 커밋 금지
- 2대 컴퓨터 작업 → 작업 전 git pull, 후 push 필수 (안 하면 동기화 충돌)
- 산출물(.omc·reports·tmp·.env) .gitignore 추가 권장 — 동기화 혼란 주범
- GitHub Actions 결제 문제로 자동 수집 중단 (수동 stats:update 대체)
