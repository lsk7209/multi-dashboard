# Technical SEO Audit - homeimer / legalser - 2026-07-08

## Evidence

- Dashboard refresh command: `pnpm stats:update`
- Refresh result: success after local `GCP_SA_KEY_FILE` mapping to the existing service-account JSON.
- Fresh snapshot: `data/site-stats.json`, `generatedAt=2026-07-08T01:11:20.285Z`
- Public HTTP checks: direct fetch of home, `robots.txt`, sitemap, sitemap children, RSS candidates, `ads.txt`, and sample post URLs.
- Source policy: direct project/dashboard/public collection only. No gmail-digest signal used.

## homeimer.com

Status: T2 canonical patch applied and verified.

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
- Dashboard metrics: GA4 7d users 4, 7d views 5; GSC 7d clicks 0, impressions 3; submitted URLs 538; sitemap warnings/errors 0/0.
- Sample post issue: sitemap URLs are pretty permalinks, but canonical outputs query IDs:
  - `https://homeimer.com/low-maintenance-seasonal-decor-rotation-comparison-mixed-materials-or-flexible-storage/` canonical `https://homeimer.com/?p=4936`
  - `https://homeimer.com/sustainable-indoor-plant-focal-wall-case-study-a-practical-room-refresh/` canonical `https://homeimer.com/?p=4938`

Findings:

- T2 fixed 2026-07-08: Post canonical/permalink mismatch. This could dilute indexing signals because Google saw sitemap URLs and canonical URLs disagreeing.
- T2 evidence: Rank Math `rank_math_canonical_url` post meta contained exact `https://homeimer.com/?p=<post_id>` values while WordPress permalink structure was `/%postname%/`.
- T3/content: no article body or title edits from this audit.

Applied patch:

1. Backup created before apply: `/home/homeimer/backups/site-optimizer-canonical-20260708-102458`.
   - Included DB export, active plugin list, active theme list, `theme_mods_astra`, `wp-content/mu-plugins`, and active `astra` theme archive.
2. Updated Rank Math canonical meta only where the old value exactly matched `https://homeimer.com/?p=<post_id>`.
   - Published posts updated: 272.
   - Scheduled posts updated: 28, using slug URL because WordPress returns query permalinks for future posts before publication.
   - Remaining query canonical meta after patch: 0.
3. Flushed WordPress cache and LiteSpeed cache.
4. Public HTML verification after cache purge:
   - `https://homeimer.com/low-maintenance-seasonal-decor-rotation-comparison-mixed-materials-or-flexible-storage/` canonical now equals the pretty permalink.
   - `https://homeimer.com/sustainable-indoor-plant-focal-wall-case-study-a-practical-room-refresh/` canonical now equals the pretty permalink.

Follow-up:

1. Monitor GSC discovery/indexing deltas for `homeimer.com` after the next crawl cycle.
2. If impressions remain flat, pull GSC query/page deltas before doing content/title work.

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
- Dashboard metrics: GA4 7d users 6, 7d views 8; GSC 7d clicks 1, impressions 44; submitted URLs 485; sitemap warnings/errors 0/0.
- Sample posts: canonical equals pretty permalink, indexable robots, meta descriptions present.

Findings:

- T1: No public crawl/indexing blocker found in sampled audit.
- T2: Robots and dashboard use different sitemap entry names (`sitemap_index.xml` vs `sitemap.xml`) but both resolve as sitemap indexes; optional normalization only.
- T2: GSC traffic is low but not technically blocked: snapshot shows 1 click / 44 impressions over last 7 days.
- T3/content: content/title improvement should wait for fresh GSC query/page deltas.

Next actions:

1. Prioritize `homeimer.com` canonical fix after backup approval/path confirmation.
2. For `legalser.com`, pull fresh GSC query/page deltas once dashboard credentials are restored; no production patch is justified by public technical SEO checks alone.
