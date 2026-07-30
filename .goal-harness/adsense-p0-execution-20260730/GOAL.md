# Goal

2026-07-30 최신 직접 증거로 AdSense 미승인 후보 P0 4개를 재확인하고, 편집 보류가 없는 사이트의 최소 결함을 사이트별로 수정·검증·Git 연결 배포한다.

## Targets
- `gradienttrail.com`: fresh AdSense loader evidence missing; API-backed content site.
- `nongsusangogo.kr`: fresh AdSense loader evidence missing; scheduled DB ingestion site.
- `chatgipt.kr`: fresh AdSense loader evidence missing.
- `shotsetup.com`: public trust/readiness blocked.

## Done condition
- 작업 직전과 작업 후 `pnpm stats:update` 증거가 있다.
- 각 사이트의 실제 저장소, 스택, Git/배포 경로, dirty 상태, 차단 원인을 확인한다.
- 편집 보류가 새로 확인되면 변경하지 않고 보류 근거를 기록한다.
- 보류 없는 결함은 최소 변경으로 수정하고 사이트별 lint/test/build를 통과한다.
- Git 안전 규칙에 맞는 브랜치/PR 또는 기존 프로젝트 배포 계약으로 배포하고 라이브를 검증한다.
- `picturebooks.kr`, `plategogo.com`, `caregos.com` 및 운영 DB 데이터는 변경하지 않는다.
