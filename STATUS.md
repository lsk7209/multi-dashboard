# Status | 마지막: 2026-05-30
## 현재 작업
대시보드 v2 기능 구현 및 로컬 수집 검증 완료
## 최근 변경 (최근 5개만)
- 05-30: GitHub Actions 최신 실패 원인 재확인 (결제/스펜딩 제한으로 job 시작 전 중단)
- 05-30: pnpm stats:update 성공 (96개 사이트, GA4/GSC 실패 0개, WP 발행일 75개)
- 05-30: 스파크라인, WP발행일, 트래픽급감패널, 주간리포트, sc-domain 수정 일괄 커밋
- 05-29: GSC 도메인 속성 9개 sc-domain: 형식으로 수정, texturb.com 권한 추가
- 05-29: 인사이트 도메인별 통합 (같은 사이트 중복 카드 제거)
## TODO
- [ ] GitHub Actions 결제/스펜딩 제한 해제 후 워크플로우 재실행
- [x] pnpm stats:update 실행해서 WP 발행일 + 히스토리 데이터 수집 확인
## 결정사항
- 날짜 기준: UTC 완료일 기준, 오늘 제외
- GSC 도메인 속성은 sc-domain: 형식 사용 (https:// 아님)
- 같은 도메인 인사이트는 하나로 통합 표시
## 주의
- repo에 실제 secret 파일 커밋 금지
- GitHub Secret GCP_SA_KEY_JSON 등록 완료
- GitHub Actions 결제 문제로 자동 수집 중단 상태
