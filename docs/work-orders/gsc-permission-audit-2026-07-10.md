# GSC Permission Audit - 2026-07-10T08:51:36.848Z

This is a non-mutating permission recovery packet. It does not change Search Console, GA4, DNS, or site files.

## Service Account

- Email to grant or verify: `id-ai-179@cursorai-451704.iam.gserviceaccount.com`

## Summary

- Handoff status: `resolved`
- Snapshot: `data/site-stats.json generatedAt=2026-07-10T08:51:36.848Z`
- Audited rows: 0
- Owner access: 0
- Restricted access: 0
- Unverified: 0
- Not listed: 0

## Required Actions

## External Recovery Checklist

1. In Search Console, open the exact configured property shown above.
2. If the row is `unverified`, verify the property in Search Console or have a verified owner complete verification.
3. Grant the dashboard service account owner-level access, or enough access for Search Console API metrics and sitemap reads.
4. Do not change DNS, site files, CMS content, AdSense, GA4, deployments, titles, or article bodies from this packet.
5. Return to this repository and run the local verification sequence below.

## Verification

After changing Search Console permissions, run:

```powershell
pnpm gsc:permissions:audit
pnpm stats:update
pnpm dashboard:post-recovery
pnpm dashboard:artifact-integrity
pnpm dashboard:acceptance data\dashboard-verification-<YYYY-MM-DD>.json
```

Success condition: the fresh permission packet has no `unverified` or `not_listed` row for the target site, `data/site-stats.json` reports `gscStatus=ok`, `dashboard:post-recovery` reports `ready_to_act`, `dashboard:artifact-integrity` reports `ready=true`, and `dashboard:acceptance` reports `ready=true`.
