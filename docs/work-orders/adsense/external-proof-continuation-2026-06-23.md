# AdSense External Proof Continuation - 2026-06-23

## Scope

This pass continues the approval-fix work for the six unapproved candidates that remain `Public fetch blocked` in the dashboard after approved-site exclusions and non-monetized exclusions.

Current dashboard snapshot:

- `data/site-stats.json` generatedAt=`2026-06-23T12:49:49.029Z`
- total sites: 87
- remaining monetization issue count: 10
- four issues are approved-root subdomain scope checks
- six issues are ordinary public-fetch-blocked candidates

## Common Finding

All six ordinary candidates have the same local collector pattern:

- `adsenseStatus=api_error`
- `adsTxtStatus=api_error`
- `adsenseCollectorStatus=transient_error`
- `adsTxtCollectorStatus=transient_error`
- homepage and `/ads.txt` timed out from the local dashboard collector

Decision: this is not enough to call AdSense setup missing or the public site globally down. It remains a collector-vantage/WAF/access-proof problem until checked from a non-blocked external or hosting-side vantage.

## Candidate Split

| Site | Current decision | Evidence from this pass | Next gate |
|---|---|---|---|
| `richyou.kr` | strongest console-check candidate | External reader returned intended Richyou homepage content with about/contact/privacy/terms/disclaimer links. Prior work already documented live loader proof. | Check AdSense console site state before any submit/resubmit action. |
| `2mlab.kr` | manual external review needed | External reader returned intended Teamhouse/team-building homepage content with trust navigation, topical sections, recent posts, and FAQ. | Obtain HTML-preserving loader proof and `/ads.txt` proof from non-blocked or hosting-side vantage. |
| `discparty.com` | manual external review needed | External reader returned intended DISC guide homepage content with About, blog, contact, privacy, and terms links. | Refresh `/ads.txt`, loader, and representative content quality proof. |
| `nicewomen.kr` | hold for fresh proof | This pass did not produce direct authoritative current homepage proof. | Get current homepage, trust-page, `/ads.txt`, sitemap, and loader proof. |
| `ezfunnel.kr` | hold for fresh proof | Search/open attempts returned unrelated `.com`/`.co` results, not authoritative `ezfunnel.kr` proof. | Get current homepage identity, trust-page, `/ads.txt`, sitemap, and loader proof. |
| `esgyo.kr` | hold for fresh proof | Search/open attempts returned unrelated ESGYO results, not authoritative `esgyo.kr` proof. | Get current crawler/protection, homepage, `/ads.txt`, sitemap, and loader proof. |

## Stop Conditions

Do not submit or resubmit any of these sites to AdSense until:

- homepage returns intended domain content from a non-blocked vantage
- `/ads.txt` exposes `google.com, pub-3050601904412736, DIRECT, f08c47fec0942fa0`
- live HTML contains `ca-pub-3050601904412736` loader or account signal
- robots and sitemap are reachable
- About, Contact, Privacy, Terms, and relevant Disclaimer pages are reachable
- representative content is not thin, placeholder-like, duplicated, or encoding-broken
- AdSense console state is checked

## Artifacts

- `data/adsense-external-proof-continuation-2026-06-23.json`

## Dashboard Integration

The external proof artifact is now consumed by `getDashboardData()` and changes the owner-action labels for local collector timeout cases:

- `richyou.kr` appears as `Console check candidate`.
- `2mlab.kr` and `discparty.com` appear as `External proof partial`.
- `nicewomen.kr`, `ezfunnel.kr`, and `esgyo.kr` appear as `Fresh proof needed`.

This prevents all six local-timeout cases from collapsing into the same generic `Public fetch blocked` label and keeps the next action aligned with the evidence strength.

No production, DNS, hosting, WordPress, Vercel, or AdSense console mutation was performed.
