# Status | 마지막: 2026-05-29
## 현재 작업
GA4 기반 사이트별 통계 대시보드 구현 완료
## 최근 변경 (최근 5개만)
- 05-29: 96개 사이트 GA4 통계 스냅샷 생성 및 대시보드 표 전환
- 05-29: preflight scope 분리(dashboard/all)로 사이트 등록 확인 가능
- 05-28: GA4 계정 236349432에서 web stream 96개 사이트 등록
- 05-28: setup:preflight 추가로 누락 사이트/secret 점검 가능
- 05-28: setup:verify 실제 GSC/GA4/ads.txt/WP 확인 로직 구현
## TODO
- [ ] 주기적 stats:update 자동화 방식 결정
- [ ] 필요 시 검색/정렬/필터 UI 추가
## 결정사항
- 통계 대시보드: Vercel 런타임 API 호출 대신 `data/site-stats.json` 스냅샷 표시
- Secret 로딩: op/1Password 제거, 환경변수와 D:\env\키파일.txt 우선
## 주의
- repo에 실제 secret 파일 커밋 금지
- 통계 갱신은 `pnpm stats:update` 실행 후 커밋/배포 필요
