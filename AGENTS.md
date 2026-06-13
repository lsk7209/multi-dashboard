# Project Rules

## Dashboard Freshness Before Site Work

- Before using dashboard insights to inspect, improve, or deploy any individual site, refresh the dashboard snapshot first.
- Run `pnpm stats:update` from `D:\web\multi-dashboard`, then confirm the generated snapshot timestamp and relevant insight data are current.
- If the refresh fails, do not proceed from stale insights unless the user explicitly asks to continue with stale data. Report the refresh failure and the affected source, such as GA4, GSC, sitemap, ads.txt, or AdSense.
- This rule applies before work based on the Insights menu, action queue, GSC issues, sitemap status, traffic drops, growth signals, or SEO opportunities.
- After refreshing, use the updated dashboard data as the source of truth for prioritizing site fixes.
