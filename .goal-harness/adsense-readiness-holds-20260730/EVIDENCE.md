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
