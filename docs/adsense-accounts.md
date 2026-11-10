# AdSense account inventory

The server workspace shows exact-domain publisher IDs, Sites API approval state, source/check time and configured-account coverage. Search by domain or publisher ID, or select an account. Site approval and Ads.txt console authorization are separate.

`pnpm inventory:adsense` reads all paginated accounts/sites from every configured authorized source. Local private settings use `ADSENSE_ACCOUNTS_CONFIG_PATH` or `E:/env/adsense_accounts.json`; entries contain `clientPath`, `tokenPath`, and optional exact `accountRef`. Do not commit credentials or login emails.

Daily GitHub Actions uses encrypted repository secret `ADSENSE_ACCOUNTS_JSON`, an array of `{accountRef, client, token}`. Client/token JSON is parsed only in memory. Use existing `adsense.readonly` grants; additional accounts require their own authorized token. No OAuth consent is performed by this collector. Invalid/unreachable sources fail the scheduled refresh with sanitized diagnostics.

`sourceChecks` and `accountInventory` distinguish configured coverage from all accounts the operator may own. Successful positive account matches survive unrelated source failures. Absence requires complete fresh configured scope. States expire after 24 hours; historical publisher matches and console observations retain their original dates. Conflicting account states are unknown, with all matches visible. Apex domains and subdomains are matched separately.

`data/adsense-console-observations.json` holds operator-supplied console facts. nekau.com screenshot shows GETTING_READY and Ads.txt authorized, with console update 2026-11-08 17:14 KST. It does not identify an account by itself. API evidence takes precedence for current Sites state; Ads.txt is shown as dated console evidence because the Sites API does not return this field.

Additional account identities were requested once; they remain unconfigured until verified. Public UI uses publisher IDs rather than login emails. Global instructions in `C:/Users/dlatj/.codex/AGENTS.md` make this dashboard the first lookup for future managed-site account/status work.
