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
| todaypharm.kr | T2 | GA4 active users -73.7% WoW, but page views +103.9%; GSC 7d/30d clicks and impressions are zero despite 49,459 submitted URLs. Likely search visibility/property/query coverage issue rather than crawl block. | Home 200, robots 200, sitemap 200, robots sitemap ok, sample pages `index, follow`, canonical present. |
| 2mlab.kr | T2 | GA4 active users -79.6%, views -64.6%; GSC zero clicks/impressions. Needs deeper GSC property and sitemap child inspection. | Home 200, robots 200, sitemap index 200, sample pages `index, follow`, canonical present. |
| dogswhere.com | T2 | GA4 users/views both down about -34%; GSC clicks/impressions up, so not an indexing outage. Likely traffic/channel/content demand issue. | Home 200, robots 200, sitemap 200 with 346 URLs, sample pages `index, follow`, canonical present. |
| temon.kr | T2 | GA4 users/views up about +51/+53%, but GSC clicks -58% and impressions -54%; SEO visibility drop masked by direct/social/app traffic. | Home 200, robots 200, sitemap 200 with 613 URLs, sample pages `index, follow`, canonical present. |
| softwa.kr | T2 | GA4 stable users but views -17.9%; GSC clicks -68.8%, impressions -27.0%; sitemap submitted date is stale compared with downloaded date. | Home 200, robots 200, sitemap index 200, sample pages indexable, canonical present. |
| today2424.kr | T2 | GA4 users -41.2%; GSC clicks -40%, impressions -27.3%; no public crawl block found. | Home 200, robots 200, sitemap 200 with 354 URLs, sample pages `index, follow`, canonical present. |

## Next Actions

1. For `todaypharm.kr` and `2mlab.kr`, verify GSC property mapping, sitemap child coverage, and whether zero GSC rows are caused by property mismatch or low search visibility.
2. For `temon.kr`, `softwa.kr`, and `today2424.kr`, pull top query/page deltas before content or title work. Current public crawl checks do not justify emergency index fixes.
3. For `dogswhere.com`, treat as traffic/product demand review first; indexing surface is healthy and GSC trend is not down.
4. Do not edit article bodies/titles from this audit. Route content/title recovery to the appropriate content/title workflow after query/page evidence.
