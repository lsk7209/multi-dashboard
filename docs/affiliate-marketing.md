# 서버별 사이트와 제휴마케팅

메뉴는 서버별 사이트와 제휴마케팅 두 개입니다. `/`가 서버별 사이트 작업공간이며 `/servers`는 `/`로 이동합니다. 이전 `/affiliate`, `/banner-management` 페이지는 `/affiliate-marketing`으로 이동합니다. 기존 관리 데이터·배너 런타임 API·통계 수집은 보존했습니다.

제휴마케팅에는 관리자 바로가기와 인증 후 운영 조회가 있습니다. 기본 관리자 주소 `http://127.0.0.1:18787/admin`은 Affiliate OS 프로젝트의 `open-ovh.cmd`로 이 PC의 SSH 터널을 열어야 사용할 수 있습니다. 주소 설정은 이 브라우저의 localStorage에만 저장하며 HTTPS `/admin` 또는 로컬 HTTP `/admin`만 허용합니다. 로그인 정보·쿼리·해시는 거절합니다. 바로가기 주소 저장과 API 활성화는 별개입니다.

운영 조회는 같은 출처의 `/api/affiliate-os/{operation}`을 사용합니다. 허용된 동작은 로그인·세션 확인·로그아웃, 원장 요약·검색·게재 승인·최근 30일 클릭/정산·등록 사이트 조회뿐입니다. 상품 변경·게재 승인·백업 다운로드를 프록시하지 않습니다. 계정 비밀번호는 로그인 요청에만 사용하고 저장하지 않습니다. HttpOnly/Secure/SameSite 세션 쿠키와 메모리의 CSRF 토큰을 사용합니다. 로그아웃 중 상위 서버 오류가 나도 대시보드 쿠키와 화면 데이터를 지웁니다. 브라우저에서 대시보드까지 통신이 끊겼다면 서버 쿠키/세션의 종료는 확인할 수 없으므로 경고를 표시합니다.

서버 전용 환경 변수 세 개가 필요합니다. `AFFILIATE_API_ORIGIN`은 경로 없는 고정 HTTPS 출처, `AFFILIATE_DASHBOARD_ORIGIN`은 정확한 대시보드 HTTPS 출처, `AFFILIATE_GATEWAY_AUTH`는 추가 게이트의 Basic 인증 헤더입니다. 값을 브라우저·소스·로그에 넣지 않습니다. 미설정 시 API는 503으로 닫히고 화면은 미연결을 표시합니다. 임의 상위 주소·리디렉션·헤더·메서드·쿼리는 허용하지 않습니다. 실제 응답 크기와 시간을 제한하고 캐시를 금지합니다.

수집·상품 검토·사이트별 게재 승인·실제 설치는 구분합니다. 데이터 오류나 미연결을 0건으로 표시하지 않습니다. 정산은 원장의 `amount_decimal` 문자열을 통화·승인 상태·귀속별로 표시하며 통화 간 합산이나 입금액을 추정하지 않습니다. iframe 차단과 Affiliate OS의 기존 세션·CSRF·레거시 Bearer 비활성을 유지합니다.

현재 공개 관리자 도메인은 미지정이며 HTTPS 실연결/사이트 설치는 미완료입니다. 실제 서버의 비공개 조회 결과는 원장 8,440건, 등록 사이트·게재 승인·활성 링크 0건입니다. 이 값은 자동 갱신되는 공개 통계가 아니며, 인증된 최신 API 응답만 화면에 표시합니다.

검증: `pnpm test`, `pnpm lint`, `pnpm type-check`, `pnpm build`, `pnpm test:e2e`. API 모의 응답과 UI fixture는 실제 서버 연결이나 수익 증거를 대신하지 않습니다.

기술 근거: [Next BFF](https://nextjs.org/docs/app/guides/backend-for-frontend), [인증](https://nextjs.org/docs/app/guides/authentication), [환경 변수](https://nextjs.org/docs/app/guides/environment-variables), [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html). 공급자 문서의 일반 안내와 이 앱의 검증 결과는 별도입니다.
