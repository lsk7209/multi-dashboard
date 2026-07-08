# Insight Drop / Indexing Audit - 2026-07-08

## Evidence

- Dashboard refresh command: `pnpm stats:update`
- Refresh result: success after local `GCP_SA_KEY_FILE` mapping to the existing service-account JSON.
- Fresh snapshot: `data/site-stats.json`, `generatedAt=2026-07-08T01:11:20.285Z`
- Public HTTP checks: direct fetch of home, `robots.txt`, sitemap, and sample sitemap URLs on 2026-07-08 KST.
- Source policy: direct project/dashboard/public collection only. No gmail-digest signal used.

## Summary

| Site | Priority | Finding | Indexing Surface |
| --- | --- | --- | --- |
| todaypharm.kr | T2 applied | GA4 active users -73.7% WoW, but page views +103.9%; GSC 7d/30d clicks and impressions are zero despite 49,459 submitted URLs. URL Inspection showed Google's last crawl still remembered `https://www.todaypharm.kr/` as the home canonical from 2026-04-23, while the current live site uses apex. | Home 200, robots 200, sitemap 200, robots sitemap ok, sample pages `index, follow`, canonical present. Static AI/llms host signals were normalized to apex in `today_yakuk` PR #4, production verified, and the sitemap was resubmitted to GSC. |
| 2mlab.kr | T2 monitored | GA4 active users -79.6%, views -64.6%; GSC 30d has only 3 impressions, all on the home URL. URL Inspection shows the home URL is `Submitted and indexed`, but `/services/`, `/blog/`, and sampled post URLs are `URL is unknown to Google`. | Home 200, robots 200, sitemap index 200, internal links present, sample pages `index, follow`, canonical present. GSC sitemap index was resubmitted on 2026-07-08 after sitemap contents showed `submitted=2,585 web / 117 image`, `indexed=0`, `errors=0`, `warnings=0`. |
| dogswhere.com | T2 monitored | GA4 users/views both down about -34%, but GSC clicks/impressions and average position improved. Direct GSC page data still contains residual `www.dogswhere.com` URLs, but current `www` requests 307 to apex and apex canonical is present. | Home 200, robots 200, sitemap 200 with 346 URLs, sample pages `index, follow`, canonical present. No indexing outage found; treat as non-search traffic/product demand review. |
| temon.kr | T2 monitored | GA4 users/views up about +51/+53%, but GSC clicks -58% and impressions -54%. Top 30d queries remain `mbti 테스트`, `테스트 모음`, `재밌는 테스트`, and `아이돌 테스트`; direct GSC page data contains one residual `www.temon.kr/tests/kpop-idol` URL, but current `www` requests 308 to apex. | Home 200, robots 200, sitemap 200 with 613 URLs, sample pages `index, follow`, canonical present. No emergency technical patch found; next work is query/page CTR and ranking recovery. |
| softwa.kr | T2 monitored | GA4 users stable but views -17.9%; GSC clicks -68.8%, impressions -27.0%. Direct GSC rows are concentrated on specific software-help posts such as ROFL replay, GitHub Desktop, PowerToys, and Claude Desktop topics. | Home 200, robots 200, sitemap index 200, sample pages indexable, canonical present. No public crawl block found; next work is page/query refresh and CTR/title handoff, not a technical index fix. |
| today2424.kr | T2 monitored | GA4 users -41.2%; GSC clicks -40%, impressions -27.3%. Direct GSC rows are concentrated on lease/move-out notice templates and small-space living posts, led by `/blog/lease-end-notice-template`. | Home 200, robots 200, sitemap 200 with 354 URLs, sample pages `index, follow`, canonical present. No public crawl block found; next work is page/query refresh and CTR/title handoff. |

## Next Actions

1. For `todaypharm.kr`, monitor GSC after the 2026-07-08 sitemap resubmission. Current GSC sitemap state was `submitted=49,459`, `indexed=0`, `errors=0`, `warnings=0`, then changed to `isPending=true` after resubmission.
2. For `2mlab.kr`, monitor GSC after the 2026-07-08 sitemap index resubmission. No immediate public crawl/canonical blocker was found; the current issue is Google not discovering/indexing child URLs from the sitemap/internal links yet.
3. For `dogswhere.com`, do not run an index emergency patch. GSC trend is up; review GA4 channel/source and product demand instead.
4. For `temon.kr`, `softwa.kr`, and `today2424.kr`, route next work to query/page refresh and CTR/title planning. Current public crawl checks do not justify emergency index fixes.
5. Do not edit article bodies/titles from this audit. Route content/title recovery to the appropriate content/title workflow after query/page evidence.
