# Status | 마지막: 2026-05-28
## 현재 작업
prep-automation v1.1 TypeScript 자동화 개발 완료, 실제 운영 입력 대기
## 최근 변경 (최근 5개만)
- 05-28: GA4 계정 236349432에서 web stream 96개 사이트 등록
- 05-28: setup:preflight 추가로 누락 사이트/secret 점검 가능
- 05-28: preflight 실행 결과 운영 secret/site 미입력 확인
- 05-28: setup:verify 실제 GSC/GA4/ads.txt/WP 확인 로직 구현
- 05-28: env/site 예시 파일 추가
- 05-28: setup 스크립트에서 op run 제거
- 05-28: 로컬 환경변수/D:\env\키파일.txt secret 로더 추가
- 05-28: prep-automation v1.1 setup 스크립트/공통 라이브러리 추가
- 05-28: lint/type-check/setup:verify:dry 검증 통과
## TODO
- [ ] D:\env\키파일.txt 또는 .env.setup.local에 운영 secret 입력 후 setup:all 검증
- [ ] scripts/setup/sites.yaml에 운영 사이트 입력
## 결정사항
- Secret 로딩: op/1Password 제거, 환경변수와 D:\env\키파일.txt 우선
- 신규 스캐폴딩: 현재 루트에 docs 외 코드가 없어서 새 프로젝트로 구성
## 주의
- repo에 실제 secret 파일 커밋 금지
