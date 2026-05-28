# Status | 마지막: 2026-05-29
## 현재 작업
GA4/GSC 스냅샷 수동 갱신 완료, GitHub Actions는 결제 제한으로 대기
## 최근 변경 (최근 5개만)
- 05-29: GSC 권한 오류 사이트를 하단 패널로 별도 표시
- 05-29: `pnpm stats:update`로 실제 통계 스냅샷 수동 갱신
- 05-29: 사이트별 상세 표를 전체폭으로 변경하고 30일/갱신 카드를 하단으로 이동
- 05-29: GitHub Actions 일일 stats:update 자동 갱신 워크플로우 추가
- 05-29: 1일/7일/30일 사용자 지표와 사이트 검색/필터/정렬 UI 추가
## TODO
- [ ] GitHub Actions 결제/스펜딩 제한 해제 후 워크플로우 재실행
## 결정사항
- GSC 권한 대상: `gscError`가 있는 사이트를 실제 조치 대상 목록으로 분리 표시
- 자동 갱신: GitHub Actions가 매일 03:20 KST에 `pnpm stats:update` 실행 후 변경분 자동 커밋
- 통계 대시보드: Vercel 환경에서 API 호출 대신 `data/site-stats.json`을 정적 표시
## 주의
- repo에 실제 secret 파일 커밋 금지
- GitHub Secret `GCP_SA_KEY_JSON` 등록 완료
- 현재 오류는 GA4 실패 0개, GSC 권한 확인 필요 10개
