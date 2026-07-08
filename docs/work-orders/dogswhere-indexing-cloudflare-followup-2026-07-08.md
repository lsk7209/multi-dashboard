# dogswhere.com Indexing And Cloudflare Follow-Up - 2026-07-08

## Evidence

- Dashboard snapshot: `data/site-stats.json`, `generatedAt=2026-07-08T01:11:20.285Z`
- Source policy: direct dashboard/public/local evidence only; no `gmail-digest`
- Prior audit source: `docs/insight-indexing-audit-2026-07-08.md`
- Site: `https://dogswhere.com/`
- Local path inspected: `D:\web\dogswherecom`
- Stack signal: Next.js on Vercel

## Dashboard Context

- `dogswhere.com` was a T2 monitored site in the 2026-07-08 insight/indexing audit.
- GA4 users/views were down about `-34%`.
- GSC clicks, impressions, and average position improved, so this was not treated as an indexing emergency.
- Prior GSC page data still included residual `www.dogswhere.com` URLs, but current public `www` requests redirect to apex.
- The prior action was to review GA4 channel/source and product demand rather than apply an index patch.

## Public Indexing Surface

- Home: HTTP 200
- `www.dogswhere.com`: HTTP 307 to `https://dogswhere.com/`, then HTTP 200
- `robots.txt`: HTTP 200
- `sitemap.xml`: HTTP 200
- Sitemap URL count: `346`
- Sitemap host consistency: apex URLs present; no `www.dogswhere.com` sitemap URLs found
- Public headers show `Server: Vercel`, `X-Powered-By: Next.js`, and Vercel cache headers.
- No public `cf-ray` or Cloudflare response-header signal was observed.

## Metadata Checks

| URL | Robots | Canonical | Title |
| --- | --- | --- | --- |
| `https://dogswhere.com/` | `index, follow` | `https://dogswhere.com` | `어디가개 - 반려견 동반 가능 장소 검색` |
| `https://dogswhere.com/test/mung-bti` | `index, follow` | `https://dogswhere.com/test/mung-bti` | `멍BTI 테스트 - 강아지 여행 성향 검사 \| 어디가개 \| 어디가개` |

## Robots

- Global crawl is allowed except `/api/` and `/_next/`.
- Googlebot is allowed except `/api/` and `/_next/`.
- AI crawler policy is explicit:
  - allowed: `GPTBot`, `ClaudeBot`, `PerplexityBot`, `OAI-SearchBot`, `Google-Extended`, `Yeti`, `Daumoa`, `anthropic-ai`
  - blocked: `Bytespider`
- Sitemap line: `https://dogswhere.com/sitemap.xml`

## Cloudflare Residue Cleanup

- Public header checks: no Cloudflare signal; the site responds as Vercel/Next.js.
- Local residue found: untracked Cloudflare verification token file:
  - `D:\web\dogswherecom\public\cf1bbae352df4a22a23cbf48bb08350d.txt`
- Local cleanup applied: deleted the untracked `cf*.txt` token file.
- Remaining Cloudflare string matches after cleanup:
  - `package-lock.json` optional peer metadata for `@cloudflare/workers-types`
  - This is from dependency metadata, not a direct app dependency or configured Cloudflare service.
- `package.json` has no direct Cloudflare, Wrangler, Workers, or Pages dependency.

## Local Git State Note

- `D:\web\dogswherecom` was already dirty before cleanup with modified Python `__pycache__` files and untracked content-work files under `scripts/content/`, `.omc/`, and `.omx/`.
- The Cloudflare token file was untracked and is now absent from `git status`.
- No tracked source file was modified for this pass.

## Assessment

- No immediate public crawl blocker was found: robots, canonical, sitemap, and sampled page metadata are indexable.
- The GA4 drop is likely not a search indexing outage because GSC trend improved in the dashboard audit.
- No deployable code patch is recommended from this pass.

## Next

- Review GA4 acquisition/channel source for the traffic drop before changing SEO templates.
- If GSC continues to surface `www` URLs, monitor until the 307-to-apex consolidation settles; sitemap is already apex-only.
- Continue the insight/indexing queue with `temon`, `softwa`, and `today2424`.
