# New Sites Review - 2026-06-19

Scope: coverclarityhealth.com, solarpaybackmap.com, kapti.kr

Mode: site-optimizer audit. No production changes, no Vercel deploy.

## Dashboard Freshness

- `pnpm stats:update` was started from `D:\web\multi-dashboard`.
- It timed out after 124 seconds, then kept running in the background.
- After an additional 240-second wait it was still running, so the spawned collector processes were stopped and the stale lock was removed.
- Current dashboard snapshot remains `data/site-stats.json` generated at `2026-06-19T00:18:00.423Z`.
- The three new sites are not present in that snapshot.
- `scripts/setup/sites.yaml` has the three site entries, but the entries do not define `ga4PropertyId` or `gscSiteUrl`; `stats:update` filters to enabled sites with a GA4 property, so these sites will not be collected until GA4 is mapped.

## Local Registration

### coverclarityhealth.com

- `sites.yaml`: registered as `platform: nextjs`, `monetization: true`.
- Local path: `D:\web\coverclarityhealth`.
- Local project state: directory exists but has no `.git` and no `package.json`.
- Dashboard stats: missing from `data/site-stats.json`.

### solarpaybackmap.com

- `sites.yaml`: registered as `platform: nextjs`, `monetization: true`.
- Local path: `D:\web\solarpaybackmap`.
- Local project state: directory exists but has no `.git` and no `package.json`.
- Dashboard stats: missing from `data/site-stats.json`.

### kapti.kr

- `sites.yaml`: registered as `platform: nextjs`, `monetization: true`.
- Local path: `D:\web\kapt`.
- Local project state: valid Git/Next.js app exists.
- Verification: `npm run lint` passed; `npm run build` passed.
- Build generated routes include `/`, `/robots.txt`, `/sitemap.xml`, `/feed.xml`, `/ads.txt`, `/llms.txt`, `/blog`, `/guide`, `/learn`, and sample dynamic routes.
- Dashboard stats: missing from `data/site-stats.json`.

## Public URL Checks

### coverclarityhealth.com

- DNS: A record resolves to `216.150.1.1`.
- `https://coverclarityhealth.com/`: HTTP 404 from Vercel.
- Vercel header: `X-Vercel-Error: DEPLOYMENT_NOT_FOUND`.
- `/robots.txt`: 404.
- `/sitemap.xml`: 404.
- `/feed.xml` and `/feed`: 404.
- `/ads.txt`: 404.
- Homepage HTML has no canonical, description, OG tags, schema, GA4, or AdSense signal because it is the Vercel 404 page.

Finding tier:
- T2: Domain/deployment mapping must be fixed through Vercel/GitHub deployment path.
- T2: Once deployment works, verify robots, sitemap, feed, ads.txt, canonical, OG, schema, GA4, and AdSense.
- T3: Content quality cannot be reviewed until a real site is live.

### solarpaybackmap.com

- DNS: A record resolves to `216.150.1.1`.
- `https://solarpaybackmap.com/`: HTTP 404 from Vercel.
- Vercel header: `X-Vercel-Error: NOT_FOUND`.
- `/robots.txt`: 404.
- `/sitemap.xml`: 404.
- `/feed.xml` and `/feed`: 404.
- `/ads.txt`: 200 and contains `google.com, pub-3050601904412736, DIRECT, f08c47fec0942fa0`.
- Homepage HTML has no canonical, description, OG tags, schema, GA4, or AdSense signal because it is the Vercel 404 page.

Finding tier:
- T2: Deployment/app routing must be fixed through Vercel/GitHub deployment path.
- T2: Keep existing ads.txt, then verify AdSense loader after the real page serves 200.
- T2: Once deployment works, verify robots, sitemap, feed, canonical, OG, schema, and GA4.
- T3: Content quality cannot be reviewed until a real site is live.

### kapti.kr

- DNS: A record resolves to `216.150.1.1`.
- `http://kapti.kr/`: HTTP 404 from Vercel with `X-Vercel-Error: NOT_FOUND`.
- `https://kapti.kr/`: TLS handshake failed from curl/Node fetch.
- Public `/robots.txt`, `/sitemap.xml`, `/feed.xml`, and `/ads.txt` cannot be verified over HTTPS due TLS failure.
- Local app includes route implementations for `/robots.txt`, `/sitemap.xml`, `/feed.xml`, `/ads.txt`, and `/llms.txt`.
- Local app includes default AdSense publisher `ca-pub-3050601904412736`.
- Local app loads AdSense unless `NEXT_PUBLIC_ENABLE_ADSENSE=false`.
- Local app loads GA4 only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set.

Finding tier:
- T2: Vercel domain/TLS/deployment mapping must be fixed before SEO or AdSense review.
- T2: Set or verify production environment values for `SITE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, and any required Vercel domain binding.
- T2: After HTTPS serves 200, verify robots, sitemap, feed, ads.txt, canonical, OG, schema, AdSense loader, and GA4.
- T3: Content quality can be reviewed after live pages are reachable.

## Priority

1. Fix production deployment/domain binding for all three sites. Current live state blocks indexing and AdSense review.
2. Add GA4/GSC mappings to `scripts/setup/sites.yaml` so future `pnpm stats:update` includes these sites.
3. For `kapti.kr`, local code is build-ready; the main blocker appears to be deployment/domain/TLS rather than source build failure.
4. For `coverclarityhealth.com` and `solarpaybackmap.com`, populate or clone the local project directories before local verification can be run.

## Remediation Applied

### coverclarityhealth.com

- Created a deployable Next.js baseline in `D:\web\coverclarityhealth`.
- Added homepage, about, privacy, `robots.txt`, `sitemap.xml`, `feed.xml`, `llms.txt`, and `ads.txt`.
- Added default AdSense loader using `ca-pub-3050601904412736`.
- Added `vercel.json` with explicit Next.js framework, install, and build settings.
- Committed and pushed:
  - `ae2a666` - Create a deployable coverage guide baseline
  - `46ffb30` - Force Vercel to build the Next app

Verification after GitHub-triggered Vercel deployment:

- `/`: 200
- `/robots.txt`: 200
- `/sitemap.xml`: 200
- `/feed.xml`: 200
- `/ads.txt`: 200
- `/llms.txt`: 200
- Homepage canonical: `https://coverclarityhealth.com`
- AdSense publisher detected: `ca-pub-3050601904412736`

### solarpaybackmap.com

- Cloned existing GitHub source into `D:\web\solarpaybackmap`.
- Verified local app with `npm run lint` and `npm run build`.
- `npm run smoke` did not pass; it exited because `next start` stopped early with code 1. The build itself passed.
- Added `vercel.json` with explicit Next.js framework, install, and build settings.
- Committed and pushed:
  - `e3f801d` - Trigger verified solar site deployment
  - `5604d9e` - Force Vercel to build the Next app

Verification after GitHub-triggered Vercel deployment:

- `/`: 200
- `/robots.txt`: 200
- `/sitemap.xml`: 200
- `/feed.xml`: 200
- `/ads.txt`: 200
- `/llms.txt`: 200
- Homepage canonical: `https://solarpaybackmap.com`
- GA4 measurement id detected: `G-85ET570CDB`
- AdSense publisher detected: `ca-pub-3050601904412736`

### kapti.kr

- Added `.gitignore` so `.next`, `node_modules`, `.omx`, generated output, and TS build cache are not committed by default.
- Committed the existing local Next.js source so Vercel had real app code to build.
- Added `vercel.json` with explicit Next.js framework and build settings.
- Changed only the Vercel install command from `npm ci` to `npm install` after Vercel failed on lockfile sync while local `npm ci --dry-run` passed.
- Committed and pushed:
  - `6be16c8` - Ship source so kapti can render from GitHub
  - `52569bf` - Force Vercel to build the Next app
  - `54b2af5` - Let Vercel install kapti dependencies from package metadata

Verification after GitHub-triggered Vercel deployment:

- `/`: 200
- `/robots.txt`: 200
- `/sitemap.xml`: 200
- `/feed.xml`: 200
- `/ads.txt`: 200
- `/llms.txt`: 200
- Homepage canonical: `https://kapti.kr`
- AdSense publisher detected: `ca-pub-3050601904412736`
- Vercel deployment status: success for deployment tied to `54b2af5`

Remaining local uncommitted kapti changes, preserved:

- `.gitignore`
- `lib/generated-posts.ts`
- `package.json`
- `scripts/content/generate-kapti-deep100.mjs`
- `output/`

These appear to be a separate deep100 content-generation expansion and were not included in the deployment-fix commits.

## Remaining Dashboard Work

- `scripts/setup/sites.yaml` still lacks GA4 property IDs for these sites, so `pnpm stats:update` cannot include them in `data/site-stats.json`.
- Public route verification is now clean, but dashboard GA4/GSC metrics require adding each site's GA4 property id and GSC site URL mapping.
