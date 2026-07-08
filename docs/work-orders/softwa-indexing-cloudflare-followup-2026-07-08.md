# softwa.kr Indexing And Cloudflare Follow-Up - 2026-07-08

## Evidence

- Dashboard snapshot: `data/site-stats.json`, `generatedAt=2026-07-08T01:11:20.285Z`
- Source policy: direct dashboard/public/local/WP evidence only; no `gmail-digest`
- Prior audit source: `docs/insight-indexing-audit-2026-07-08.md`
- Related work order: `docs/work-orders/softwa-powertoys-meta-refresh-2026-07-08.md`
- Site: `https://softwa.kr/`
- Local paths inspected:
  - `D:\web\softwa`
  - `D:\web\softwakr`
- Stack signal: WordPress on LiteSpeed

## Dashboard Context

- `softwa.kr` was a T2 monitored site in the 2026-07-08 insight/indexing audit.
- GA4 users were stable, while views were down about `-17.9%`.
- GSC clicks were down about `-68.8%` and impressions were down about `-27.0%`.
- Direct GSC rows were concentrated on software-help posts such as ROFL replay, GitHub Desktop, PowerToys, and Claude Desktop topics.
- No public crawl block was found in the audit, so the selected action was page/query refresh and CTR/title handoff rather than an emergency index patch.

## Public Indexing Surface

- Home: HTTP 200
- `robots.txt`: HTTP 200
- `sitemap.xml`: HTTP 301 to `https://softwa.kr/sitemap_index.xml`, then HTTP 200
- `sitemap_index.xml`: HTTP 200
- Sample page `https://softwa.kr/microsoft-powertoys-trouble-068/`: HTTP 200
- Public headers show `Server: LiteSpeed`, `X-Powered-By: PHP/8.0.30`, and `X-LiteSpeed-Cache`.
- No public `cf-ray` or Cloudflare response-header signal was observed.

## Robots

- Global crawl is allowed except `/wp-admin/`, with `admin-ajax.php` allowed.
- AI crawler policy is explicit:
  - allowed: `GPTBot`, `ClaudeBot`, `anthropic-ai`, `PerplexityBot`, `OAI-SearchBot`, `Google-Extended`, `Yeti`, `Daumoa`
  - blocked: `Bytespider`
- Sitemap line: `https://softwa.kr/sitemap_index.xml`

## Cloudflare Residue Cleanup

- Previous cleanup in the PowerToys work order removed blank LiteSpeed Cloudflare CDN option rows from WordPress.
- Follow-up local token search found no `cf*.txt` verification token files under the inspected local paths.
- Follow-up infrastructure keyword search found no `wrangler`, `pages.dev`, `@cloudflare`, `CLOUDFLARE`, `D1`, or `cdn-cgi` deployment residue under the inspected local paths.
- The broad `Cloudflare` matches under `D:\web\softwakr` are Cloudflare WARP software article plans/content, not hosting, DNS, Workers, Pages, or CDN configuration. They are content-topic references and should not be deleted as infrastructure residue.

## Assessment

- No immediate public crawl blocker was found.
- No new Cloudflare infrastructure residue was found after the prior LiteSpeed option cleanup.
- No deployable code patch is recommended from this pass.
- Current recovery work should remain query/page CTR monitoring after the PowerToys meta refresh.

## Next

- Recheck GSC CTR after the next data window for the PowerToys target page and other software-help rows.
- Keep Cloudflare WARP content references only when they are article/topic references, not service configuration.
