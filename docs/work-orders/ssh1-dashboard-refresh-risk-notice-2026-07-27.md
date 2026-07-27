# SSH1 dashboard refresh risk notice - 2026-07-27 KST

Task: rebuild the dashboard's strict local fleet-evidence chain after the user-authorized source-path refresh.

Why needed: the isolated clone intentionally has no copied `.env.local`, so its read-only GSC permission audit cannot locate the existing service-account key path by itself.

Impact scope: set the existing primary checkout's configured GSC key path in the current child-process environment only. The chain is read-only against GSC and does not mutate CMS, Search Console, AdSense, publishing, or a site server.

Rollback: process exit clears the environment value. Do not copy, print, commit, or record any credential value or credential-file contents.

Safer alternative: leave the strict dashboard smoke check incomplete. This does not meet the requested dashboard refresh verification contract.

Approval basis: the user explicitly requested the dashboard refresh/deployment workflow. This step uses its existing read-only GSC collection capability and makes no external configuration change.
