# GSC Permission Audit - 2026-08-26T12:47:22.978Z

This is a non-mutating permission recovery packet. It does not change Search Console, GA4, DNS, or site files.

## Service Account

- Email to grant or verify: `id-ai-179@cursorai-451704.iam.gserviceaccount.com`

## Summary

- Handoff status: `pending_external`
- Snapshot: `data/site-stats.json generatedAt=2026-08-26T12:47:22.978Z`
- Audited rows: 3
- Owner access: 0
- Restricted access: 0
- Unverified: 2
- Not listed: 1

## Required Actions

### lim01.soonsaak.co.kr (lim01-soonsaak-co)

- Configured GSC property: `https://lim01.soonsaak.co.kr/`
- Listed in service account view: `not_listed`
- Permission level: `not_listed`
- Access state: `not_listed`
- Required action: Add or share the configured Search Console property with the dashboard service account, then re-run stats collection.
- Stop condition: do not run dashboard recommendations for this site until this row disappears from a fresh `pnpm gsc:permissions:audit` result and `pnpm dashboard:post-recovery` reaches `ready_to_act`.

### picturebooks.kr (picturebooks)

- Configured GSC property: `https://picturebooks.kr/`
- Listed in service account view: `https://picturebooks.kr/`
- Permission level: `siteUnverifiedUser`
- Access state: `unverified`
- Required action: Verify the Search Console property or grant owner-level access to the dashboard service account, then re-run stats collection.
- Stop condition: do not run dashboard recommendations for this site until this row disappears from a fresh `pnpm gsc:permissions:audit` result and `pnpm dashboard:post-recovery` reaches `ready_to_act`.

### kang4.com (kang4)

- Configured GSC property: `https://kang4.com/`
- Listed in service account view: `https://kang4.com/`
- Permission level: `siteUnverifiedUser`
- Access state: `unverified`
- Required action: Verify the Search Console property or grant owner-level access to the dashboard service account, then re-run stats collection.
- Stop condition: do not run dashboard recommendations for this site until this row disappears from a fresh `pnpm gsc:permissions:audit` result and `pnpm dashboard:post-recovery` reaches `ready_to_act`.

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
