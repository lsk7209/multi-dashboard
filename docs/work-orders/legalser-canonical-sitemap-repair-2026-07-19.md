# legalser.com Canonical and Sitemap Freshness Repair — 2026-07-19

## Result

Completed and publicly verified.

## Pre-repair evidence

- Recent WordPress REST posts were published on 2026-07-07 through 2026-07-09 while their modification values were from May 2026.
- The sitemap index and post sitemap had a maximum `lastmod` of `2026-06-10T10:03:35+00:00`.
- A server-side dry run checked the latest 120 published posts and found 120 candidates with stale modification metadata or missing/noncanonical Rank Math canonical metadata.

## Applied scope

- Backup: `/home/legalser/codex-backups/canonical-sitemap-20260719-0612-targets-before.json` records all affected IDs, prior modification timestamps, and prior canonical meta values.
- Updated only the latest 120 published posts: canonical meta now matches each permalink and stale modification timestamps were refreshed.
- No article body, title, taxonomy, theme, plugin, GSC, AdSense, DNS, or deployment setting was changed.

## Verification

- Post-repair WP-CLI dry run: `checked=120 candidates=0`.
- Public WordPress REST shows the newest five posts with 2026-07-19 modification times.
- `https://legalser.com/sitemap.xml` and `https://legalser.com/post-sitemap.xml` return `200` XML with `maxLastmod=2026-07-19T06:11:16+00:00`.
- The sampled latest post returns `200` with the expected self-canonical.

## Rollback

Use the target snapshot above to restore only the affected `post_modified`, `post_modified_gmt`, and `rank_math_canonical_url` values. Then rerun the existing sitemap owner. Do not restore unrelated records or a full database for this metadata-only repair.
