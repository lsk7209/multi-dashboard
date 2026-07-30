# Plan

1. 최신 dashboard snapshot과 Vercel/API-data freshness를 읽기 전용으로 갱신한다.
2. P0 4개 상태와 보류 여부를 최신 증거로 재확인한다.
3. 4개 사이트의 로컬 경로, Git 원격/브랜치/dirty 상태, 패키지 스크립트, 배포 연결을 조사한다.
4. API-data 사이트는 신규 데이터 여부를 먼저 확인하고 콘텐츠 생성과 기술 수정 경계를 분리한다.
5. 보류 없는 사이트를 한 번에 하나씩 최소 수정하고 관련 테스트·lint·build를 실행한다.
6. 사이트별 변경만 선별 커밋하고 Git 안전 규칙에 맞게 배포한다.
7. 라이브 loader/trust routes와 최종 dashboard snapshot을 검증한다.
8. STATUS, EVIDENCE, ACCEPTANCE를 갱신한다.
