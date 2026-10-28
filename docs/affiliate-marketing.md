# 서버별 사이트와 제휴마케팅

대시보드 최상위 메뉴는 서버별 사이트와 제휴마케팅 두 개입니다. `/`가 서버 작업공간이고 `/affiliate-marketing`에서 Affiliate OS 운영 현황과 관리자 진입을 제공합니다.

기본 관리자 주소는 이 대시보드의 `/admin`입니다. 기존에 기본 로컬 주소 `http://127.0.0.1:18787/admin`을 저장한 브라우저는 새 기본 주소로 전환합니다. 별도로 저장한 HTTPS 또는 로컬 `/admin` 주소는 유지합니다. 관리자 페이지는 Affiliate OS의 원본 `workspace.html`, `workspace.js`, `workspace.css`를 같은 호스트에서 제공하며, 원본 사이드바와 기능을 유지합니다. 대시보드 상단 메뉴 구성에는 영향을 주지 않습니다.

`/api/affiliate-os/{operation}`은 기존 조회 화면용 BFF입니다. 관리자 작업실은 같은 호스트의 `/api/auth/*`, `/api/admin/*`에서 상위 Affiliate OS의 실제 관리자 경로만 프록시합니다. 양쪽은 `__Secure-affiliate_dashboard_session` HttpOnly·Secure·SameSite=Strict 쿠키를 공유하고, 상위 서버에는 `__Host-affiliate_session`으로 매핑합니다. 모든 쓰기는 정확한 대시보드 Origin과 64자리 CSRF를 요구하며, 원래 Affiliate OS의 계정 역할 및 CSRF 검사를 그대로 받습니다. 로그인과 세션 조회는 예외입니다. 임의 경로, 메서드, 리디렉션, 요청 헤더 전달은 허용하지 않습니다.

로그아웃 중 상위 서버가 실패해도 프록시는 대시보드 쿠키를 지우고 `X-Affiliate-Session-Cleared: 1`을 반환합니다. 브라우저가 그 응답을 받으면 화면의 세션도 버리고 서버 세션 종료가 미확인임을 알립니다. 브라우저와 대시보드 사이에서 응답이 끊겨 쿠키 삭제를 확인할 수 없으면 화면의 로그인 상태를 유지하고 재시도를 안내합니다.

서버 전용 환경 변수는 `AFFILIATE_API_ORIGIN`(경로 없는 HTTPS 주소), `AFFILIATE_DASHBOARD_ORIGIN`(정확한 대시보드 HTTPS 출처), `AFFILIATE_GATEWAY_AUTH`(게이트의 Basic 인증값)입니다. 사설 인증서인 경우 `AFFILIATE_API_CA_CERT`에 PEM 인증서를 넣습니다. Node HTTPS 전송은 인증서 체인과 호스트명을 검사하며 검증을 끄지 않습니다. 이 값들을 브라우저·소스·로그에 넣지 않습니다. 설정이 없거나 형식이 잘못되면 503으로 닫힙니다.

일반 JSON 요청·응답은 1 MB, CSV 응답은 4 MB, 관리자 백업 다운로드는 64 MiB로 제한합니다. 백업과 CSV는 스트리밍하며 일반 요청은 8초, 백업은 30초 총 전송 기한이 있습니다. Vercel 요청 크기와 게이트 설정을 고려해 브라우저 원본 폴더 업로드는 4 MB로 제한합니다. 더 큰 폴더는 Affiliate OS의 로컬 관리자에서 처리해야 합니다. 실제 대용량 업로드·다운로드 성공은 배포 후 확인해야 합니다.

수집·상품 검토·사이트별 게재 승인·실제 사이트 설치는 별개입니다. 화면의 데이터는 인증된 최신 응답이며, API 오류나 미연결은 0건으로 표시하지 않습니다. 실제 서버·모델·수익 API·배포 검증은 별도의 라이브 증거가 필요합니다.

검증 명령: `pnpm exec vitest run app/lib/affiliate-upstream.test.ts app/lib/affiliate-admin-proxy.test.ts app/lib/affiliate-os-api.test.ts app/lib/affiliate-admin-url.test.ts`, `pnpm type-check`, 변경 파일 ESLint, 이후 전체 빌드와 브라우저 운영 스모크.
