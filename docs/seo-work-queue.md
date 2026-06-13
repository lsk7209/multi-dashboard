# 사이트 개선 작업 큐

> 이 문서는 `pnpm improvements:queue`가 `data/site-stats.json`에서 자동 생성합니다.
> 수동 편집보다 대시보드 갱신 후 재생성을 우선합니다.

- 생성: 2026-06-13T04:26:56.938Z
- 대시보드 스냅샷: 2026-06-13T04:26:56.211Z
- 기준 기간: 2026-06-06 ~ 2026-06-12
- 후보: 20개

## 자동화 경계

- T1: 현재 큐에는 모니터링/기록 수준만 자동 처리합니다.
- T2: canonical, robots, sitemap, analytics, template 계열은 사이트 checkout/백업/검증 후 Codex가 적용할 수 있습니다.
- T3: 제목, 본문, FAQ, 최신성 보강, 본문 내부링크는 콘텐츠 handoff입니다.

## 후보 목록

### 1. crepika.com (crepika.com)

- URL: https://crepika.com/
- 유형: 색인/권한 / high / T2 / codex_apply_after_site_checkout
- 핵심값: GSC 0
- 이유: GSC 데이터가 없거나 권한 오류가 있습니다.
- 권장: Search Console 소유권과 서비스 계정 권한을 확인하세요.
- 검증: Search Console 속성 권한이 정상이고 sitemap 마지막 읽은 날짜가 최신이며, 다음 갱신 후 GSC 오류가 사라지는지 확인합니다.
- 차단 조건: needs site/repo access, must verify canonical, robots, sitemap, and analytics ownership before applying
- GSC 진단: sitemap 제출 수는 있지만 색인 수가 0입니다. canonical, robots, noindex, sitemap URL의 실제 응답을 먼저 점검하세요.
- 리뷰 메모: GSC 0은 권한 오류로 단정하지 말고 속성 불일치, 검색 노출 없음, sitemap/canonical 문제를 분리해서 봐야 합니다.
- 상위 쿼리: 없음

작업 지시:

```text
Codex: crepika.com(crepika.com)의 GSC 소유권, sitemap 제출 URL, robots.txt, canonical을 점검하고 데이터가 0으로 잡히는 원인을 수정 계획으로 정리해줘. 기준 정보: siteId=crepika, url=https://crepika.com/, gscSiteUrl=https://crepika.com/, sitemap=https://crepika.com/sitemap.xml, submitted=383.
```

### 2. klick.kr (klick.kr)

- URL: https://klick.kr/
- 유형: 색인/권한 / high / T2 / codex_apply_after_site_checkout
- 핵심값: GSC 0
- 이유: GSC 데이터가 없거나 권한 오류가 있습니다.
- 권장: Search Console 소유권과 서비스 계정 권한을 확인하세요.
- 검증: Search Console 속성 권한이 정상이고 sitemap 마지막 읽은 날짜가 최신이며, 다음 갱신 후 GSC 오류가 사라지는지 확인합니다.
- 차단 조건: needs site/repo access, must verify canonical, robots, sitemap, and analytics ownership before applying
- GSC 진단: GA4 유입은 있는데 GSC 노출이 0입니다. GSC 속성 불일치, 검색 유입 없음, 색인/canonical 문제를 분리해서 확인하세요.
- 리뷰 메모: GSC 0은 권한 오류로 단정하지 말고 속성 불일치, 검색 노출 없음, sitemap/canonical 문제를 분리해서 봐야 합니다.
- 상위 쿼리: 없음

작업 지시:

```text
Codex: klick.kr(klick.kr)의 GSC 소유권, sitemap 제출 URL, robots.txt, canonical을 점검하고 데이터가 0으로 잡히는 원인을 수정 계획으로 정리해줘. 기준 정보: siteId=klick-2, url=https://klick.kr/, gscSiteUrl=https://klick.kr/, sitemap=https://klick.kr/sitemap.xml.
```

### 3. limsight.kr (limsight.kr)

- URL: https://limsight.kr/
- 유형: 색인/권한 / high / T2 / codex_apply_after_site_checkout
- 핵심값: GSC 0
- 이유: GSC 데이터가 없거나 권한 오류가 있습니다.
- 권장: Search Console 소유권과 서비스 계정 권한을 확인하세요.
- 검증: Search Console 속성 권한이 정상이고 sitemap 마지막 읽은 날짜가 최신이며, 다음 갱신 후 GSC 오류가 사라지는지 확인합니다.
- 차단 조건: needs site/repo access, must verify canonical, robots, sitemap, and analytics ownership before applying
- GSC 진단: GSC API 오류가 있어 Search Console 권한 또는 속성 등록을 먼저 확인해야 합니다: User does not have sufficient permission for site 'https://limsight.kr/'. See also: https://support.google.com/webmasters/answer/2451999.
- 리뷰 메모: 표본이 작아 퍼센트 변화가 크게 흔들릴 수 있으므로 실제 페이지/쿼리 수를 먼저 확인하세요.
- 상위 쿼리: 없음

작업 지시:

```text
Codex: limsight.kr(limsight.kr)의 GSC 소유권, sitemap 제출 URL, robots.txt, canonical을 점검하고 데이터가 0으로 잡히는 원인을 수정 계획으로 정리해줘. 기준 정보: siteId=limsight, url=https://limsight.kr/, gscSiteUrl=https://limsight.kr/.
```

### 4. spinkorea.kr (spinkorea.kr)

- URL: https://spinkorea.kr/
- 유형: 색인/권한 / high / T2 / codex_apply_after_site_checkout
- 핵심값: GSC 0
- 이유: GSC 데이터가 없거나 권한 오류가 있습니다.
- 권장: Search Console 소유권과 서비스 계정 권한을 확인하세요.
- 검증: Search Console 속성 권한이 정상이고 sitemap 마지막 읽은 날짜가 최신이며, 다음 갱신 후 GSC 오류가 사라지는지 확인합니다.
- 차단 조건: needs site/repo access, must verify canonical, robots, sitemap, and analytics ownership before applying
- GSC 진단: sitemap 제출 수는 있지만 색인 수가 0입니다. canonical, robots, noindex, sitemap URL의 실제 응답을 먼저 점검하세요.
- 리뷰 메모: GSC 0은 권한 오류로 단정하지 말고 속성 불일치, 검색 노출 없음, sitemap/canonical 문제를 분리해서 봐야 합니다.
- 상위 쿼리: 없음

작업 지시:

```text
Codex: spinkorea.kr(spinkorea.kr)의 GSC 소유권, sitemap 제출 URL, robots.txt, canonical을 점검하고 데이터가 0으로 잡히는 원인을 수정 계획으로 정리해줘. 기준 정보: siteId=spinkorea-2, url=https://spinkorea.kr/, gscSiteUrl=https://spinkorea.kr/, sitemap=https://spinkorea.kr/sitemap.xml, submitted=278.
```

### 5. todaypharm.kr (todaypharm.kr)

- URL: https://todaypharm.kr/
- 유형: 색인/권한 / high / T2 / codex_apply_after_site_checkout
- 핵심값: GSC 0
- 이유: GSC 데이터가 없거나 권한 오류가 있습니다.
- 권장: Search Console 소유권과 서비스 계정 권한을 확인하세요.
- 검증: Search Console 속성 권한이 정상이고 sitemap 마지막 읽은 날짜가 최신이며, 다음 갱신 후 GSC 오류가 사라지는지 확인합니다.
- 차단 조건: needs site/repo access, must verify canonical, robots, sitemap, and analytics ownership before applying
- GSC 진단: sitemap 제출 수는 있지만 색인 수가 0입니다. canonical, robots, noindex, sitemap URL의 실제 응답을 먼저 점검하세요.
- 리뷰 메모: GSC 0은 권한 오류로 단정하지 말고 속성 불일치, 검색 노출 없음, sitemap/canonical 문제를 분리해서 봐야 합니다.
- 상위 쿼리: 없음

작업 지시:

```text
Codex: todaypharm.kr(todaypharm.kr)의 GSC 소유권, sitemap 제출 URL, robots.txt, canonical을 점검하고 데이터가 0으로 잡히는 원인을 수정 계획으로 정리해줘. 기준 정보: siteId=todaypharm, url=https://todaypharm.kr/, gscSiteUrl=https://todaypharm.kr/, sitemap=https://todaypharm.kr/sitemap.xml, submitted=49075.
```

### 6. travelpang.kr (travelpang.kr)

- URL: https://travelpang.kr/
- 유형: 색인/권한 / high / T2 / codex_apply_after_site_checkout
- 핵심값: GSC 0
- 이유: GSC 데이터가 없거나 권한 오류가 있습니다.
- 권장: Search Console 소유권과 서비스 계정 권한을 확인하세요.
- 검증: Search Console 속성 권한이 정상이고 sitemap 마지막 읽은 날짜가 최신이며, 다음 갱신 후 GSC 오류가 사라지는지 확인합니다.
- 차단 조건: needs site/repo access, must verify canonical, robots, sitemap, and analytics ownership before applying
- GSC 진단: GSC API 오류가 있어 Search Console 권한 또는 속성 등록을 먼저 확인해야 합니다: User does not have sufficient permission for site 'https://travelpang.kr/'. See also: https://support.google.com/webmasters/answer/2451999.
- 리뷰 메모: 표본이 작아 퍼센트 변화가 크게 흔들릴 수 있으므로 실제 페이지/쿼리 수를 먼저 확인하세요.
- 상위 쿼리: 없음

작업 지시:

```text
Codex: travelpang.kr(travelpang.kr)의 GSC 소유권, sitemap 제출 URL, robots.txt, canonical을 점검하고 데이터가 0으로 잡히는 원인을 수정 계획으로 정리해줘. 기준 정보: siteId=travelpang-2, url=https://travelpang.kr/, gscSiteUrl=https://travelpang.kr/.
```

### 7. 럭키데이 - GA4 (luckyday.kr)

- URL: https://luckyday.kr/
- 유형: 색인/권한 / high / T2 / codex_apply_after_site_checkout
- 핵심값: GSC 0
- 이유: GSC 데이터가 없거나 권한 오류가 있습니다.
- 권장: Search Console 소유권과 서비스 계정 권한을 확인하세요.
- 검증: Search Console 속성 권한이 정상이고 sitemap 마지막 읽은 날짜가 최신이며, 다음 갱신 후 GSC 오류가 사라지는지 확인합니다.
- 차단 조건: needs site/repo access, must verify canonical, robots, sitemap, and analytics ownership before applying
- GSC 진단: sitemap 제출 수는 있지만 색인 수가 0입니다. canonical, robots, noindex, sitemap URL의 실제 응답을 먼저 점검하세요.
- 리뷰 메모: GSC 0은 권한 오류로 단정하지 말고 속성 불일치, 검색 노출 없음, sitemap/canonical 문제를 분리해서 봐야 합니다.
- 상위 쿼리: 없음

작업 지시:

```text
Codex: 럭키데이 - GA4(luckyday.kr)의 GSC 소유권, sitemap 제출 URL, robots.txt, canonical을 점검하고 데이터가 0으로 잡히는 원인을 수정 계획으로 정리해줘. 기준 정보: siteId=luckyday, url=https://luckyday.kr/, gscSiteUrl=sc-domain:luckyday.kr, sitemap=https://luckyday.kr/page-sitemap.xml, submitted=5.
```

### 8. picklefriend.kr (picklefriend.kr)

- URL: https://picklefriend.kr/
- 유형: 하락 / high / T2 / codex_apply_after_site_checkout
- 핵심값: -78.4%
- 이유: GSC 클릭이 직전 7일 대비 -78.4% 변했습니다.
- 권장: 상위 쿼리 순위와 CTR 하락 페이지를 점검하세요.
- 검증: 수정 후 7일 사용자, GSC 클릭, 상위 쿼리 CTR이 직전 갱신 대비 회복되는지 대시보드에서 비교합니다.
- 차단 조건: must compare top pages and channels before changing templates or links
- GSC 진단: GSC 데이터가 수집되고 있습니다. 상위 쿼리와 URL 단위로 수정 후보를 좁혀 진행하세요.
- 리뷰 메모: GA4 사용자는 늘고 검색 클릭만 줄어든 케이스라 전체 트래픽 하락보다 검색 쿼리/CTR 하락으로 좁혀 보세요.
- 상위 쿼리: 없음

작업 지시:

```text
Codex: picklefriend.kr(picklefriend.kr)의 최근 발행물, 유입 채널, 상위 쿼리/페이지 변동을 비교해 트래픽 하락 원인과 복구 작업을 우선순위로 제안해줘. 기준 정보: siteId=picklefriend, url=https://picklefriend.kr/, gscSiteUrl=https://picklefriend.kr/, sitemap=https://picklefriend.kr/sitemap.xml, submitted=280.
```

### 9. 패스트잡 - GA4 (fastjob.kr)

- URL: https://fastjob.kr/
- 유형: 하락 / high / T2 / codex_apply_after_site_checkout
- 핵심값: -72.7%
- 이유: GSC 클릭이 직전 7일 대비 -72.7% 변했습니다.
- 권장: 상위 쿼리 순위와 CTR 하락 페이지를 점검하세요.
- 검증: 수정 후 7일 사용자, GSC 클릭, 상위 쿼리 CTR이 직전 갱신 대비 회복되는지 대시보드에서 비교합니다.
- 차단 조건: must compare top pages and channels before changing templates or links
- GSC 진단: GSC 데이터가 수집되고 있습니다. 상위 쿼리와 URL 단위로 수정 후보를 좁혀 진행하세요.
- 리뷰 메모: 표본이 작아 퍼센트 변화가 크게 흔들릴 수 있으므로 실제 페이지/쿼리 수를 먼저 확인하세요.
- 쿼리: 제스트컴퍼니 geo / 클릭 0 / 노출 14 / CTR 0.0% / 순위 7.9

작업 지시:

```text
Codex: 패스트잡 - GA4(fastjob.kr)의 최근 발행물, 유입 채널, 상위 쿼리/페이지 변동을 비교해 트래픽 하락 원인과 복구 작업을 우선순위로 제안해줘. 기준 정보: siteId=fastjob, url=https://fastjob.kr/, gscSiteUrl=https://fastjob.kr/, sitemap=https://fastjob.kr/sitemap.xml, submitted=153.
```

### 10. ehon365.kr (ehon365.kr)

- URL: https://ehon365.kr/
- 유형: 하락 / high / T2 / codex_apply_after_site_checkout
- 핵심값: -70.0%
- 이유: GA4 사용자가 직전 7일 대비 -70.0% 변했습니다.
- 권장: 최근 발행, 색인, 유입 채널 변화를 먼저 확인하세요.
- 검증: 수정 후 7일 사용자, GSC 클릭, 상위 쿼리 CTR이 직전 갱신 대비 회복되는지 대시보드에서 비교합니다.
- 차단 조건: must compare top pages and channels before changing templates or links
- GSC 진단: GSC 데이터가 수집되고 있습니다. 상위 쿼리와 URL 단위로 수정 후보를 좁혀 진행하세요.
- 리뷰 메모: 현재 신호는 작업 후보로 볼 수 있으나, 변경 전 상위 페이지와 쿼리 단위 근거를 한 번 더 확인하세요.
- 쿼리: 양육비 산정표 2026 / 클릭 2 / 노출 73 / CTR 2.7% / 순위 10.5

작업 지시:

```text
Codex: ehon365.kr(ehon365.kr)의 최근 발행물, 유입 채널, 상위 쿼리/페이지 변동을 비교해 트래픽 하락 원인과 복구 작업을 우선순위로 제안해줘. 기준 정보: siteId=ehon365, url=https://ehon365.kr/, gscSiteUrl=sc-domain:ehon365.kr, sitemap=https://ehon365.kr/dynamic-sitemap.xml, submitted=69.
```

### 11. tennisfrens.com (tennisfrens.com)

- URL: https://tennisfrens.com/
- 유형: 하락 / high / T2 / codex_apply_after_site_checkout
- 핵심값: -59.6%
- 이유: GA4 사용자가 직전 7일 대비 -59.6% 변했습니다.
- 권장: 최근 발행, 색인, 유입 채널 변화를 먼저 확인하세요.
- 검증: 수정 후 7일 사용자, GSC 클릭, 상위 쿼리 CTR이 직전 갱신 대비 회복되는지 대시보드에서 비교합니다.
- 차단 조건: must compare top pages and channels before changing templates or links
- GSC 진단: GSC 데이터가 수집되고 있습니다. 상위 쿼리와 URL 단위로 수정 후보를 좁혀 진행하세요.
- 리뷰 메모: 현재 신호는 작업 후보로 볼 수 있으나, 변경 전 상위 페이지와 쿼리 단위 근거를 한 번 더 확인하세요.
- 쿼리: ntrp 테스트 / 클릭 5 / 노출 11 / CTR 45.5% / 순위 1.0
- 쿼리: 사라 에라니 / 클릭 1 / 노출 14 / CTR 7.1% / 순위 9.0

작업 지시:

```text
Codex: tennisfrens.com(tennisfrens.com)의 최근 발행물, 유입 채널, 상위 쿼리/페이지 변동을 비교해 트래픽 하락 원인과 복구 작업을 우선순위로 제안해줘. 기준 정보: siteId=tennisfrens, url=https://tennisfrens.com/, gscSiteUrl=sc-domain:tennisfrens.com, sitemap=https://www.tennisfrens.com/sitemap.xml, submitted=1143.
```

### 12. cartain.kr (cartain.kr)

- URL: https://cartain.kr/
- 유형: 하락 / high / T2 / codex_apply_after_site_checkout
- 핵심값: -39.6%
- 이유: GA4 사용자가 직전 7일 대비 -39.6% 변했습니다.
- 권장: 최근 발행, 색인, 유입 채널 변화를 먼저 확인하세요.
- 검증: 수정 후 7일 사용자, GSC 클릭, 상위 쿼리 CTR이 직전 갱신 대비 회복되는지 대시보드에서 비교합니다.
- 차단 조건: must compare top pages and channels before changing templates or links
- GSC 진단: GSC 데이터가 수집되고 있습니다. 상위 쿼리와 URL 단위로 수정 후보를 좁혀 진행하세요.
- 리뷰 메모: 현재 신호는 작업 후보로 볼 수 있으나, 변경 전 상위 페이지와 쿼리 단위 근거를 한 번 더 확인하세요.
- 상위 쿼리: 없음

작업 지시:

```text
Codex: cartain.kr(cartain.kr)의 최근 발행물, 유입 채널, 상위 쿼리/페이지 변동을 비교해 트래픽 하락 원인과 복구 작업을 우선순위로 제안해줘. 기준 정보: siteId=cartain-2, url=https://cartain.kr/, gscSiteUrl=https://cartain.kr/, sitemap=https://cartain.kr/sitemap.xml, submitted=725.
```

### 13. bojo24.kr (bojo24.kr)

- URL: https://bojo24.kr/
- 유형: 하락 / high / T2 / codex_apply_after_site_checkout
- 핵심값: -35.0%
- 이유: GA4 사용자가 직전 7일 대비 -35.0% 변했습니다.
- 권장: 최근 발행, 색인, 유입 채널 변화를 먼저 확인하세요.
- 검증: 수정 후 7일 사용자, GSC 클릭, 상위 쿼리 CTR이 직전 갱신 대비 회복되는지 대시보드에서 비교합니다.
- 차단 조건: must compare top pages and channels before changing templates or links
- GSC 진단: GSC 노출은 있으나 클릭이 없습니다. 제목, 메타 설명, 검색 의도 일치도를 우선 점검하세요.
- 리뷰 메모: 현재 신호는 작업 후보로 볼 수 있으나, 변경 전 상위 페이지와 쿼리 단위 근거를 한 번 더 확인하세요.
- 상위 쿼리: 없음

작업 지시:

```text
Codex: bojo24.kr(bojo24.kr)의 최근 발행물, 유입 채널, 상위 쿼리/페이지 변동을 비교해 트래픽 하락 원인과 복구 작업을 우선순위로 제안해줘. 기준 정보: siteId=bojo24, url=https://bojo24.kr/, gscSiteUrl=https://www.bojo24.kr/, sitemap=4 sitemaps.
```

### 14. spinkorea.kr (spinkorea.kr)

- URL: https://spinkorea.kr/
- 유형: 하락 / high / T2 / codex_apply_after_site_checkout
- 핵심값: -32.7%
- 이유: GA4 사용자가 직전 7일 대비 -32.7% 변했습니다.
- 권장: 최근 발행, 색인, 유입 채널 변화를 먼저 확인하세요.
- 검증: 수정 후 7일 사용자, GSC 클릭, 상위 쿼리 CTR이 직전 갱신 대비 회복되는지 대시보드에서 비교합니다.
- 차단 조건: must compare top pages and channels before changing templates or links
- GSC 진단: sitemap 제출 수는 있지만 색인 수가 0입니다. canonical, robots, noindex, sitemap URL의 실제 응답을 먼저 점검하세요.
- 리뷰 메모: 현재 신호는 작업 후보로 볼 수 있으나, 변경 전 상위 페이지와 쿼리 단위 근거를 한 번 더 확인하세요.
- 상위 쿼리: 없음

작업 지시:

```text
Codex: spinkorea.kr(spinkorea.kr)의 최근 발행물, 유입 채널, 상위 쿼리/페이지 변동을 비교해 트래픽 하락 원인과 복구 작업을 우선순위로 제안해줘. 기준 정보: siteId=spinkorea-2, url=https://spinkorea.kr/, gscSiteUrl=https://spinkorea.kr/, sitemap=https://spinkorea.kr/sitemap.xml, submitted=278.
```

### 15. texturb.com (texturb.com)

- URL: https://texturb.com/
- 유형: CTR 개선 / medium / T3 / content_handoff
- 핵심값: 2.9%
- 이유: 노출 280회 대비 CTR이 2.9%로 낮습니다.
- 권장: 제목과 메타 설명을 검색 의도에 맞춰 개선하세요.
- 검증: 개선 대상 페이지의 CTR과 평균 순위를 다음 GSC 갱신에서 기존 값과 비교합니다.
- 차단 조건: article titles, body text, headings, and in-body links require editorial handoff
- GSC 진단: GSC 데이터가 수집되고 있습니다. 상위 쿼리와 URL 단위로 수정 후보를 좁혀 진행하세요.
- 리뷰 메모: 표본이 작아 퍼센트 변화가 크게 흔들릴 수 있으므로 실제 페이지/쿼리 수를 먼저 확인하세요. 노출 규모가 아직 작아 사이트 전체 결론보다 상위 쿼리와 URL 단위 후보 선별이 먼저입니다.
- 상위 쿼리: 없음

작업 지시:

```text
Codex: texturb.com(texturb.com)에서 노출은 있지만 CTR이 낮은 페이지의 제목, 메타 설명, 검색 의도 일치도를 개선할 후보를 찾아줘. 기준 정보: siteId=texturb, url=https://texturb.com/, gscSiteUrl=https://texturb.com/, sitemap=https://texturb.com/sitemap.xml, submitted=77.
```

### 16. todayshops.kr (todayshops.kr)

- URL: https://todayshops.kr/
- 유형: CTR 개선 / medium / T3 / content_handoff
- 핵심값: 2.2%
- 이유: 노출 46회 대비 CTR이 2.2%로 낮습니다.
- 권장: 제목과 메타 설명을 검색 의도에 맞춰 개선하세요.
- 검증: 개선 대상 페이지의 CTR과 평균 순위를 다음 GSC 갱신에서 기존 값과 비교합니다.
- 차단 조건: article titles, body text, headings, and in-body links require editorial handoff
- GSC 진단: GSC 데이터가 수집되고 있습니다. 상위 쿼리와 URL 단위로 수정 후보를 좁혀 진행하세요.
- 리뷰 메모: 표본이 작아 퍼센트 변화가 크게 흔들릴 수 있으므로 실제 페이지/쿼리 수를 먼저 확인하세요. 노출 규모가 아직 작아 사이트 전체 결론보다 상위 쿼리와 URL 단위 후보 선별이 먼저입니다.
- 상위 쿼리: 없음

작업 지시:

```text
Codex: todayshops.kr(todayshops.kr)에서 노출은 있지만 CTR이 낮은 페이지의 제목, 메타 설명, 검색 의도 일치도를 개선할 후보를 찾아줘. 기준 정보: siteId=todayshops-2, url=https://todayshops.kr/, gscSiteUrl=https://todayshops.kr/, sitemap=https://todayshops.kr/sitemap.xml, submitted=183.
```

### 17. estat.kr (estat.kr)

- URL: https://estat.kr/
- 유형: CTR 개선 / medium / T3 / content_handoff
- 핵심값: 1.7%
- 이유: 노출 362회 대비 CTR이 1.7%로 낮습니다.
- 권장: 제목과 메타 설명을 검색 의도에 맞춰 개선하세요.
- 검증: 개선 대상 페이지의 CTR과 평균 순위를 다음 GSC 갱신에서 기존 값과 비교합니다.
- 차단 조건: article titles, body text, headings, and in-body links require editorial handoff
- GSC 진단: GSC 데이터가 수집되고 있습니다. 상위 쿼리와 URL 단위로 수정 후보를 좁혀 진행하세요.
- 리뷰 메모: 표본이 작아 퍼센트 변화가 크게 흔들릴 수 있으므로 실제 페이지/쿼리 수를 먼저 확인하세요.
- 쿼리: 냉면양념장황금레시피 / 클릭 0 / 노출 21 / CTR 0.0% / 순위 2.8

작업 지시:

```text
Codex: estat.kr(estat.kr)에서 노출은 있지만 CTR이 낮은 페이지의 제목, 메타 설명, 검색 의도 일치도를 개선할 후보를 찾아줘. 기준 정보: siteId=estat-2, url=https://estat.kr/, gscSiteUrl=https://estat.kr/, sitemap=https://estat.kr/sitemap-posts.xml, submitted=443.
```

### 18. tennisfrens.com (tennisfrens.com)

- URL: https://tennisfrens.com/
- 유형: CTR 개선 / medium / T3 / content_handoff
- 핵심값: 1.6%
- 이유: 노출 1,189회 대비 CTR이 1.6%로 낮습니다.
- 권장: 제목과 메타 설명을 검색 의도에 맞춰 개선하세요.
- 검증: 개선 대상 페이지의 CTR과 평균 순위를 다음 GSC 갱신에서 기존 값과 비교합니다.
- 차단 조건: article titles, body text, headings, and in-body links require editorial handoff
- GSC 진단: GSC 데이터가 수집되고 있습니다. 상위 쿼리와 URL 단위로 수정 후보를 좁혀 진행하세요.
- 리뷰 메모: 현재 신호는 작업 후보로 볼 수 있으나, 변경 전 상위 페이지와 쿼리 단위 근거를 한 번 더 확인하세요.
- 상위 쿼리: 없음

작업 지시:

```text
Codex: tennisfrens.com(tennisfrens.com)에서 노출은 있지만 CTR이 낮은 페이지의 제목, 메타 설명, 검색 의도 일치도를 개선할 후보를 찾아줘. 기준 정보: siteId=tennisfrens, url=https://tennisfrens.com/, gscSiteUrl=sc-domain:tennisfrens.com, sitemap=https://www.tennisfrens.com/sitemap.xml, submitted=1143.
```

### 19. 소프트와 - GA4 (softwa.kr)

- URL: https://softwa.kr/
- 유형: CTR 개선 / medium / T3 / content_handoff
- 핵심값: 1.6%
- 이유: 노출 250회 대비 CTR이 1.6%로 낮습니다.
- 권장: 제목과 메타 설명을 검색 의도에 맞춰 개선하세요.
- 검증: 개선 대상 페이지의 CTR과 평균 순위를 다음 GSC 갱신에서 기존 값과 비교합니다.
- 차단 조건: article titles, body text, headings, and in-body links require editorial handoff
- GSC 진단: GSC 데이터가 수집되고 있습니다. 상위 쿼리와 URL 단위로 수정 후보를 좁혀 진행하세요.
- 리뷰 메모: 노출 규모가 아직 작아 사이트 전체 결론보다 상위 쿼리와 URL 단위 후보 선별이 먼저입니다.
- 상위 쿼리: 없음

작업 지시:

```text
Codex: 소프트와 - GA4(softwa.kr)에서 노출은 있지만 CTR이 낮은 페이지의 제목, 메타 설명, 검색 의도 일치도를 개선할 후보를 찾아줘. 기준 정보: siteId=softwa, url=https://softwa.kr/, gscSiteUrl=https://softwa.kr/, sitemap=https://softwa.kr/sitemap_index.xml, submitted=390.
```

### 20. gong365.kr (gong365.kr)

- URL: https://gong365.kr/
- 유형: CTR 개선 / medium / T3 / content_handoff
- 핵심값: 1.1%
- 이유: 노출 95회 대비 CTR이 1.1%로 낮습니다.
- 권장: 제목과 메타 설명을 검색 의도에 맞춰 개선하세요.
- 검증: 개선 대상 페이지의 CTR과 평균 순위를 다음 GSC 갱신에서 기존 값과 비교합니다.
- 차단 조건: article titles, body text, headings, and in-body links require editorial handoff
- GSC 진단: GSC 데이터가 수집되고 있습니다. 상위 쿼리와 URL 단위로 수정 후보를 좁혀 진행하세요.
- 리뷰 메모: 표본이 작아 퍼센트 변화가 크게 흔들릴 수 있으므로 실제 페이지/쿼리 수를 먼저 확인하세요. 노출 규모가 아직 작아 사이트 전체 결론보다 상위 쿼리와 URL 단위 후보 선별이 먼저입니다.
- 상위 쿼리: 없음

작업 지시:

```text
Codex: gong365.kr(gong365.kr)에서 노출은 있지만 CTR이 낮은 페이지의 제목, 메타 설명, 검색 의도 일치도를 개선할 후보를 찾아줘. 기준 정보: siteId=gong365, url=https://gong365.kr/, gscSiteUrl=https://gong365.kr/, sitemap=https://gong365.kr/sitemap.xml, submitted=592.
```


## 대시보드 액션

1. 권한 - travelpang.kr (travelpang.kr): GSC 권한 또는 Search Console 속성 확인이 필요합니다. / GSC/GA4 권한과 서비스 계정 접근을 먼저 복구하세요.
2. 권한 - limsight.kr (limsight.kr): GSC 권한 또는 Search Console 속성 확인이 필요합니다. / GSC/GA4 권한과 서비스 계정 접근을 먼저 복구하세요.
3. 급락 - tennisfrens.com (tennisfrens.com): GA4 사용자가 직전 7일 대비 크게 감소했습니다. / 최근 발행, 색인, 유입 채널 변경 여부를 확인하세요.
4. 급락 - bojo24.kr (bojo24.kr): GA4 사용자가 직전 7일 대비 크게 감소했습니다. / 최근 발행, 색인, 유입 채널 변경 여부를 확인하세요.
5. 급락 - ehon365.kr (ehon365.kr): GA4 사용자가 직전 7일 대비 크게 감소했습니다. / 최근 발행, 색인, 유입 채널 변경 여부를 확인하세요.
6. 급락 - spinkorea.kr (spinkorea.kr): GA4 사용자가 직전 7일 대비 크게 감소했습니다. / 최근 발행, 색인, 유입 채널 변경 여부를 확인하세요.
7. 급락 - cartain.kr (cartain.kr): GA4 사용자가 직전 7일 대비 크게 감소했습니다. / 최근 발행, 색인, 유입 채널 변경 여부를 확인하세요.
8. 급락 - 패스트잡 - GA4 (fastjob.kr): GSC 클릭이 직전 7일 대비 크게 감소했습니다. / 상위 쿼리와 CTR 하락 페이지를 점검하세요.
9. 급락 - picklefriend.kr (picklefriend.kr): GSC 클릭이 직전 7일 대비 크게 감소했습니다. / 상위 쿼리와 CTR 하락 페이지를 점검하세요.
10. 수익화 - limsight.kr (limsight.kr): 홈페이지 HTML에서 AdSense 코드가 감지되지 않았습니다. / 홈페이지, 글 상세, 조건부 광고 삽입, 캐시 반영 여부를 확인하세요.
11. 수익화 - limsight.kr (limsight.kr): ads.txt에서 Google publisher 항목이 확인되지 않았습니다. / /ads.txt에 google.com, pub-... 항목이 있는지 확인하세요.
12. 사이트맵 - 강사자판기 (kang4.com): GSC sitemap 마지막 수집일이 5일 전입니다. / Search Console에 sitemap을 재제출하고 sitemap lastmod와 robots.txt Sitemap 라인을 확인하세요.

