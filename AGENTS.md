# Project Rules

## Dashboard Freshness Before Site Work

- Before using dashboard insights to inspect, improve, or deploy any individual site, refresh the dashboard snapshot first.
- Run `pnpm stats:update` from `D:\web\multi-dashboard`, then confirm the generated snapshot timestamp and relevant insight data are current.
- If the refresh fails, do not proceed from stale insights unless the user explicitly asks to continue with stale data. Report the refresh failure and the affected source, such as GA4, GSC, sitemap, ads.txt, or AdSense.
- This rule applies before work based on the Insights menu, action queue, GSC issues, sitemap status, traffic drops, growth signals, or SEO opportunities.
- After refreshing, use the updated dashboard data as the source of truth for prioritizing site fixes.

## Gmail Digest Startup Prompt

- At the start of a new multi-dashboard work session, proactively mention that `lsk7209/gmail-digest` collects Gmail/GitHub operations signals and ask whether to review the latest GitHub-related errors before site work.
- Suggested wording: "GitHub에 반영된 에러들을 gmail-digest 기준으로 먼저 검토해서 수정할까요?"
- Do not automatically mutate dashboard data from gmail-digest. Refresh or import dashboard state only when the user asks for it.
