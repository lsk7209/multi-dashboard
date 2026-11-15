# 핵심 사이트 및 도메인 상태 — 2026-11-15

사용자 지정: 현재 대시보드 5개 서버 그룹의 정확한 106개 호스트를 핵심 운영으로 고정한다. 그 외 기존 24개는 운영 보류로 표시한다. 접속 장애와 운영 의도는 별개이며 새로운 도메인은 자동 승격하지 않는다.

| 서버 | 핵심 사이트 |
|---|---:|
| OVHcloud | 14 |
| Contabo | 17 |
| Turbo1 | 29 |
| Turbo2 | 25 |
| Vercel | 21 |

## 등록기관 확인 범위

- HostingKR: 로그인된 계정의 보유 74개 전체 CSV, 74개 자동연장 상태를 화면에서 확인. 삭제 이력은 총41개 중39개 행 확보(부분 범위).
- Dynadot: 기존 승인된 API 키를 프로세스 내에서만 사용. 공식 list_domain API 성공, 전체20개(한 페이지100개 요청에20개 반환). 보유94개 총합. 등록자 미확인18개, hold/disabled20개 모두 no. 정지와 등록자 확인 상태를 혼동하지 않는다.
- 연락처·계정 이메일·키·인증정보는 취합본과 공개 데이터에서 제외.
- 다른 등록기관의 계정 미조회는 미등록을 뜻하지 않는다. nekau.com, kayest.com 등의 등록 상태는 현 계정 범위에서 미확인. vercel.app 공유 플랫폼 호스트는 소유 도메인 만료와 별개.

## 30일 이내 만료되는 핵심 도메인

| 도메인 | 만료일 | 남은 일수(조회 시점) | 자동연장 |
|---|---|---:|---|
| crepika.com | 2026-11-21T11:31 | 6 | OFF |
| texturb.com | 2026-11-21T11:35 | 6 | OFF |
| spinkorea.kr | 2026-11-22T12:00 | 7 | OFF |
| esgyo.kr | 2026-11-27T12:00 | 12 | OFF |
| nicewomen.kr | 2026-11-27T12:00 | 12 | OFF |
| sellerpit.kr | 2026-11-27T12:00 | 12 | OFF |
| today2424.kr | 2026-11-28T12:00 | 13 | OFF |
| knewstory.kr | 2026-12-02T12:00 | 17 | OFF |
| roadways.kr | 2026-12-04T12:00 | 19 | OFF |
| klick.kr | 2026-12-06T12:00 | 21 | OFF |
| goesku.com | 2026-12-07T05:10 | 22 | OFF |
| askore.kr | 2026-12-07T12:00 | 22 | OFF |
| richyou.kr | 2026-12-07T12:00 | 22 | OFF |
| todayshops.kr | 2026-12-07T12:00 | 22 | OFF |
| ezfunnel.kr | 2026-12-08T12:00 | 23 | OFF |
| gong365.kr | 2026-12-08T12:00 | 23 | OFF |
| todaypharm.kr | 2026-12-10T12:00 | 25 | OFF |
| bojo24.kr | 2026-12-11T12:00 | 26 | OFF |

## 핵심 운영 접속 예외

| 호스트 | 현재 관측 |
|---|---|
| gpt.nexttech7.com | SSLError |
| insupang.com | 410 |
| knewstory.kr | 410 |
| workgogo.kr | 404 |

해당4개도 사용자가 지정한 핵심 목록에 유지한다. 운영 보류24개는 접속 오류만으로 새로 결정한 것이 아니라 사용자 지시로 고정한 대상이다.

## 운영 보류 목록

ai.tasko.kr, blogsample2.nexttech7.com, car.klick.kr, car.luckyday.kr, chatgipt.kr, comu.chatgipt.kr, dog.klick.kr, educaer.com, email.chatgipt.kr, finance.2mlab.kr, food.2mlab.kr, gong.luckyday.kr, homeimer.com, hos.dogspang.kr, ko.klick.kr, lim01.soonsaak.co.kr, lo.klick.kr, luxurytraver.com, mbti.tasko.kr, mohana.kr, notebook.klick.kr, phone.luckyday.kr, travel.dogspang.kr, webtoon.klick.kr

## 원본과 검증

- 기준 production main: 45d9ac589496b5d428972b2db53758af9f3f283f. 기존 dirty checkout은 보존하고 격리 clone에서 작업.
- data/site-operations-policy.json: 정확한 핵심/보류 목록 및 결정 출처.
- data/domain-status-current.json: 등록기관별 coverage, 도메인 상태, 전체130개 DNS/HTTPS 읽기 점검, 원본별 checkedAt.
- runtime/core-portfolio-20261115/: API20개, sanitized HostingKR74개, 자동연장74개, 삭제행39개, 실제 대시보드130개 화면 목록.
- 자동연장·갱신·결제·기관이전·DNS·서버 파일·DB·광고 설정 변경 없음.
- Registrar data is a timestamped snapshot; automatic daily registrar collection is not configured by this change.

## 검증 결과

- 전체 단위 테스트: 54파일 451개 통과, 종료0.
- 타입 검사·ESLint·프로덕션 빌드: 종료0. page 파일 추적에 새 JSON2개 포함 확인.
- 실제 HTTP 브라우저 검사3개 통과: 서버/검색/상세, 기간선택, 핵심106/보류24·core410·도메인만료·PC/모바일390px. 기본 Playwright shell 미설치로 설치된 Chrome의 별도 임시 프로필을 사용했으며 사용자 프로필은 사용하지 않았다.
- 기존 dirty checkout의 코드·통계·AGENTS 수정은 포함하지 않았다.


## Domain review tab and expiry sorting
- /domains lists registrar-owned roots with no core-site association: 3 unlinked (kabi.kr, nowtip.kr, weddingfairfinder.com), 4 paused-only (chatgipt.kr, educaer.com, homeimer.com, luxurytraver.com). Not proof of unused email/external services. Core roots stay excluded despite HTTP errors; deletions excluded.
- Inventory snapshot now 95 owned: HostingKR74 + Dynadot20 + Name.com1 operator-reported partial coverage. nekau.com date2027-06-20 is operator-provided Renews date, displayed with that qualification, not a new API verification. Auto-renew remains unknown. Explicit nekau.com/dog.nekau.com association added.
- Expiry sorting both directions on main site table and /domains; unknown/invalid dates remain last. Registration snapshot did not automatically refresh.
- Fresh validation:456 unit tests, typecheck/lint/build PASS;5 real HTTP E2E PASS including navigation,7 candidates, both sort directions, unknownlast, Name.com attribution, desktop/mobile390 screenshots.
- No renewals, payments, DNS or account changes. Original dirty checkout preserved.
