# temon 순위 올리기 파일럿 (temon 레포에서 구현)

작성: 2026-06-05 | 목표: 순위 5~15위 페이지를 1페이지 상단으로
레포: D:\web\temon (Next14, origin 동기) | GitHub lsk7209/temon

## 진단 (GSC 28일)
1페이지 진입 임박 타겟 (노출↑ 순위 5~15):
| 페이지 | 노출 | 순위 | 클릭 |
|---|---|---|---|
| / (홈) | 1726 | 10.3 | 51 |
| /tests (허브) | 970 | 12.3 | 21 |
| /tests/kpop-idol | 290 | 5.1~5.9 | 17 |
| /tests/zombie-survival | 131 | 7.7 | 4 |
| /tests/perfection-balance-1xQC | 96 | 6.9 | 1 |
| /tests/spending-style | 77 | 9.5 | 2 |
| /tests/breakup-style | 59 | 5.6 | 7 |

제목·메타는 이미 양호 → 레버는 **내부링크(순위)**.

## 핵심 레버 (확정)
`components/related-tests-section.tsx` 컴포넌트가 **이미 존재하나** `app/tests/[testId]/page.tsx` 렌더에 **미연결**.
현재 렌더: TestIntro + TestExpandedIntro 뿐 (관련 테스트 링크 없음 → 고립 페이지).

## 구현 단계 (temon 레포 세션에서)
1. `app/tests/[testId]/page.tsx` 하단에 `<RelatedTestsSection>` 추가 (TestExpandedIntro 아래)
2. 관련 테스트 선정 로직: 같은 `test.category` 우선 + 인기(노출순) 보완, 4~6개
   - lib에서 getRelatedTests(testId, category) 헬퍼 (없으면 신설). ai-content-index.ts에 category 있음
3. 허브(/tests)·홈(/)에서 상위 노출 테스트(kpop-idol·breakup-style 등)로 가는 링크 강화
4. (선택) 앵커 텍스트에 테스트명+"테스트" 키워드 포함
5. 빌드·검증: `pnpm dev`로 내부링크 렌더 확인 → `pnpm build` → 커밋 → push
6. 배포 후 1~2주 GSC 순위 추적 (타겟 페이지 position 변화)

## Acceptance Criteria
- [ ] 모든 /tests/[testId] 페이지에 관련 테스트 4~6개 내부링크 렌더
- [ ] 링크가 같은 category 우선 선정, 깨진 링크 0
- [ ] pnpm build 성공
- [ ] 배포 후 타겟 7개 페이지 평균순위 모니터링 시작

## 리스크
- related-tests-section 컴포넌트 props/데이터 계약 확인 필요(기존 사용처 참고: blog 등)
- 관련 테스트 선정이 빈약하면 효과 약함 → category+인기 조합
- 순위 효과는 색인 후 1~2주 지연 (즉시 아님)

## 주의 — 실행 환경
- 이 작업은 temon 레포 전용 세션에서 진행 (빌드·dev 검증, biome 동시실행 충돌 방지)
- temon은 현재 origin 동기 + 미커밋(산출물)뿐 → 작업 전 git pull 권장
