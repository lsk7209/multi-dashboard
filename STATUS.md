# Status | 마지막: 2026-06-04
## 현재 작업
수집/설정 이슈 전부 해결 — 모든 수집 실패 0건 (GA4/GSC/sitemap/AdSense/ads.txt)
## 최근 변경 (최근 5개만)
- 06-04: etique/luxurytraver GSC FILE verify 자동화(SSH 토큰 배치+insert) → siteOwner 승격, gscStatus ok
- 06-04: monetization 플래그 추가 — sorimate(쇼핑몰) AdSense/ads.txt 수집·이슈 집계 제외
- 06-04: 자동 갱신 cron 주2회→하루2회(KST 07/19시) 변경
- 06-04: 로컬 수동 재수집, 신규 GA4 3개 추가(73→76), 수익화 이슈 0건
- 05-30: 자동 갱신 워크플로우에 GA4 웹 스트림 import + history 커밋 추가
## TODO
- [ ] GitHub Actions 결제/스펜딩 제한 해제 후 워크플로우 재실행
## 결정사항
- 날짜 기준: UTC 완료일 기준, 오늘 제외
- GSC 도메인 속성은 sc-domain: 형식 사용 (https:// 아님)
- sorimate는 쇼핑몰이라 AdSense 미적용 — monetization:false로 수익화 체크 제외
- 같은 도메인 인사이트는 하나로 통합 표시
## 주의
- repo에 실제 secret 파일 커밋 금지
- GitHub Secret GCP_SA_KEY_JSON 등록 완료
- GitHub Actions 결제 문제로 자동 수집 중단 상태 (수동 stats:update로 대체 중)
- AdSense 미적용 사이트는 sites.yaml에 monetization:false 추가
