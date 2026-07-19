# TennisFriends NTRP metadata handoff - 2026-07-19

## Evidence

- Dashboard snapshot: `2026-07-19T01:36:27.136Z`
- Site: `https://tennisfrens.com/`
- 30-day Google Search: 14,995 impressions, 123 clicks, 0.82% CTR, average position 9.73.
- Strongest recent landing-page signal: `/utility/ntrp-test` (132 active users in the last 7 days, +40.4% versus the prior period).
- Search query observed in the refreshed dashboard: `ntrp 테스트` (position 1.09). The dashboard query sample is too small to justify a bulk title rewrite.

## Target and intent boundary

- Target: `src/app/utility/ntrp-test/layout.tsx`
- Current title: `NTRP 실력 테스트`
- Reader job: estimate the user's current tennis level before choosing a match, lesson, or training plan.
- Intent: self-assessment tool.
- Do not overlap with existing editorial guides for NTRP 2.5 to 3.0, 3.0 to 3.5, 3.5 to 4.0, or Korean-club-to-NTRP mapping. Those are explanatory or improvement-planning pages, not the diagnostic tool.

## Recommended metadata

```text
title: NTRP 테스트 | 내 테니스 실력 등급 자가 진단
description: NTRP 기준으로 현재 테니스 실력을 점검하세요. 동호인 경기와 레슨 전 확인할 샷 안정성·서브·경기 경험 질문으로 내 등급 범위를 가늠합니다.
```

Alternatives retained for a controlled replacement only:

1. `NTRP 테스트 | 테니스 실력 등급을 자가 진단해보세요`
2. `내 테니스 실력은 몇 점? NTRP 등급 자가 진단 테스트`
3. `NTRP 등급 테스트 | 동호인 테니스 실력 점검 도구`

## Apply boundary

The `D:\web\tennisfrens` worktree contains extensive pre-existing uncommitted changes. Do not edit, format, stage, commit, or deploy that worktree from this handoff. Apply only after its owner provides a clean branch or an explicit file-level ownership boundary.

When the boundary is available:

1. Change only the `title`, `description`, and matching Open Graph values in `src/app/utility/ntrp-test/layout.tsx`.
2. Run `npm run audit:metadata-coverage`, `npm run type-check`, and the relevant build check.
3. Recheck the live canonical and rendered title after the site's normal deployment flow.
4. Compare CTR after a sufficient new-impression window; do not judge the change from ranking alone.
