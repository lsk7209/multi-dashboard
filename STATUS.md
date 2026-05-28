# Status | 마지막: 2026-05-29
## 현재 작업
GA4/GSC 대시보드 표 전체폭 배치 및 자동 갱신 워크플로우 검증 완료
## 최근 변경 (최근 5개만)
- 05-29: 사이트별 상세 표를 전체폭으로 변경하고 30일/갱신 카드를 하단으로 이동
- 05-29: GitHub Actions 일일 stats:update 자동 갱신 워크플로우 추가
- 05-29: 1일/7일/30일 사용자 지표와 사이트 검색/필터/정렬 UI 추가
- 05-29: 직전 7일 비교 기반 성장/하락/SEO/권한 인사이트 추가
- 05-29: GSC 클릭/노출/CTR/평균순위 수집 및 표기 추가
## TODO
- [ ] GSC 권한/등록 확인 필요 10개 사이트 정리
## 결정사항
- 자동 갱신: GitHub Actions가 매일 03:20 KST에 `pnpm stats:update` 실행 후 스냅샷 자동 커밋
- 30일 지표: GA4 `30daysAgo`~`yesterday` 실제 수집값 사용
- 통계 대시보드: Vercel 런타임 API 호출 대신 `data/site-stats.json` 스냅샷 표시
## 주의
- GitHub Secret `GCP_SA_KEY_JSON` 필요
- repo에 실제 secret 파일 커밋 금지
- 현재 스냅샷: 96개 사이트, GA4 실패 0개, GSC 확인 필요 10개
