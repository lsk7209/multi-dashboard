# Plan

1. 최신 main의 readiness URL 선택, hold collector, remediation queue 로직과 테스트를 조사한다.
2. 최소 타입·설정·분류 변경과 회귀 테스트를 구현한다.
3. targeted lint/test, type-check, full test, build를 실행한다.
4. 격리 브랜치와 PR로 배포하고 Vercel production을 확인한다.
5. stats, readiness, queue를 재생성해 대상별 최종 상태를 검증한다.
6. 최신 stats와 기존 P1/P2 준비 자료를 교차 확인해 추측성 console 작업을 제외하고 실제 수정 가능한 사이트를 선정한다.
7. Wedfairguide의 static source와 배포 경로를 읽기 전용 확인하고, 날짜 허브/alt/광고 고지를 scoped PR로 수정·검증·배포한다.
8. Vercel API-data freshness와 GitHub dependency alerts를 읽기 전용 분류하며 DB 쓰기와 dependency update를 별도 작업으로 격리한다.
9. 최종 증거·설정만 최신 main 기반 브랜치에 옮겨 PR, production, live dashboard를 검증한다.
