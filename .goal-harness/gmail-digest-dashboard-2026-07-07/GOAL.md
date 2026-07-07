# Gmail Digest Dashboard Goal

## Final Deliverable
Gmail digest에서 들어온 GSC, AdSense, GA4, Vercel, GitHub Actions 운영 메일을 대시보드에서 리포트로 보고 처리 상태와 메모를 저장할 수 있게 한다.

## User Value
운영자는 대시보드 안에서 사이트 관련 메일 신호를 확인하고, 수정/검토/제외 상태를 남겨 후속 작업 누락을 줄일 수 있다.

## Required Features
- `ops:triage`가 AdSense와 GA4 메일 태그를 구조화한다.
- 대시보드 데이터가 `data/ops-triage.json`과 처리 상태 파일을 함께 로드한다.
- 대시보드에 메일 탭이 있고 종류, 심각도, 처리 상태, 검색 필터를 제공한다.
- 메일별 처리 상태와 메모를 API로 저장한다.
- `dashboard:refresh`가 통계와 Gmail ops triage를 함께 갱신한다.

## Non-Goals
- Gmail 계정 OAuth 수집기를 새로 만들지 않는다.
- AdSense, GA4, GSC 콘솔에 직접 변경을 수행하지 않는다.
- Vercel 서버리스 기본 파일시스템에 영구 쓰기를 보장하지 않는다.

## Done Conditions
- TypeScript, lint, build가 통과한다.
- `pnpm ops:triage`가 현재 리포트를 재생성한다.
- 대시보드 메일 탭이 렌더링된다.
- 변경 사항이 Git에 커밋되고 원격에 푸시된다.

## User-Visible Result
대시보드 상단 탭에 `메일`이 보이고, 각 메일 신호의 상태와 처리 메모를 저장할 수 있다.
