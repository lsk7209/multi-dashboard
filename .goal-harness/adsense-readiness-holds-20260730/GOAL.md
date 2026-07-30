# Goal

2026-07-30 최신 production main을 기준으로 reader-scoped AdSense 사이트의 readiness 오탐과 출시 보류 사이트의 일반 remediation 오탐을 제거한다.

## Done conditions
- Readiness audit는 `adsenseSampleUrls`가 있으면 해당 reader page에서 loader를 판정한다.
- `nongsusangogo.kr`은 명시적 `launch_hold`로 관측되며 일반 AdSense proof queue에 들어가지 않는다.
- 기존 `editorial_hold`도 일반 proof defect로 취급되지 않는다.
- GradientTrail, Chatgipt, Shotsetup의 정상 상태와 Picturebooks 영구 제외를 보존한다.
- 관련 테스트, 타입 검사, 전체 테스트, 빌드, PR, Vercel production, 사후 수집을 검증한다.
- 사이트 저장소, WordPress, 운영 DB, Plategogo/Caregos 콘텐츠는 변경하지 않는다.
