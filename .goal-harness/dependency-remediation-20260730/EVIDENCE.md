# Evidence

## Baseline
- multi-dashboard `origin/main=4d7971c97da56bc81ca999c43e02474c8cda2ea4`; local `pnpm audit`: 37 advisories (18 high, 17 moderate, 2 low).
- Wedfairguide `origin/main=a746e2953cddb0dca96214f2cf3fc1e686abe637`; local `npm audit`: 3 high vulnerabilities.
- GitHub API baseline: multi-dashboard 34 open alerts before the latest fast-uri advisory; Wedfairguide 12 open alerts.

## multi-dashboard changes
- Removed unused direct `@vercel/sdk`; repository search found no imports. This removes its Hono/node-server/fast-uri/body-parser subtree rather than forcing incompatible transitive overrides.
- Pinned Next.js `16.2.12`.
- Pinned patched transitive releases: postcss `8.5.25`, sharp `0.35.3`, protobufjs `7.6.5`, esbuild `0.28.1`, js-yaml `4.3.0`, minimatch `10.2.5`, brace-expansion `5.0.8`.
- Updated exact ESLint toolchain to ESLint `10.8.0`, `@eslint/js` `10.0.1`, and typescript-eslint `8.65.0`; preserved the prior lint policy by disabling only two newly recommended ESLint 10 rules pending a separate code refactor.
- Cross-major glob path smoke: `glob@10.5.0` with overridden minimatch found 67 `scripts/setup/*.ts` files.
- Validation: type-check PASS; lint PASS; 33 test files / 291 tests PASS; Next.js 16.2.12 production build PASS; `pnpm audit --audit-level low` reports no known vulnerabilities.

## Wedfairguide changes
- Replaced all `latest` declarations and the Playwright range with exact installed/tested versions.
- Pinned Next.js `16.2.12`, React/React DOM `19.2.7`, postcss override `8.5.25`, and sharp override `0.35.3`.
- Validation: typecheck PASS; Next.js production build PASS with 152 pages; content and pSEO validation PASS; SEO, AdSense, and answer audits PASS; `npm audit --audit-level=low` reports zero vulnerabilities.

## Safety
- No content, data, AdSense, site configuration, production DB, or deployment mutation has occurred.

## PR, production, and alert closure
- multi-dashboard PR #55: https://github.com/lsk7209/multi-dashboard/pull/55; Vercel Preview PASS; GitHub CLEAN/MERGEABLE; squash merge `88d4e5e667a1dd2afe5af6f884ad69603f23a43d` at `2026-07-30T14:10:05Z`.
- multi-dashboard Vercel production SUCCESS at `2026-07-30T14:10:35Z`; `https://multi-dashboard-one.vercel.app/?v=88d4e5e` returned HTTP 200 and rendered the exact dashboard snapshot, launch-hold label, and Wedfairguide row.
- Wedfairguide PR #48: https://github.com/lsk7209/wedding-fair-decision-hub/pull/48; Vercel Preview PASS; GitHub CLEAN/MERGEABLE; squash merge `8f3040bfbe71206429296c45de4db6a33947d5a4` at `2026-07-30T14:10:04Z`.
- Wedfairguide Vercel production SUCCESS at `2026-07-30T14:10:40Z`; homepage, advertising disclosure, and this-month fair page all returned HTTP 200.
- Independent reviewer/subagent calls were attempted three times (reviewer and dev auditor roles) and all were blocked by the same service-throttling error. No review finding was produced; the fallback gates were full local validation, local audit 0, scoped GitHub file lists, CLEAN/MERGEABLE state, and successful Vercel Preview.
- Post-merge GitHub Dependabot API reports `open=0` for both repositories. No alert was manually dismissed.
