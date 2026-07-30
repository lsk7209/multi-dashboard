# Plan

1. 최신 main의 readiness URL 선택, hold collector, remediation queue 로직과 테스트를 조사한다.
2. 최소 타입·설정·분류 변경과 회귀 테스트를 구현한다.
3. targeted lint/test, type-check, full test, build를 실행한다.
4. 격리 브랜치와 PR로 배포하고 Vercel production을 확인한다.
5. stats, readiness, queue를 재생성해 대상별 최종 상태를 검증한다.
6. 증거와 제한 사항을 기록한다.
