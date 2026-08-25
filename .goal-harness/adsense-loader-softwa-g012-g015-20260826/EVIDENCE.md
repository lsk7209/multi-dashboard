# G015 EVIDENCE

## Baseline

- Dashboard clean-workspace refresh at `2026-08-25T21:09:24.678Z`: 99 sites, GA4 failures 0, GSC failures 0, sitemap failures 0, loader missing only caregos after correcting seven homepage false negatives.
- Live article HTML confirmed a loader for chatgipt.kr, estat.kr, sssaass.com, todayshops.kr, insupang.com, educaer.com, and healthgotoo.com.
- caregos.com is an intentional static review hold: noindex, robots Disallow, empty sitemap, loader-free.
- softwa.kr public inventory: 639 published posts, 112 future posts, 21 nonempty categories; local 600-row factory source has 596/600 repeated normalized H2 structures.

## softwa.kr production freeze

- Before mutation: future=112, draft=0.
- Remote WXR backup: `/home/softwa/g015-softwa-before-freeze-20260826T0620KST.xml`, SHA-256 `6f4661d0984708efcc8cf72c049d79e007de4cbef38b01a353721b7eccc27697`.
- Exact future inventory: `/home/softwa/g015-softwa-future-posts-20260826T0619KST.csv`, SHA-256 `6133af7b82057bc37246dcd99a370601fef441b51f7f64ccc5b81a5128ef8f52`.
- Mutation: only the 112 IDs from the inventory changed from `future` to `draft`.
- After mutation: future=0, draft=112, publish=640. One scheduled post became public between the earlier 639-post audit and the freeze; it was not destructively unpublished.
- Rollback: use the CSV IDs and original dates/statuses or the WXR export. No published URL was deleted.

## Validation

- Final snapshot `2026-08-25T21:30:34.254Z`: 113 sites, confirmed AdSense loader missing=0, confirmed ads.txt failure=0, GA4 failure=0. Three GSC auth errors remain separate permission issues (`kang4`, `picturebooks`, `lim01-soonsaak-co`).
- `pnpm test`: 33 files, 291 tests passed.
- `pnpm lint`: passed.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed; Next.js production routes compiled and prerendered.
- Crepika G012 safe-publication patch: commit `bf33657`, four preflight tests passed, lint passed, production build/SEO gates passed.
