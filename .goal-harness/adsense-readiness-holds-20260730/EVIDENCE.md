# Evidence

## Scope
- Branch: `fix/adsense-readiness-holds-20260730`
- Base: `cd63c807b1c97963a9a13284c0f32d7bc5a6d1b8`
- Targets: GradientTrail, Chatgipt, Nongsusan; regression guards for Caregos and Picturebooks
- Production DB/site mutation: none allowed

## Findings
- `discoverSamplePages` always starts with the homepage and sitemap samples; `classifySite` blocks when any sampled page lacks a loader. A configured reader sample therefore does not currently protect intentional home/hub exclusions.
- Collector `CollectionStatus` and `resolveEditorialAdsenseHold` support only `editorial_hold`; Nongsusan has no monitoring hold configured.
- Remediation `isAdsenseTelemetryHealthy` treats `editorial_hold` as unhealthy, so Caregos and any future hold can enter `ordinary_adsense_proof`.
- Dashboard labels, ops intel, and fleet-plan skip logic explicitly know only `editorial_hold`; a typed `launch_hold` requires coordinated display and low-severity handling.
- Latest deployed evidence before this change is snapshot `2026-07-30T10:58:20.646Z` with 104 sites; GradientTrail/Chatgipt/Shotsetup are healthy, Nongsusan is `missing_config`, Caregos is `editorial_hold`, and Picturebooks is non-monetized.

## Validation
- Added pure readiness helpers and tests: configured reader samples precede sitemap samples; loader is required only on configured samples when present.
- Added typed `launch_hold` schema/collector state with a launch/publish/production-data gate message; configured Nongsusan accordingly.
- Remediation queue now treats `editorial_hold` and `launch_hold` as intentional healthy telemetry and is import-safe for unit tests.
- Dashboard table/page, direct ops, and fleet refresh classification display or preserve the new hold without escalating it as a defect.
- Targeted tests: 7 files, 110 tests PASS; follow-up focused tests 3 files, 13 tests PASS.
- Changed-file ESLint: PASS.
- sites.yaml schema/value assertion: PASS for Nongsusan launch hold, Caregos editorial hold, and both reader samples.
- `pnpm type-check`: PASS.
- Full `pnpm test`: PASS, 33 files and 291 tests.
- `pnpm build`: PASS.
- Live targeted readiness: targets=3, blocked=0; Chatgipt review 85, Shotsetup review 90, GradientTrail needs_patch 92. All loader issues are absent; configured reader pages detect publisher loader and home/hub pages are explicitly non-required.


## Code deployment
- Scoped commit: `75bf398`.
- PR #52: https://github.com/lsk7209/multi-dashboard/pull/52
- Vercel Preview: PASS; merge state CLEAN.
- Independent reviewer: APPROVE; no blocking correctness, security, or scope findings.
- Squash merge: `242a1db56f4265c68b6603aa7eddbd63f2ad1524` at `2026-07-30T11:50:57Z`.
- Git-connected Vercel production: SUCCESS at `2026-07-30T11:51:25Z`.
- Public alias `https://multi-dashboard-one.vercel.app/?v=242a1db`: HTTP 200, 1,167,678 bytes, and target/hold/permanent-exclusion rows rendered.


## Post-deploy final evidence
- Final `pnpm stats:update` completed successfully for 104 sites at snapshot `2026-07-30T12:28:53.528Z`: GA4 failed 0, GSC failed 0, sitemap failed 0, AdSense transient 0, ads.txt transient 0.
- Final target states: GradientTrail/Chatgipt/Shotsetup/Wedfairguide `adsense=ok` and `adsTxt=ok`; Nongsusan `adsense=launch_hold`; Caregos `adsense=editorial_hold`; Picturebooks `monetization=false`.
- Final queue regenerated against the same snapshot: reviewed 89, problem rows 1, ordinary proof 1. The only ordinary row is `mohana`; Nongsusan, Caregos, GradientTrail, Chatgipt, Shotsetup, Wedfairguide, and Picturebooks are absent.
- Combined readiness artifact generated at `2026-07-30T12:29:25.646Z` against the exact final collector snapshot: four targets, blocked 0, loader failures 0. Chatgipt review 84, Shotsetup review 89, GradientTrail needs_patch 90 for non-loader content surfaces, and Wedfairguide review 92.
- Wedfairguide date pages remain above the needs_patch threshold (`this-week` 538 words, `this-month` 507 words); `/fairs` image-alt checks pass. The remaining `<800` informational thin-page text does not trigger `classifySite` needs_patch, whose threshold is `<500`.
- Wedfairguide dashboard configuration parses as `platform=nextjs` with `contentSource.type=github-next`, Vercel label, local repository path, and `lsk7209/wedding-fair-decision-hub`; stale WordPress metadata is removed.

## P1 execution: Wedfairguide
- Selected from fresh 104-site evidence because higher-ranked alternatives were console-state-unverified while Wedfairguide had reproducible trust/content defects.
- Pre-change readiness: needs_patch 89; date hubs had 149/130 visible tokens and `/fairs` had 103 images without alt text.
- Implemented range-specific planning guidance, descriptive image alt text, advertising/affiliate disclosure, footer link, and sitemap entry in six scoped files.
- Repository checks passed: typecheck, build (152 pages), content validation, pSEO validation, SEO audit, AdSense audit, and answer audit.
- PR #47: https://github.com/lsk7209/wedding-fair-decision-hub/pull/47; squash merge `a746e2953cddb0dca96214f2cf3fc1e686abe637`; Git-connected Vercel production succeeded at `2026-07-30T12:18:43Z`.
- Live disclosure, footer link, and range-specific guide checks returned HTTP 200. No production DB exists or was written.

## Read-only adjacent checks
- Read-only `pnpm ops:api-data-freshness` reported 28 inventoried Vercel API-data sites: measured 0, site probe required 14, source check required 11, manual review 3, blocked 0. The command reported no production/CMS/Search Console/AdSense/title/body mutation; its generated files were intentionally restored/excluded because they contained no source measurements and would only replace stronger prior evidence. Wedfairguide is not in the API-data inventory because repository evidence shows static JSON plus manual affiliate collection rather than API/DB ingestion.
- GitHub Dependabot API classification on 2026-07-30 found 34 open multi-dashboard alerts (high 15, medium 17, low 2; direct 9, transitive 25) and 12 open Wedfairguide alerts (high 7, medium 5; direct 9, transitive 3). All report patched versions.
- Detailed package/fix-version classification and a dependency-only follow-up boundary are recorded in `docs/work-orders/dependency-alert-triage-2026-07-30.md`. No package manifest, lockfile, alert state, or dependency was changed.

## Interrupted-tool root cause and recovery
- The previous workflow incorrectly treated a cancelled verification batch as a terminal blocker and returned a waiting response even though no user input was required.
- `AGENTS.md` now requires cancelled/interrupted calls to be treated as unknown outcomes: inspect live processes and artifacts, avoid duplicate/non-idempotent execution, retry the smallest safe verification individually, and continue through validation/deployment.
- Recovery inspection found the final isolated snapshot and generated artifacts intact. A separately started default-checkout collector was detected and left running rather than duplicated or terminated. All cancelled assertions were then rerun individually and passed.

## Final artifact deployment
- Evidence/config commit on latest-main branch: `ac6218d230c06030a7105ba9d4104a5c406bbc73`.
- PR #53: https://github.com/lsk7209/multi-dashboard/pull/53; Vercel Preview PASS; merge state CLEAN; independent reviewer APPROVE with no blocking correctness, security, or scope finding.
- Squash merge: `583b5e5fe915929a08edb23a3aa1dd0038d7c45f` at `2026-07-30T12:54:23Z`.
- Git-connected Vercel production status: SUCCESS at `2026-07-30T12:54:48Z`.
- Public alias `https://multi-dashboard-one.vercel.app/?v=583b5e5`: HTTP 200, 1,047,170 bytes; exact snapshot `2026-07-30T12:28:53.528Z`, `출시 승인 대기`, Wedfairguide, Nongsusan, and Picturebooks are rendered.
