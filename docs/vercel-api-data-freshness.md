# Vercel/API Data Freshness

- Generated at: `2026-07-18T22:55:46.477Z`
- Recent window: 14 days
- Production mutation: `false`

## Summary

| Recommendation | Count |
|---|---:|
| content-followup | 8 |
| source-check-first | 18 |
| pipeline-repair-first | 1 |
| manual-review | 1 |

## Priority Sites

| Site | Recommendation | Score | Freshness evidence | Blockers |
|---|---|---:|---|---|
| `todaypharm` | content-followup | 100 | sitemap 2026-07-18T22:51:46.823Z; local 2026-07-08T01:42:52.623Z; 7d users 552 | - |
| `dogswhere` | content-followup | 95 | sitemap 2026-07-18T22:55:34.820Z; feed 2026-07-18T22:00:00.000Z; local 2026-07-16T05:21:10.819Z; 7d users 478 | - |
| `bojo24` | content-followup | 65 | sitemap 2026-07-18T00:00:00.000Z; 7d users 56 | - |
| `dullegilgogo` | content-followup | 65 | sitemap 2026-07-18T21:48:47.050Z; feed 2026-06-13T00:00:00.000Z; 7d users 50 | - |
| `picklefriend` | content-followup | 65 | sitemap 2026-07-11T00:00:00.000Z; feed 2026-07-11T00:00:00.000Z; 7d users 393 | - |
| `roadways` | content-followup | 65 | sitemap 2026-07-17T20:07:47.967Z; feed 2026-07-17T20:07:47.000Z; 7d users 93 | - |
| `tennisfrens` | content-followup | 65 | sitemap 2026-07-16T12:41:12.308Z; 7d users 288 | - |
| `texturb` | content-followup | 60 | sitemap 2026-07-11T05:02:56.515Z; feed 2026-07-16T00:00:00.000Z; 7d users 149 | - |
| `sinhonjigi-ehon365` | source-check-first | 55 | sitemap 2026-07-18T22:55:45.873Z; feed 2026-07-18T18:00:00.000Z; 7d users 91 | - |
| `askore` | source-check-first | 45 | sitemap 2026-07-18T20:46:51.524Z; feed 2026-07-18T20:00:46.000Z; 7d users 32 | - |
| `campgogo` | source-check-first | 45 | sitemap 2026-07-18T00:00:00.000Z; feed 2026-07-18T00:00:00.000Z; 7d users 6 | - |
| `dolbomjigi-ehon365` | source-check-first | 45 | sitemap 2026-06-27T07:12:22.509Z; feed 2026-07-18T22:09:15.000Z; 7d users 0 | - |

## Next Action

- Start with `content-followup` sites that have recent public/source evidence and no high-severity ops blocker.
- For `source-check-first`, inspect the source API/DB table dates before creating or refreshing articles.
- For `pipeline-repair-first`, repair the collector/publisher workflow before any content generation.
