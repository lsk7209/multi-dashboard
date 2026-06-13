# 개선계획 (2026-06-13)

> 2026-06-13 프로젝트 전체 검토 결과를 바탕으로 한 실행 계획.
> 원칙: **운영 신뢰성 > 안전망 > 보안 위생 > 성능/구조**. 한 단계가 끝나야 다음 단계의 효과가 검증된다.
> 각 항목에 완료 기준(AC)을 명시한다. 완료 시 STATUS.md에 반영하고 이 문서의 체크박스를 갱신한다.

---

## 적용 완료 (2026-06-13 세션)

이번 세션에서 반영한 항목 (type-check / lint / test / build 모두 통과):

- **P0′ 봇 차단**: `public/robots.txt` + layout `robots: index:false`. (인증은 소유자 결정에 따라 미적용 — 공개 유지)
- **P0-1 수집 실패 알림**: `update-stats.yml`에 `if: failure()` 시 `collection-failure` 라벨 이슈 생성/코멘트.
- **P0-3 / P3-3 스파크라인**: 수집 누락일을 0이 아닌 `null`(선 끊김)로 표시 + history 파일을 사이트 수와 무관하게 7회만 파싱.
- **P1 테스트 안전망**: vitest 도입, 판정 규칙 21개 테스트 작성, Validate 게이트(`pnpm test`)·README 편입.
- **P1′ 세그먼트 버그**: `DashboardSegment.memberIds`(전체) 추가, 테이블이 절단 배열 대신 이걸로 필터. 회귀 테스트 포함.
- **P1″ 스냅샷 파싱 가드**: `readStats`가 손상 시 명확한 메시지로 throw.
- **P2-3 워크플로 최소권한**: `weekly-report.yml`에 `permissions: contents:read` + timeout, `update-stats.yml`에 `issues:write`.
- **P2′ AdSense ID**: `update-ga4-stats.ts`가 `process.env.ADSENSE_PUBLISHER_ID` 우선.
- **P3-1 history 보존**: `update-stats.yml`이 90일 초과 history 삭제.

남은 항목: P0-2(diag 누락일 감지·대시보드 성공률), P0-4(06-08/06-11 실패 원인), P1-2 잔여 테스트(dedupe·sitemap 분기·health 경계), P2-1(sites.yaml 인프라 분리), P2-2(secrets.ts 하드코딩 경로), P4(파일 분할).

---

## 현재 상태 요약 (검토 근거)

- `pnpm type-check` / `lint` / `build` 모두 통과. 작업 트리 깨끗함.
- `data/history/`에 **06-08, 06-11 수집 누락** — cron 실패가 조용히 지나감. 알림 없음.
- `loadSparklines`가 누락일을 0으로 채워 스파크라인에 **가짜 급락** 표시.
- 판정 로직(`app/lib/dashboard-data.ts` 2,328줄)에 **테스트 0개** — 안전망이 타입체크뿐.
- `sites.yaml`에 SSH 호스트/포트/계정명, 로컬 키 경로, GA4 속성 ID 커밋됨.
- `data/history/` 매일 ~200KB씩 무한 증식 (현재 2.3MB).
- 스파크라인 빌드가 사이트×7일 = 약 800회 중복 JSON 파싱.

---

## P0 — 수집 신뢰성: 실패가 조용히 지나가지 않게 한다

가장 실질적인 리스크. 06-08, 06-11처럼 수집이 빠져도 아무도 모른다.

### P0-1. 수집 실패 시 자동 알림
- [ ] `update-stats.yml`에 실패 시 GitHub Issue 자동 생성 step 추가
  (`if: failure()` + `gh issue create` 또는 기존 이슈에 코멘트, 라벨 `collection-failure`).
- [ ] 실패 step 이름과 run URL을 이슈 본문에 포함해 `gh run view --log-failed` 없이도 1차 분류 가능하게.
- **AC**: 워크플로우를 의도적으로 실패시켰을 때(예: workflow_dispatch + 임시 브랜치) 이슈가 자동 생성된다.

### P0-2. 누락일 사후 감지
- [ ] `npm run diag`(`diagnose-ops.ts`)에 history 누락일 검사 추가:
  최근 N일(기본 14) 중 `data/history/YYYY-MM-DD.json` 없는 날짜를 출력.
- [ ] 대시보드 "수집 신뢰도" 패널에 최근 14일 수집 성공률(예: 12/14) 표시.
- **AC**: 현재 데이터 기준으로 diag가 06-08, 06-11을 누락일로 보고한다.

### P0-3. 스파크라인 결측 처리
- [ ] `loadSparklines`(`dashboard-data.ts:1991`)에서 파일 없는 날을 `0` 대신 결측으로 구분
  (`(number | null)[]` 또는 별도 마스크), UI에서 결측일은 점선/공백으로 렌더링.
- **AC**: 06-08, 06-11이 급락이 아닌 결측으로 표시된다.

### P0-4. 06-08 / 06-11 실패 원인 확인 (일회성)
- [ ] `gh run list --workflow=update-stats.yml`로 해당 날짜 run 확인 → 실패면 `--log-failed`로 원인 기록.
  (OPERATIONS.md §4: 결제부터 의심하지 말 것 — Validate step이 흔한 원인.)
- [ ] 원인과 교훈을 OPERATIONS.md에 추가.
- **AC**: 실패 원인이 OPERATIONS.md에 한 줄 이상 기록된다.

**예상 규모**: 워크플로우 1파일 + diag 1파일 + dashboard-data/table 일부. 1세션 내 완료 가능.

---

## P1 — 회귀 테스트 안전망: 판정 규칙을 잠근다

OPERATIONS.md에 기록된 과거 오탐 사례들이 그대로 테스트 케이스다. 판정 로직이 자주 바뀌는데(06-05 stale 규칙 변경 등) 회귀를 잡을 장치가 없다.

### P1-1. 테스트 러너 도입
- [ ] `vitest` 추가 (Next 16 / ESM / TS strict와 마찰 최소, tsx 의존 없음).
- [ ] `package.json`에 `"test": "vitest run"` 추가.

### P1-2. 판정 함수 단위 테스트 (우선순위순)
- [ ] **급락 게이트**: `isSignificantUserDrop` / `isSignificantClickDrop`
  — 주 3명 → -73%는 급락 아님(OPERATIONS §3-5 실사례), 사용자 50+/클릭 10+ & -30%는 급락.
- [ ] **운영 상태 판정**: `getOperationalStatus`
  — sitemap 지연은 stale 아님(06-05 변경, 정상 38개 오탐 사례), fetch 48h+는 stale,
  auth_error/missing_config → needsPermission, isPending → processing.
- [ ] **sitemap 분기**: `hasSitemapProcessing` / `hasCleanPendingSitemap` / `hasSitemapCollectionLag`
  — 제출>다운로드 시각이면 processing, 오류/경고 있으면 issue.
- [ ] **dedupe**: `dedupeStatsByHost` — www/non-www 동일 호스트 병합, 대표 선정 순서(정상>트래픽>점수).
- [ ] **건강점수**: `getHealthScore` 경계값 (80/55 등급 경계).
- 비공개 함수는 `export`로 풀거나 테스트 전용 export 모듈로 노출 — 파일 분할(P4)과 묶어 처리해도 됨.

### P1-3. Validate 게이트에 편입
- [ ] `update-stats.yml`의 Validate step에 `pnpm test` 추가.
- [ ] README Quick Check에 `pnpm test` 추가.
- **AC**: OPERATIONS.md §3-5의 오탐 사례가 테스트로 재현되고, 게이트에서 실행된다.

**예상 규모**: devDependency 1개 + 테스트 파일 2~3개. 1세션.
**주의**: P1 진행 중 판정 로직 동작은 바꾸지 않는다(테스트는 현재 동작을 잠그는 용도).

---

## P2 — 보안 위생: 공개되면 곤란한 것을 줄인다

비밀키 유출은 없으나(검토 확인), 저장소 공개 전환·협업자 추가 시 위험이 되는 항목.

### P2-1. sites.yaml 인프라 정보 분리
- [ ] `sshHost` / `sshPort` / `sshUser` / `sshKeyPath`(`D:\env\...`)를 sites.yaml에서 제거하고
  `.env.setup.local`(gitignore됨) 또는 별도 `sites.infra.yaml`(gitignore 추가)로 이동.
- [ ] 참조하는 스크립트(`patch-adsense-pages.ts` 등)의 로드 경로 수정.
- [ ] git 이력에는 이미 남아 있으므로: 저장소를 private으로 유지하는 것을 전제로 하고,
  공개 전환 시 이력 정리(filter-repo)가 필요함을 ASSET-MAP.md에 명시.
- **AC**: `git grep -i "sshHost\|sshUser\|D:\\\\env"` 가 추적 파일에서 0건 (docs 예시 제외).

### P2-2. 하드코딩 경로 제거
- [ ] `lib/secrets.ts:4-5`의 `D:\env\키파일.txt`, GCP SA 파일 경로를 환경변수
  (`SETUP_KEY_FILE`, `GCP_SA_KEY_FILE`)로 대체, 기본값은 미설정 시 스킵.
- **AC**: 환경변수 없이 실행해도 명확한 안내 메시지와 함께 동작(로컬 키파일 의존 제거).

### P2-3. 워크플로우 최소권한
- [ ] `weekly-report.yml`에 `permissions: contents: read`와 `timeout-minutes` 추가.
- [ ] `update-stats.yml`에 이슈 생성을 넣으면(P0-1) `issues: write` 추가.
- **AC**: 두 워크플로우 모두 permissions 명시.

**예상 규모**: 작음. P0/P1과 독립적이라 병렬 가능.

---

## P3 — 데이터 수명주기: 저장소 비대화 방지

### P3-1. history 보존 정책
- [ ] 보존 기간 결정 — 제안: **90일** (스파크라인 7일 + 30일 비교 + 분기 회고 여유).
- [ ] `update-stats.yml` 커밋 step 직전에 보존 기간 지난 `data/history/*.json` 삭제 추가
  (또는 `stats:update` 스크립트 내부에서 처리).
- **AC**: 워크플로우 1회 실행 후 90일 초과 파일이 남지 않는다.

### P3-2. 루트 산출물 정리
- [ ] `data/adsense-readiness-audit-2026-06-08.json` / `-09.json`(각 364KB) 삭제
  — `docs/adsense-readiness-audit-*.md` 요약이 이미 있음. 향후 audit 산출물은 gitignore 대상 경로(`reports/`)로.
- **AC**: data/에 스냅샷·history·example 외 대용량 산출물 없음.

### P3-3. 스파크라인 파싱 1회화 (P0-3과 같은 파일이므로 함께 처리)
- [ ] `loadSparklines`를 "7개 파일을 각 1회 파싱 → 날짜별 `Map<siteId, value>` → 사이트별 조회" 구조로 변경.
- **AC**: history 파일 파싱 횟수가 사이트 수와 무관하게 7회.

**예상 규모**: 작음.

---

## P4 — 구조 (선택, 여유 있을 때)

### P4-1. dashboard-data.ts 분할
2,328줄 단일 파일. 기능엔 문제없으나 P1 테스트를 붙이면서 자연스럽게 나누면 좋다.
- [ ] 제안 분할: `types.ts`(인터페이스/상수) · `status.ts`(운영 상태/수집 소스 판정) ·
  `insights.ts`(인사이트/액션 생성) · `aggregate.ts`(합산/dedupe/세그먼트) · `io.ts`(파일 읽기/sparkline).
- [ ] OPERATIONS.md §2의 file:line 참조 갱신 (갱신 규칙 §5 준수).
- **AC**: 동작 변경 없음(스냅샷 빌드 결과 동일), type-check/lint/test 통과.

### P4-2. site-stats-table.tsx (1,253줄)
- 당장 분할 불필요. 필터/정렬 로직에 P1 테스트가 생기면 그때 검토.

---

## 진행 순서 제안

| 순서 | 항목 | 의존성 | 한 줄 효과 |
|---|---|---|---|
| 1 | P0-4 누락 원인 확인 | 없음 | 같은 실패 재발 방지 단서 |
| 2 | P0-1~3 실패 알림·누락 감지·결측 표시 | 없음 | 수집 구멍이 즉시 보임 |
| 3 | P1 테스트 안전망 | 없음 | 판정 규칙 회귀 차단 |
| 4 | P2 보안 위생 | 없음 (병렬 가능) | 공개 리스크 축소 |
| 5 | P3 데이터 수명주기 | P0-3과 일부 겹침 | 저장소 비대화 방지 |
| 6 | P4 구조 분할 | P1 이후 권장 | 유지보수성 |

기존 STATUS.md TODO(T2 Google 색인진출, T3 순위, T4 CTR, temon 파일럿)는 **사이트 운영 트랙**으로 이 계획과 병행한다.
이 문서는 **도구(대시보드/수집기) 자체의 신뢰성 트랙**이다. 도구가 거짓말하지 않아야 운영 트랙 판단이 선다.

---

## 2차 검토 추가 발견 (2026-06-13 오후)

테이블 컴포넌트·수집 스크립트·앱 설정을 더 파서 나온 항목. 일부는 우선순위가 위 단계보다 높다.

### P0′ — 공개 노출 차단 (신규, 우선순위 P0급)

`app/layout.tsx:7`의 배포 URL은 `https://multi-dashboard.vercel.app`이고, **인증/미들웨어가 전혀 없다**
(`app/middleware.ts` 부재 확인). URL을 아는 누구나 116개 사이트의 트래픽·GSC 지표·운영 상태와
인사이트 카드의 `operatorPrompt`(siteId·url·gscSiteUrl 포함)를 전부 본다. `public/`에 robots.txt도
없어 검색엔진 색인 가능성도 있다.
- [ ] 접근 제어: Vercel Password Protection(가장 간단) 또는 Edge Middleware Basic Auth
  (`DASHBOARD_USER`/`DASHBOARD_PASS` 환경변수).
- [ ] `public/robots.txt`에 `Disallow: /` 추가 + `layout.tsx` metadata에 `robots: { index: false }`.
- **AC**: 인증 없이 배포 URL 접근 시 401, 검색 색인 차단.
- **근거**: STATUS.md "repo에 실제 secret 커밋 금지" 원칙과 동일선상 — 노출면을 데이터까지 확장한 것.

### P1′ — 세그먼트 필터가 8개로 잘리는 버그 (신규, 기능 버그)

`buildSegments`(`dashboard-data.ts:1396-1400`)는 표시용으로 `stats: segment.stats.slice(0, 8)`,
`count`는 절단 전 전체 길이를 쓴다. 테이블(`site-stats-table.tsx:149-156`)이 이 **8개로 잘린 배열**로
`segmentIds`를 만들어 필터링한다. 결과적으로 탭은 "성장 20"으로 표시되지만 클릭하면 **최대 8행만** 나온다.
- [ ] 세그먼트의 전체 멤버 id 집합과 표시용 절단 배열을 분리(예: `segment.allIds` 추가 또는
  테이블에서 세그먼트 조건 함수를 직접 재평가).
- **AC**: "성장 20" 탭 클릭 시 20개 모두 표시되고, 탭 카운트와 필터 결과 수가 일치한다.
- P1 테스트 작성 시 이 케이스를 회귀 테스트로 포함.

### P1″ — 메인 스냅샷 파싱 예외 미처리 (신규, 견고성)

`readStats`(`dashboard-data.ts:2031`)는 `JSON.parse`를 try/catch 없이 호출한다. `loadSparklines`의
history 파싱(`:2002`)은 try/catch로 감싸 0으로 폴백하는데, **메인 스냅샷은 손상되면 정적 빌드 전체가
크래시**해 배포가 막힌다(원인 추적도 어려움).
- [ ] `readStats`에 try/catch 추가 — 파싱 실패 시 명확한 에러 메시지로 throw하거나 빈 스냅샷 폴백.
- **AC**: 손상된 site-stats.json으로 빌드 시 무엇이 깨졌는지 메시지로 식별 가능.

### P2′ — AdSense publisher ID 하드코딩 (신규, 낮음)

`update-ga4-stats.ts:20`에 `ADSENSE_PUBLISHER_ID = "pub-3050601904412736"`가 소스에 하드코딩.
민감도는 낮으나(공개 가능 식별자) 계정 변경 시 코드 수정 필요.
- [ ] 환경변수 `ADSENSE_PUBLISHER_ID`로 이동, 기본값 유지 가능.

---

## 비고 (이번에 하지 않기로 한 것)

- WP 비밀번호 env/stdout 전달 개선: 로컬 1회성 셋업 용도라 위험 낮음. CI에서 돌릴 계획이 생기면 그때.
- `secure-rm` Windows 다중 덮어쓰기: 현대 저장장치에서 실익 불분명. 보류.
- 테스트 프레임워크 도입 외 E2E/스냅샷 테스트: 정적 빌드 + 수동 확인으로 충분. 과투자 방지.
