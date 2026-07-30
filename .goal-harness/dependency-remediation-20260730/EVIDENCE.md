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
