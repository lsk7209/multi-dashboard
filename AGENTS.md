# Project Rules

## GA4 Naming Convention

- When creating or registering any GA4 property, web data stream, Google tag, or dashboard GA4 label for a site, use the bare domain as the name, such as `smallhomepick.com`.
- Do not use Korean names or marketing aliases for GA4 registration labels.
- If a UI requires multiple related names, keep the domain first and add only a short technical suffix when needed, such as `smallhomepick.com Web`.

## Dashboard Freshness Before Site Work

- Before using dashboard insights to inspect, improve, or deploy any individual site, refresh the dashboard snapshot first.
- Run `pnpm stats:update` from `D:\web\multi-dashboard`, then confirm the generated snapshot timestamp and relevant insight data are current.
- If the refresh fails, do not proceed from stale insights unless the user explicitly asks to continue with stale data. Report the refresh failure and the affected source, such as GA4, GSC, sitemap, ads.txt, or AdSense.
- This rule applies before work based on the Insights menu, action queue, GSC issues, sitemap status, traffic drops, growth signals, or SEO opportunities.
- After refreshing, use the updated dashboard data as the source of truth for prioritizing site fixes.

## Dashboard Refresh Deployment Contract

- User shorthand: `대시보드 갱신` includes Git deployment.
- Complete a dashboard refresh by running `pnpm dashboard:refresh`, verifying the resulting snapshot and relevant dashboard checks, committing the coherent dashboard code and generated artifacts, pushing the default branch, then confirming the Git-connected Vercel production deployment and a live check.
- Do not include unrelated, historical, or untracked work in the deployment commit.

## Evidence-First Work Progression

- This project should be operated from current first-party evidence, not from stale helper outputs, old queues, or habit.
- Before prioritizing, implementing, or reporting, identify the current source of truth for the task and verify it is fresh enough.
- If a legacy script, artifact, or external helper conflicts with the project direction, treat it as technical debt to repair instead of adapting the plan around it.
- When a user corrects a workflow assumption, record the correction in the project rules before continuing related work.
- For sequential work, finish the current evidence and verification loop before moving to the next site or subsystem.

## Confirmed Site Fix Authority

- A dashboard `read-only` or post-recovery state restricts dashboard-triggered automatic actions only; it does not remove Codex authority to implement a user-confirmed, evidence-backed fix in an individual site repository.
- Once a site fix is confirmed from fresh evidence, apply it, validate it, and use that site's Git-connected deployment flow unless the user explicitly says to hold site changes.

## Direct Ops Collection, Not Gmail Digest

- Do not use `lsk7209/gmail-digest` as the source of truth for multi-dashboard operations triage.
- Do not recommend fixing `gmail-digest` before site work. The project direction is to collect operational signals directly inside `multi-dashboard`.
- For GitHub Actions failures, collect from GitHub APIs or repo-local workflow evidence directly.
- For GA4, GSC, sitemap, AdSense code, and ads.txt signals, use the current `pnpm stats:update` output and dashboard artifacts.
- If a script still reads `gmail-digest`, treat that as legacy technical debt to replace with direct collection, not as a user workflow requirement.
- When planning site fixes, explicitly separate direct dashboard evidence from any stale legacy digest-derived artifact.

## No Cloudflare Service Usage

- The managed sites do not use Cloudflare services as an active hosting, worker, database, proxy, or deployment layer.
- When reviewing any site, treat active Cloudflare artifacts as cleanup targets: `wrangler*` config, Cloudflare Pages/Workers/Functions code, D1/KV/R2 bindings, Cloudflare-specific docs, dependencies, scripts, dashboard instructions, and GitHub status/check references.
- Prefer the actual stack shown by repo evidence, usually GitHub plus Vercel and the site's current database/API providers.
- If a failing `Cloudflare Pages` GitHub status appears, distinguish repo cleanup from external Cloudflare GitHub App/Page integration. Remove repo-side artifacts first, then record that the external integration must be disconnected from the account or repository settings.

## Vercel API Data Content Follow-Up

- This rule applies across Vercel-hosted / Next.js sites that collect external API data into a DB or use API-backed datasets for SEO content. It is not limited to `todaypharm`.
- Exclude WordPress sites unless local evidence shows the dashboard platform label is stale and the actual project is a Vercel/Next.js API-data site.
- Do not rely only on `scripts/setup/sites.yaml` `platform`; verify with local project evidence such as `package.json`, `.vercel/`, `.github/workflows`, `scripts/*sync*`, `scripts/*fetch*`, `scripts/*collect*`, Turso/libsql/Supabase usage, and external API keys.
- The user should not have to run this manually. Codex must proactively raise this check at the start of relevant multi-dashboard/site work. Do not ask the follow-up again merely because a normal task response is ending.
- When the inventory may be stale, Codex should run the read-only inventory command itself: `pnpm exec tsx scripts/setup/audit-vercel-api-data-sites.ts`.
- Before starting material work on one of these sites, check `docs/vercel-api-data-sites.md`, inspect whether scheduled API collection has produced new DB data, then decide whether content enrichment/generation should be added.
- Only when the user explicitly indicates they are ending or closing the work session after work that touched dashboard priorities, Vercel API-data sites, DB sync, SEO, or content, ask:
  - `워드프레스 제외 Vercel API 수집형 사이트들 중 신규 API 데이터가 있는지 확인하고, 새 데이터 기반 콘텐츠 보완/생성 작업을 추가할까요?`
- Checking for new data is read-only by default. Do not run production DB writes, live API backfills, publishing jobs, or deployments solely because of this reminder.
