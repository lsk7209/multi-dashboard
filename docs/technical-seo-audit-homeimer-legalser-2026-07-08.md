# Technical SEO Audit - homeimer / legalser - 2026-07-08

## Evidence

- Dashboard refresh command: `pnpm stats:update`
- Refresh result: failed, `GCP_SA_KEY_JSON` missing from readable setup sources.
- Fallback snapshot: `data/site-stats.json`, `generatedAt=2026-07-07T23:39:59.111Z`
- Public HTTP checks: direct fetch of home, `robots.txt`, sitemap, sitemap children, RSS candidates, `ads.txt`, and sample post URLs.
- Source policy: direct project/dashboard/public collection only. No gmail-digest signal used.

## homeimer.com

Status: needs T2 patch plan before production change.

Evidence:

- Home: 200, canonical `https://homeimer.com/`, robots `index, follow`, meta description present.
- Robots: 200, sitemap line points to `https://homeimer.com/sitemap_index.xml`, no global disallow.
- Sitemap index: 200, children checked:
  - `post-sitemap.xml`: 527 URLs
  - `page-sitemap.xml`: 6 URLs
  - `category-sitemap.xml`: 6 URLs
- RSS: `/feed/` 200 with items; `/feed.xml` and `/rss.xml` 404, acceptable for WordPress if RSS discovery points to `/feed/`.
- AdSense/ads.txt: loader detected, `ads.txt` 200 with default publisher.
- GA4: detected on sampled pages.
- Sample post issue: sitemap URLs are pretty permalinks, but canonical outputs query IDs:
  - `https://homeimer.com/low-maintenance-seasonal-decor-rotation-comparison-mixed-materials-or-flexible-storage/` canonical `https://homeimer.com/?p=4936`
  - `https://homeimer.com/sustainable-indoor-plant-focal-wall-case-study-a-practical-room-refresh/` canonical `https://homeimer.com/?p=4938`

Findings:

- T2: Post canonical/permalink mismatch. This can dilute indexing signals because Google sees sitemap URL and canonical URL disagree.
- T2: Confirm SEO plugin/permalink ownership in WordPress before changing canonical output.
- T3/content: no article body or title edits from this audit.

Patch plan:

1. Take WordPress backup before apply: database, active theme, plugins, and mu-plugins.
2. Inspect canonical source: Rank Math/Yoast/custom theme/mu-plugin/permalink settings.
3. Fix canonical to emit `get_permalink()` pretty URL for posts.
4. Purge cache, fetch two sampled posts, confirm canonical equals final URL.
5. Resubmit sitemap or request recrawl for changed sample URLs after verification.

## legalser.com

Status: no emergency technical SEO block found. Monitor and improve by evidence.

Evidence:

- Home: 200, canonical `https://legalser.com/`, robots `index, follow`, meta description present.
- Robots: 200, sitemap line points to `https://legalser.com/sitemap_index.xml`, no global disallow.
- Sitemap fetched from dashboard path `https://legalser.com/sitemap.xml`: 200 sitemap index, children checked:
  - `post-sitemap.xml`: 450 URLs
  - `page-sitemap.xml`: 7 URLs
  - `category-sitemap.xml`: 30 URLs
- RSS: `/feed/` 200 with items; `/feed.xml` and `/rss.xml` 404, acceptable for WordPress if RSS discovery points to `/feed/`.
- AdSense/ads.txt: loader detected, `ads.txt` 200 with default publisher.
- GA4: detected on sampled pages.
- Sample posts: canonical equals pretty permalink, indexable robots, meta descriptions present.

Findings:

- T1: No public crawl/indexing blocker found in sampled audit.
- T2: Robots and dashboard use different sitemap entry names (`sitemap_index.xml` vs `sitemap.xml`) but both resolve as sitemap indexes; optional normalization only.
- T2: GSC traffic is low but not technically blocked: snapshot shows 1 click / 44 impressions over last 7 days.
- T3/content: content/title improvement should wait for fresh GSC query/page deltas.

Next actions:

1. Prioritize `homeimer.com` canonical fix after backup approval/path confirmation.
2. For `legalser.com`, pull fresh GSC query/page deltas once dashboard credentials are restored; no production patch is justified by public technical SEO checks alone.
