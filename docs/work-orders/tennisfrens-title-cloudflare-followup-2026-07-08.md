# tennisfrens.com Title And Cloudflare Follow-Up - 2026-07-08

Dashboard evidence snapshot: `2026-07-08T04:15:13.350Z`

## Site State

- Site id: `tennisfrens`
- Host: `tennisfrens.com`
- Local path inspected: `D:\web\tennisfrens`
- Fresh dashboard status:
  - GA4 last 7 days: 762 users / 826 sessions / 1,944 views
  - GA4 previous 7 days: 291 users / 312 sessions / 991 views
  - GSC last 30 days: 112 clicks / 8,195 impressions / 1.37% CTR / average position 10.48
  - GSC last 7 days: 32 clicks / 2,975 impressions / 1.08% CTR / average position 10.18
  - Sitemap: `https://www.tennisfrens.com/sitemap.xml`, 1,265 submitted, 0 warnings/errors, last downloaded `2026-07-07T10:11:08.207Z`
  - AdSense and `ads.txt`: dashboard checks pass

## Public Crawl Checks

- `https://tennisfrens.com/` responds from Vercel, not Cloudflare.
- Checked priority URLs:
  - `https://tennisfrens.com/players/arthur-rinderknech`: 200, Vercel, `X-Robots-Tag: index, follow`
  - `https://tennisfrens.com/players/alexander-blockx`: 200, Vercel, `X-Robots-Tag: index, follow`
  - `https://tennisfrens.com/utility/ntrp-test`: 200, Vercel, `X-Robots-Tag: index, follow`
- No public `cf-ray` or Cloudflare serving-header signal was observed.

## Cloudflare Residue Cleanup

- Removed untracked Cloudflare verification token residue:
  - `D:\web\tennisfrens\public\cf1bbae352df4a22a23cbf48bb08350d.txt`
- Verification after cleanup:
  - `D:\web\tennisfrens\public\cf*.txt` no longer returns any file.
- Remaining Cloudflare-related residue found in the local repo should be handled as a separate cleanup PR because the tree currently has many pre-existing user/local changes:
  - `package.json` Cloudflare Pages scripts: `cf-build`, `cf-deploy`, `cf-preview`, `deploy`, `preview`
  - `wrangler.toml`
  - `CLOUDFLARE_DEPLOYMENT.md`, `README_CLOUDFLARE.md`, and Cloudflare deployment sections in docs
  - `workers/analytics/**`
  - `src/lib/cloudflare-analytics.ts`
  - `src/components/Tracking.tsx` Worker API references
  - `src/app/admin/page.tsx` Cloudflare analytics/status UI references
  - `src/types/admin.ts` Cloudflare status type
  - audit scripts that still treat `wrangler pages deploy`, `public/_headers`, or Cloudflare redirects as active checks
- Recommended Cloudflare cleanup branch:
  1. Remove Cloudflare deployment scripts and `wrangler.toml`.
  2. Remove or archive `workers/analytics/**` if no current Vercel route imports it.
  3. Replace admin Cloudflare analytics/status controls with current GA4, local DB, or Vercel evidence only.
  4. Update audit scripts so they do not flag or recommend Cloudflare Pages/Workers/redirects.
  5. Archive historical Cloudflare docs/reports only when they are not operational instructions.

## Title Handoff Evidence

Top GSC query/page opportunities from the fresh dashboard snapshot:

| Query | Clicks | Impressions | CTR | Avg Position | Current target |
| --- | ---: | ---: | ---: | ---: | --- |
| `아르튀르 랭데르크네슈` | 6 | 755 | 0.79% | 10.32 | `/players/arthur-rinderknech` |
| `알렉산더 블록스` | 1 | 127 | 0.79% | 11.03 | `/players/alexander-blockx` |
| `ntrp 테스트` | 8 | 10 | 80.00% | 1.80 | `/utility/ntrp-test` |

Current metadata:

- `/players/arthur-rinderknech`
  - Title: `아르튀르 랑데르크네슈 프로필 | 랭킹·전적·서브`
  - Description: `아르튀르 랑데르크네슈(Arthur Rinderknech)의 ATP 프로필입니다. 랭킹, 전적, 서브 기반 플레이스타일과 주요 강점을 정리했습니다.`
  - Canonical: `https://www.tennisfrens.com/players/arthur-rinderknech`
- `/players/alexander-blockx`
  - Title: `알렉산더 블록스(Alexander Blockx) 프로필 | ATP 랭킹·전적·플레이스타일`
  - Description: `알렉산더 블록스(Alexander Blockx) 선수의 ATP 프로필입니다. Belgium 출신, 오른손잡이, 주요 강점과 경기 흐름을 정리했습니다. 주니어 무대에서 주목받은 벨기에의 균형형 베이스라이너`
  - Canonical: `https://tennisfrens.com/players/alexander-blockx`
- `/utility/ntrp-test`
  - Title: `NTRP 테스트 | 테니스 실력 등급 무료 측정 | TennisFriends`
  - Description: `NTRP 뜻과 테니스 실력 등급을 10문항으로 확인하세요. 초보·동호인·중급자 레벨 진단과 다음 훈련 방향을 무료로 제안합니다.`
  - Canonical: `https://tennisfrens.com/utility/ntrp-test`

## Recommended Title Work

### P1: Arthur Rinderknech Korean alias alignment

The query evidence uses `아르튀르 랭데르크네슈`, while the live title and description use `아르튀르 랑데르크네슈`. This mismatch is the clearest CTR/snippet fix.

Candidate titles:

1. `아르튀르 랭데르크네슈 프로필 | 랭킹·전적·서브`
2. `아르튀르 랭데르크네슈(랑데르크네슈) 프로필 | 랭킹·전적`
3. `아르튀르 랭데르크네슈 경기 스타일 | 랭킹·전적·서브`

Recommended meta direction:

- Include both Korean spellings once in body or description if the content can do so naturally.
- Keep `Arthur Rinderknech` in the description for entity clarity.
- Do not change facts about current ranking or recent results unless the data source is refreshed.

### P2: Alexander Blockx CTR refresh

The current title is acceptable, but low CTR at near-page-one position suggests a sharper Korean-first snippet may help.

Candidate titles:

1. `알렉산더 블록스 프로필 | 랭킹·전적·플레이스타일`
2. `알렉산더 블록스(Alexander Blockx) 경기 스타일 | 랭킹·전적`
3. `알렉산더 블록스 선수 정보 | 프로필·랭킹·전적`

Recommended meta direction:

- Keep `Alexander Blockx` in parentheses for entity matching.
- Replace generic nationality wording like `Belgium 출신` with natural Korean if the page template allows it.
- Avoid ranking/date claims unless the player data ingestion is confirmed fresh.

### Preserve: NTRP test

`ntrp 테스트` is already performing well: 8 clicks / 10 impressions / 80.00% CTR / position 1.80. Do not change the title as part of this CTR pass unless new query evidence shows decay.

## Technical SEO Follow-Up

- Canonical host is inconsistent in the sampled pages:
  - Arthur page canonical uses `https://www.tennisfrens.com/...`
  - Alexander and NTRP pages use `https://tennisfrens.com/...`
- The dashboard sitemap is also `https://www.tennisfrens.com/sitemap.xml`.
- Recommended fix: choose one canonical host and make sitemap, canonical tags, redirects, and internal links consistent. Because the live site currently serves from Vercel and the local working tree is dirty, handle this in a dedicated branch after the in-progress local changes are reconciled.

## Decision

- Classification: T3 title handoff plus Cloudflare residue cleanup.
- Applied now: removed the untracked Cloudflare token file.
- Deferred to a dedicated repo cleanup PR: Cloudflare code/docs/script residues and canonical host normalization.
- No live title/content edits were made in this pass because the source repo contains extensive pre-existing local changes and title/body edits should go through a focused title/content workflow.
