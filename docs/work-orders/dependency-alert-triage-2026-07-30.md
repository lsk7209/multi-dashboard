# Dependency Alert Triage — 2026-07-30

## Scope and safety boundary

- Source: GitHub Dependabot REST API, open alerts only, queried read-only on 2026-07-30.
- No dependency, manifest, lockfile, alert state, site, deployment, or production data was changed.
- Dependency remediation is intentionally excluded from the AdSense readiness/artifact PR. It requires separate repository-specific branches, installs, regression tests, PRs, and Git-connected deployment verification.
- Every current alert reports a first patched version. Versions below are evidence targets, not authorization to update in this work order.

## lsk7209/multi-dashboard

- Open alerts: **34** — high 15, medium 17, low 2.
- Relationship: direct 9, transitive 25.
- Scope: runtime 29, development 5.
- Fixed version available: 34/34.
- Current direct Next.js declaration: `next: ^16.0.5`; all 9 direct alerts identify `16.2.11` as the first patched version.

| Package | Alerts | Severity | Relationship | Scope | First patched versions reported |
|---|---:|---|---|---|---|
| `next` | 9 | high 4, medium 5 | direct 9 | runtime 9 | `16.2.11` |
| `brace-expansion` | 4 | high 4 | transitive 4 | runtime 2, development 2 | `1.1.16`, `2.1.2`, `5.0.7`, `5.0.8` |
| `postcss` | 3 | high 2, medium 1 | transitive 3 | runtime 3 | `8.5.10`, `8.5.12`, `8.5.18` |
| `hono` | 8 | high 1, medium 7 | transitive 8 | runtime 8 | `4.12.25`, `4.12.27` |
| `fast-uri` | 2 | high 2 | transitive 2 | runtime 2 | `3.1.3`, `3.1.4` |
| `js-yaml` | 2 | high 1, medium 1 | transitive 2 | development 2 | `4.2.0`, `4.3.0` |
| `protobufjs` | 2 | medium 2 | transitive 2 | runtime 2 | `7.6.3`, `7.6.5` |
| `sharp` | 1 | high 1 | transitive 1 | runtime 1 | `0.35.0` |
| `@hono/node-server` | 1 | medium 1 | transitive 1 | runtime 1 | `2.0.5` |
| `body-parser` | 1 | low 1 | transitive 1 | runtime 1 | `2.3.0` |
| `esbuild` | 1 | low 1 | transitive 1 | development 1 | `0.28.1` |

## lsk7209/wedding-fair-decision-hub

- Open alerts: **12** — high 7, medium 5.
- Relationship: direct 9, transitive 3.
- Scope: runtime 12.
- Fixed version available: 12/12.
- Current declarations use `latest` for Next.js/React and an explicit `postcss: 8.5.10` override. A separate remediation must replace open-ended declarations with exact tested versions rather than modifying them inside this content/readiness change.

| Package | Alerts | Severity | Relationship | Scope | First patched versions reported |
|---|---:|---|---|---|---|
| `next` | 9 | high 4, medium 5 | direct 9 | runtime 9 | `16.2.11` |
| `postcss` | 2 | high 2 | transitive 2 | runtime 2 | `8.5.12`, `8.5.18` |
| `sharp` | 1 | high 1 | transitive 1 | runtime 1 | `0.35.0` |

## Separate remediation order

1. Create one dependency-only branch per repository; do not mix with dashboard evidence or site-content changes.
2. Update direct Next.js to an exact tested version at or above `16.2.11`; regenerate only the repository's own lockfile.
3. Resolve transitive high alerts through supported parent dependency upgrades or narrowly justified overrides, targeting the highest reported patched line where multiple advisories exist.
4. Run each repository's complete type-check, test/audit, and production build gates. For Wedfairguide this includes content, pSEO, SEO, AdSense, and answer audits.
5. Open separate PRs, review dependency-tree changes, and verify Git-connected Vercel Preview before merge. Do not dismiss alerts without a verified non-applicability rationale.
