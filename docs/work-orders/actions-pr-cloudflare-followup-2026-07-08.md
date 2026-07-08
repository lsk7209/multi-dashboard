# Actions, PR, And Cloudflare Follow-Up - 2026-07-08

## Evidence

- Source policy: direct GitHub Actions/PR, local repo, and public project evidence only; no `gmail-digest`
- Repos checked:
  - `lsk7209/gong365kr`
  - `lsk7209/gungangbohum`
  - `lsk7209/askorekr`
  - `lsk7209/crepikacom`
  - `lsk7209/park-trail`
- Cloudflare policy: the user does not use Cloudflare; Cloudflare/Wrangler/Workers/Pages/D1 residue is cleanup scope unless it is only dependency metadata or unrelated content/hash data.

## PR And Next-Run Status

### gong365kr

- Open PRs before follow-up: none.
- Prior repair PRs had already merged into `main`.
- Recent Actions after repair:
  - `StartupMoneyMap cron`: success at `2026-07-08T03:47:18Z`
  - `Live Cost Watch`: success at `2026-07-08T03:44:32Z`
  - `Hosting Cost Guard`: success at `2026-07-08T03:38:56Z`
- Follow-up cleanup PR:
  - `https://github.com/lsk7209/gong365kr/pull/3`
  - Removed stale `wrangler pages deploy` detection from `scripts/audit-hosting-costs.mjs`.
  - Kept Vercel production deploy detection intact.
  - PR checks: `audit-hosting-costs` success, Vercel success, Vercel Preview Comments success.
  - Merged to `main`, merge commit visible locally as `13c255a`.
- Local verification:
  - `pnpm.cmd test`: passed, 37 tests.
  - `pnpm.cmd lint`: passed.
- Remaining Cloudflare matches:
  - `pnpm-lock.yaml` optional peer metadata for `@cloudflare/workers-types`.
  - This is dependency metadata only, not a direct Cloudflare dependency or service configuration.

### gungangbohum

- Open PRs before follow-up: none.
- Prior repair PR had already merged into `main`.
- Recent Actions after repair:
  - `Publish scheduled content`: success at `2026-07-08T03:48:43Z`
  - `Publish scheduled content`: success at `2026-07-08T00:14:33Z`
  - `Publish scheduled content`: success at `2026-07-08T00:11:25Z`
  - Merge-time `Content quality`: success
  - Merge-time `Submit sitemap to Google Search Console`: skipped, not a failure
- Local Cloudflare residue search on latest `main`: no matches outside ignored dependency/build directories.

## Actions Failure Repair Queue

### askorekr

- Recent Actions checked directly from GitHub:
  - `plant-data-pipeline`: success at `2026-07-08T00:19:53Z`
  - `marketing-audit`: success at `2026-07-07T06:38:47Z`
  - earlier `plant-data-pipeline`: success at `2026-07-07T06:10:52Z`
- No current failing Action was found.
- No code patch was required in this pass.

### crepikacom

- Recent Actions checked directly from GitHub:
  - `Live Cost Watch`: success at `2026-07-08T03:47:56Z`
  - `Hosting Cost Guard`: success at `2026-07-08T03:39:06Z`
  - `Auto Publish Blog Post`: success at `2026-07-08T01:11:29Z`
  - `Auto Publish Utility Tool`: success at `2026-07-08T01:11:20Z`
- No current failing Action was found.
- No code patch was required in this pass.

### park-trail

- Recent Actions checked directly from GitHub:
  - `NPS official data sync`: success at `2026-07-08T00:33:34Z`
  - prior `NPS official data sync`: failure at `2026-07-06T12:58:03Z`
  - earlier run: success at `2026-07-02T11:43:22Z`
- The queue item is considered recovered because a newer scheduled run succeeded after the failure.
- Open PRs before follow-up: none.
- Local Cloudflare residue search on latest `main` produced one `cf...`-looking string inside `data/nps-cache.json` `contentHash`; this is hash data, not a Cloudflare token or infrastructure configuration.
- No code patch was required in this pass.

## Assessment

- The PR merge/next-run checks for `gong365kr` and `gungangbohum` are complete.
- The Actions failure queue for `askorekr`, `crepikacom`, and `park-trail` currently has no active failure requiring code repair.
- One real Cloudflare infrastructure residue was found and removed from `gong365kr`.
- Remaining Cloudflare-looking matches are classified as non-actionable metadata/hash data.

## Next

- Continue monitoring scheduled Actions for the next run window.
- If any of these repos fail again, inspect the newest failed run log rather than relying on the older failure history.
- Keep applying the no-Cloudflare cleanup rule during every site/repo review.
