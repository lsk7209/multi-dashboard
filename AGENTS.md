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

## Gmail Digest Startup Prompt

- At the start of a new multi-dashboard work session, proactively mention that `lsk7209/gmail-digest` collects Gmail/GitHub operations signals and ask whether to review the latest GitHub-related errors before site work.
- Suggested wording: `GitHub에 반영된 에러들을 gmail-digest 기준으로 먼저 검토해서 수정할까요?`
- Do not automatically mutate dashboard data from gmail-digest. Refresh or import dashboard state only when the user asks for it.

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
