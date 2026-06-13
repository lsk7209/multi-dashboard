# 운영 가이드 (OPERATIONS) — Single Source of Truth

> 이 문서는 대시보드 운영 지식의 단일 출처다.
> **세션 시작 시 이 문서를 먼저 읽는다.** 코드(`app/lib/dashboard-data.ts`)를 재분석하지 말 것.
> 새 운영 패턴/규칙을 발견하면 **코드보다 이 문서를 먼저 갱신**한다.
> 최종 갱신: 2026-06-05

---

## 1. 빠른 진단 — `npm run diag`

운영 문제(권한 필요 / 오래된 데이터 / API 실패)가 보이면 **가장 먼저** 실행:

```
npm run diag
```

`scripts/setup/diagnose-ops.ts`가 `data/site-stats.json`의 문제 사이트를 **실시간 GSC API**로 재점검해
다음을 구분 출력한다:
- **진짜 권한 없음** (속성 미등록/검증 풀림) vs **배포 데이터만 오래됨**(캐시 잔상)
- GSC 형식 불일치(www / non-www / sc-domain) → 교정 형식 추천
- sitemap 수집 지연(48h+)

캐시(site-stats)가 아니라 실제 API를 보므로, 대시보드 표시와 실제 상태가 다를 때 진실을 가린다.

---

## 2. 운영 상태 판정 규칙 (대시보드 UI)

판정 함수: `app/lib/dashboard-data.ts` `getOperationalStatus()` (≈L1672).
순서대로 평가하며 먼저 걸리는 상태로 확정된다.

| 상태(라벨) | 트리거 조건 | 근거 | 의미 / 대응 |
|---|---|---|---|
| **오래된 데이터** (`stale`) | `ga4LastSuccessfulFetchAt` 또는 `gscLastSuccessfulFetchAt`가 48h+ | L1674-1678 | 수집 지연. `npm run stats:update` 재실행 |
| **권한 필요** (`needsPermission`) | `ga4Status` 또는 `gscStatus`가 `auth_error`/`missing_config` | L1680-1692 | GSC/GA4 속성·서비스계정 권한. **단 `npm run diag`로 진짜 권한 vs 캐시잔상 먼저 구분** |
| **API 실패** (`apiError`) | status가 ok도 auth도 아닌 기타 오류 | L1680-1692 | API 일시 오류. 재수집으로 확인 |
| **재처리중** (`processing`) | sitemap 제출 후 미처리(`isPending`) | L1694-1696 | 정상 진행. 대기 |
| **정상** (`normal`) | 위 어디에도 안 걸림 | — | — |

- 48h 기준: `isOlderThanHours(iso, 48)`. GA4/GSC fetch 지연에 적용.
- **2026-06-05 변경**: sitemap 수집 지연(`lastDownloaded` 48h+)은 더 이상 `stale`로 판정하지 않는다. Google 크롤링 타이밍에 의존해 운영자가 손쓸 수 없는데 정상 사이트 38개가 오탐으로 잡혔다. 이제 health score 감점(`getHealthScore` L1345)으로만 약하게 반영. `getOperationalStatus`에서 sitemap-lag 분기 제거됨.
- 라벨 텍스트: `getStatusLabel()` (L1705), 사유 문구: `getStatusReason()` (L1713).

---

## 3. 사이트 특성 (반드시 알아야 할 함정)

### 3-1. 네이버 의존 — GSC clicks=0은 대개 정상
주요 사이트의 유입은 **네이버가 96~98%**, Google은 거의 0:
- todaypharm 네이버 96% / bojo24 98% / klick 87%
→ **GSC(=Google) clicks=0은 버그가 아니다.** 애초에 Google 유입이 없을 뿐.
→ GA4 트래픽이 수백~천명인데 GSC가 0이라고 "수집 오류"로 오판하지 말 것.

### 3-2. GSC 형식 함정 (www / non-www / sc-domain)
같은 사이트라도 GSC는 형식별로 데이터를 **별개 집계**한다. 형식이 어긋나면 데이터가 0으로 보인다.
- 실제 사례: `today2424` non-www 노출 1 vs **www 노출 256** → `gscSiteUrl`을 www로 교정해 복구(2026-06-05)
- 점검: `npm run diag`가 더 많은 노출을 가진 형식을 추천한다.
- 설정 위치: `scripts/setup/sites.yaml`의 `gscSiteUrl`.

### 3-3. clicks=0의 두 종류 (impressions로 구분)
- **노출>0, 클릭0** = 색인됨, 순위 낮음 → 콘텐츠/내부링크로 순위 끌어올리면 클릭 전환
- **노출=0** = Google 미색인 → 색인·인지 단계부터 필요

### 3-4. SEO 레버 재정의
"순위가 병목"보다 정확히는 **네이버 의존 + Google 미개척**. Google은 순위 이전에 노출 자체가 없다.
증분 기회는 Google 색인·진출(이미 네이버로 수요 검증된 사이트들).

### 3-5. 급락(%)은 절대규모와 함께 봐야 한다
변동률만으로는 극소 트래픽이 오탐이 된다(주 3명 → -73%). 대시보드는 **직전 기간 규모 게이트**를 적용한다:
- GA4 사용자 급락: `previous7Days.activeUsers >= MIN_USERS_FOR_DROP`(50) **그리고** 변동률 ≤ -30%
- GSC 클릭 급락: `gscPrevious7Days.clicks >= MIN_CLICKS_FOR_DROP`(10) **그리고** 변동률 ≤ -30%
- 공통 헬퍼 `isSignificantUserDrop` / `isSignificantClickDrop`(`dashboard-data.ts`)로 actions·insights·trafficDropStats·healthScore 전부 동일 기준 적용.
- **7일 합계 vs 직전 7일** 비교라 요일효과는 상쇄된다. 그래도 급락이면 30일 평균과 history 일별 추세로 "진짜 하락 vs 계측 끊김"을 구분하라.

### 3-6. GA4 계측 끊김 (트래픽 하락과 구분)
일일 활성이 **갑자기 정확히 0**으로 떨어지고 사이트는 정상(발행 지속)이면 트래픽 하락이 아니라 **GA4 태그 유실**이다.
- 판별 1순위: `last30Days.activeUsers > 100`인데 `last1Days.activeUsers == 0`.
- 판별 2순위(놓치기 쉬움): **GSC 노출은 있는데 GA4가 0/극소** (`gscLast30Days.impressions >= 50 && last30Days.activeUsers < 10`). 30일이 처음부터 낮으면 1순위 필터에 안 걸린다. 예: finan(노출161·GA4 0), estat(노출337·GA4 6).
- **확인은 PHP 레벨로 하라(캐시·테마 함정 회피)**: WebFetch/curl은 LiteSpeed 페이지 캐시나 SSR 시점 때문에 오판한다. 서버에서 `wp eval` 또는 `wp-load.php` require 후 `ob_start(); do_action('wp_head'); ob_get_clean()`에 measurement ID가 있는지 검사.
- measurement ID(G-XXX)는 GA4 Admin API로 조회(`docs/site-repo-map.md` 참고).

**2026-06-05 복구 3사례 — 원인이 제각각이었다:**
| 사이트 | 원인 | 조치 |
|---|---|---|
| haemongdream | 헤더 mu-plugin(`*-header-tags.php`)이 AdSense·네이버·Clarity만 출력, GA4 누락 | 같은 mu-plugin에 gtag 추가 |
| estat | **실제로는 정상** — WebFetch가 옛 페이지 캐시를 봤을 뿐 | 확인만(데이터 쌓이는 중) |
| finan | GA4가 **비활성 테마**(kadence) functions.php에 있어 미로드. 활성 테마는 generatepress | mu-plugin으로 재삽입 |

**교훈**: ① GA4는 테마 functions.php(활성/비활성 헷갈림 + 업데이트 시 유실)보다 **mu-plugin**에 넣는 게 안전. ② 같은 파일의 AdSense는 나오는데 GA4만 안 나오면 활성 테마 불일치를 의심(`wp option get stylesheet/template`). ③ 캐시 때문에 실페이지가 거짓일 수 있으니 PHP 레벨로 확정.

---

## 4. 대응 플레이북

### "권한 필요"가 떴을 때
1. `npm run diag` 실행
2. 출력 확인:
   - `권한오류: ...` → **진짜 권한 없음**: 서비스계정(`id-ai-179@cursorai-451704.iam.gserviceaccount.com`)을 GSC 속성에 소유자 추가 / FILE verify 재검증
   - `현재형식 ... clicks=N imp=N` 정상 + `진단: 실시간 조회는 정상` → **배포 데이터만 오래됨**: `npm run stats:update` 재수집 후 커밋·배포하면 해소
3. `형식 교정 권장: ...` 이 보이면 `sites.yaml`의 `gscSiteUrl`을 추천 형식으로 수정

### "오래된 데이터"가 떴을 때
- `npm run stats:update` 재실행. **단 sitemap `lastDownloaded`는 Google 크롤링 의존이라 재수집으로 안 내려간다**(과거 "함께 갱신됨" 기술은 부정확). stale은 GA4/GSC fetch 48h+에만 적용.
- 자동수집(GitHub Actions) 점검 순서: `gh run list` → 실패 시 `gh run view <id> --log-failed`.

### 자동수집(GitHub Actions) 실패 진단 — 결제부터 의심하지 말 것
- **2026-06-05 실제 사례**: 06-04 schedule run이 failure. STATUS엔 "결제 문제"로 적혀 있었으나 **오진**이었다. 로그를 보면 수집(`import-ga4-sites`·`stats:update`)은 성공했고, 다음 `Validate app` step의 **`pnpm type-check`가 깨져** job 전체가 실패 → commit/push가 안 돼 데이터가 안 올라옴.
- 진짜 원인: 커밋 `1425dad`가 `lib/sites.ts`에 `monetization: z.boolean().default(true)`를 추가하며 `Site` 타입에서 monetization이 **required**가 됨. 객체 생성 3곳(`06-verify-readiness.ts`·`import-ga4-sites.ts`·`update-ga4-stats.ts`)이 이를 누락 + `exactOptionalPropertyTypes` 위반.
- **교훈**: 워크플로우(`update-stats.yml`)는 `stats:update` 뒤에 `type-check && lint && build`를 Validate 게이트로 돈다. 수집이 성공해도 이 게이트가 깨지면 push가 막힌다. 타입/스키마 변경 커밋 후엔 반드시 type-check 통과 확인.

### 실제 사례 (2026-06-05 진단)
- etique·luxurytraver "권한 필요" → `diag` 결과 **실시간 권한 정상**(etique imp 461). 06-04 FILE verify로 이미 해결된 권한 문제의 **오래된 배포 잔상**이었음. 진짜 이슈는 sitemap 수집 지연.

---

## 5. 갱신 규칙 (이 문서를 살아있게 유지)

- 새 운영 패턴/원인을 발견하면 **이 문서를 먼저 고친다** (코드 주석보다 우선).
- 판정 로직이 바뀌면 §2 규칙표의 file:line을 갱신.
- 핵심 사실은 메모리(`memory/`)에도 반영해 세션 간 유지.
- 관련 파일: `scripts/setup/diagnose-ops.ts`(진단), `scripts/setup/update-ga4-stats.ts`(수집), `scripts/setup/sites.yaml`(설정), `docs/ASSET-MAP.md`(자산 매핑).

---

## 6. 2026-06-08 / 2026-06-11 수집 실패 재확인

- 확인 명령: `gh run view 27172582683 --log-failed`, `gh run view 27383350428 --log-failed`
- 결론: 두 run 모두 `setup:import-ga4-sites`와 `stats:update`는 성공했다. 실패 원인은 수집/권한/결제가 아니라 이후 `Validate app` 단계의 ESLint 실패였다.
- 공통 오류: `scripts/setup/audit-adsense-readiness.ts`의 `wordCount` 미사용 변수(`@typescript-eslint/no-unused-vars`).
- 운영 판단: 이 유형은 대시보드 데이터 수집 실패처럼 보일 수 있지만, 실제로는 validate gate가 push를 막은 것이다. 비슷한 실패가 나오면 먼저 `stats:update` 성공 여부와 `Validate app`의 첫 lint/type/build 오류를 분리해서 본다.
- 재발 방지: `update-stats.yml` 실패 알림과 `pnpm test` validate gate가 추가되어, 이후에는 실패 이슈와 회귀 테스트로 조기 확인한다.

---

## 7. 자동 사이트 개선 루프

매일 07:00 KST `update-stats.yml`은 다음 순서로 움직인다.

1. `pnpm setup:import-ga4-sites`
2. `pnpm stats:update`
3. `pnpm improvements:queue`
4. `pnpm improvements:dispatch`
5. `pnpm type-check && pnpm lint && pnpm test && pnpm build`
6. 변경된 스냅샷, history, 개선 큐, 배분 결과를 GitHub에 커밋
7. `site-improvement-queue` 이슈를 생성 또는 갱신

원칙:
- 개별 사이트를 개선하기 전에는 반드시 최신 `stats:update` 결과와 `data/site-improvement-queue.json`을 먼저 확인한다.
- T2 기술 작업은 사이트 repo/WordPress checkout, 백업, diff, 검증이 가능할 때만 Codex가 적용한다.
- T3 콘텐츠 작업(제목, 본문, FAQ, 본문 내부링크, 최신성 보강)은 자동 직접 수정하지 않고 콘텐츠 handoff로 넘긴다.
- 큐 생성물이 낡았거나 `generatedAt`이 36시간을 넘으면 `pnpm improvements:queue`는 실패해야 한다. 필요 시 먼저 `pnpm stats:update`를 다시 실행한다.
- `SITE_AUTOMATION_TOKEN`이 있으면 `scripts/setup/site-repo-map.json`에 매핑된 대상 repo로 T2 기술 작업 이슈를 자동 생성/갱신한다. 토큰이 없거나 repo 매핑이 없으면 대시보드 큐에만 남긴다.
- GitHub Actions 자체에는 Codex LLM이 내장되어 있지 않다. 이슈 배분은 Codex 창 없이 자동으로 되지만, 실제 코드 패치 자동화는 대상 repo의 별도 coding-agent/self-hosted runner 또는 명시적 Codex 실행 환경이 필요하다.
