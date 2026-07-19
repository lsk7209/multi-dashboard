# homeimer.com Canonical and Sitemap Freshness Repair — 2026-07-19

## Result

Completed and publicly verified.

## Pre-repair evidence

- The latest ten WordPress REST posts were published from 2026-07-13 through 2026-07-19, but their `modified` values were from 2026-05-08 or 2026-06-14.
- `sitemap_index.xml` and `post-sitemap.xml` had a maximum `lastmod` of `2026-06-14T04:12:14+00:00`.
- The server-side dry run checked the latest 120 published posts and found 120 candidates where publication time was newer than modification time. Several of the newest posts also lacked an explicit Rank Math canonical meta value.

## Applied scope

- Backup: `/home/homeimer/backups/canonical-sitemap-20260719-0559/targets-before.json` records the exact 120 affected post IDs, publication/modification timestamps, and prior canonical meta values.
- Updated only those 120 published posts: canonical meta was aligned to each permalink and stale modification timestamps were advanced to a truthful current update time.
- Regenerated the existing static sitemap through the active Homeimer sitemap generator.
- No article body, title, category, plugin, theme, DNS, GSC, or AdSense setting was changed.

## Verification

- A post-repair WP-CLI dry run returned `checked=120 candidates=0`.
- Public WordPress REST now shows the five newest posts with 2026-07-19 modification times.
- `https://homeimer.com/sitemap_index.xml` and `https://homeimer.com/post-sitemap.xml` return `200` XML with maximum `lastmod=2026-07-19T06:05:27+00:00`.
- `https://homeimer.com/minimalist-interior-design/` returns `200` and its canonical is `https://homeimer.com/minimalist-interior-design/`.

## Rollback

Use the target snapshot above to restore the affected `post_modified`, `post_modified_gmt`, and `rank_math_canonical_url` values, then rerun the existing static sitemap generator. Do not restore unrelated posts or databases wholesale for this metadata-only repair.
