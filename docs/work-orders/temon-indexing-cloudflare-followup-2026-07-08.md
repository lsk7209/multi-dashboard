# temon.kr Indexing And Cloudflare Follow-Up - 2026-07-08

## Evidence

- Dashboard snapshot: `data/site-stats.json`, `generatedAt=2026-07-08T01:11:20.285Z`
- Source policy: direct dashboard/public/local/repo evidence only; no `gmail-digest`
- Prior audit source: `docs/insight-indexing-audit-2026-07-08.md`
- Site: `https://temon.kr/`
- Local path inspected: `D:\web\temon`
- Clean repo path inspected: `work\temon`
- Stack signal: Next.js on Vercel

## Dashboard Context

- `temon.kr` was a T2 monitored site in the 2026-07-08 insight/indexing audit.
- GA4 users/views were up about `+51%/+53%`.
- GSC clicks were down about `-58%` and impressions were down about `-54%`.
- Top 30d query cluster remained MBTI/test-list/love-test/idol-test intent.
- Direct GSC page data still included one residual `www.temon.kr/tests/kpop-idol` row, but current public `www` requests redirect to apex.
- The prior action was query/page CTR and ranking recovery, not an emergency index patch.

## Public Indexing Surface

- Home: HTTP 200
- `www.temon.kr/tests/kpop-idol`: HTTP 308 to `https://temon.kr/tests/kpop-idol`, then HTTP 200
- `sitemap.xml`: HTTP 200
- Sitemap URL count: `614`
- Sitemap host consistency: apex URLs present; no `www.temon.kr` sitemap URLs found
- Public headers show `Server: Vercel` and Vercel routing/cache headers.
- No public `cf-ray` or Cloudflare response-header signal was observed.

## Metadata Checks

| URL | Robots | Canonical | Title |
| --- | --- | --- | --- |
| `https://temon.kr/` | `index, follow` | `https://temon.kr` | `테스트 모음, 재미있는 MBTI·연애·아이돌 테스트 - 테몬` |
| `https://temon.kr/tests/kpop-idol` | `index, follow` | `https://temon.kr/tests/kpop-idol` | `아이돌 포지션 테스트 | 무료 성격 테스트 - 테몬` |

## Cloudflare Residue Cleanup

- Public header checks: no Cloudflare signal; the site responds as Vercel/Next.js.
- Local residue found: untracked Cloudflare verification token file:
  - `D:\web\temon\public\cf1bbae352df4a22a23cbf48bb08350d.txt`
- Local cleanup applied: deleted the untracked `cf*.txt` token file.
- Repo residue found in `work\temon`: archived Cloudflare/D1/Workers/Wrangler deployment docs, archived Cloudflare Functions, archived Drizzle/D1 helpers, and a stale raw PSI report.
- Repo cleanup PR:
  - `https://github.com/lsk7209/temon/pull/12`
- Remaining Cloudflare string matches after cleanup:
  - `package-lock.json` optional peer metadata for `@cloudflare/workers-types`
  - This is dependency metadata only, not a direct app dependency or configured Cloudflare service.
- `package.json` has no direct Cloudflare, Wrangler, Workers, or Pages dependency.
- GitHub still attaches a `Cloudflare Pages` external check to PRs. Because Cloudflare is not used for this project, treat that as an external integration residue, not as an active deployment target.

## Local Git State Note

- `D:\web\temon` was already dirty before cleanup with unrelated `.bkit`, `.omc`, and report/state files.
- The Cloudflare token file was untracked and is now absent from local status.
- No tracked file in the dirty local working tree was modified for this pass.
- The deployable cleanup was prepared from the clean `work\temon` clone.

## Assessment

- No immediate public crawl blocker was found: sampled pages are indexable, canonicals use apex, sitemap is apex-only, and `www` redirects to apex.
- The live home and sampled test page metadata already align with the 2026-07-08 title/content plan direction.
- No emergency technical index patch is recommended from this pass.
- The remaining work is CTR/ranking recovery by query/page evidence, plus cleanup of any lingering GitHub/Vercel integration references that still surface Cloudflare as a status provider.

## Next

- Merge the `temon` Cloudflare archive cleanup PR after required non-Cloudflare checks pass.
- Monitor whether the residual `www` GSC row disappears after continued 308-to-apex consolidation.
- Review query/page CTR for MBTI/test-list/love/idol test intent before changing article or test-page titles.
- Continue the insight/indexing queue with `softwa` and `today2424` if further follow-up is needed.
