# RISKS

| Risk | Impact | Likelihood | Mitigation | Status |
|---|---|---|---|---|
| Content-phase timeout is represented as service failures | High | Observed | Preserve completed probes and coalesce triage to one collector finding | Repair under validation |
| Stale or unmeasured Vercel API source data leads to unsupported content work | High | Medium | Keep source-data freshness as an explicit gap; do not generate/publish from it | Open |
| AdSense/content actions exceed dashboard authority | High | Medium | Require site-specific evidence and separate authorization before CMS, account, or DB writes | Controlled |
| Dashboard deploy contains unrelated work | High | Low | Work from a clean detached worktree and stage only task-owned files | Controlled |
| Production dashboard deployment does not track GitHub | Medium | Low | Verify remote/default branch and Vercel deployment provenance before live check | Pending |

## Risk Notices

### Risk Notice

Task: Dashboard refresh deployment and read-only fleet quality audit.

Why Needed: The user requested a current, deployed dashboard and a fleet-wide optimization review.

Impact Scope: Local dashboard source and generated artifacts; GitHub/Vercel deployment only after validation. No site/CMS/DB/AdSense/Search Console mutation is in scope.

Rollback: Revert the isolated Git commit; Git-connected Vercel will redeploy the previous default-branch commit.

Safer Alternative: Keep the review local and do not push; this would not fulfill the user's dashboard-refresh deployment shorthand.

Approval Needed: Dashboard deployment is authorized by the user request. Any individual site or external-account change requires a later, site-specific authority and evidence gate.
