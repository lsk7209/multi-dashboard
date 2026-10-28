# Affiliate OS same-host administrator access

The dashboard now provides the original Affiliate OS administrator at `/admin`, with its JavaScript and CSS served through exact Node routes. The dashboard view and full administrator share one secure HttpOnly cookie scoped to `/`. Previously saved default loopback administrator URLs migrate to `/admin`.

The fixed upstream is protected by a separate Basic authentication gate and TLS certificate pinned in server-only `AFFILIATE_API_CA_CERT`. Node verifies the certificate chain and IP SAN. Gateway authentication is stripped before the app. No browser receives the gateway credential, certificate private key, or upstream session cookie name. Configure `AFFILIATE_API_ORIGIN`, `AFFILIATE_DASHBOARD_ORIGIN`, `AFFILIATE_GATEWAY_AUTH`, and `AFFILIATE_API_CA_CERT` only in the production project's sensitive environment variables.

Admin requests use an explicit method/path allowlist, exact Origin checks, original application CSRF/role checks, fixed upstream origin, bounded bodies and total deadlines. The dashboard reports upstream failures without substituting zero records. Logout distinguishes a confirmed cleared browser cookie from a browser transport failure, preserving an honest retry state.

JSON requests normally have a 1 MB limit; source folder uploads have a 4 MB dashboard limit. CSV output is bounded to 4 MB. Backup downloads stream up to 64 MiB with a 30 second total deadline. The gateway write deadline is 45 seconds. Larger uploads require the private administrator route. The manually provisioned gateway certificate requires renewal and matching Vercel environment update before expiry; this is not automatic certificate management.

Validation before release: 383 dashboard unit tests, 11 Playwright browser tests, lint and typecheck passed. Local production compilation passed with webpack; the normal local Turbopack build cannot use the externally junctioned node_modules directory, so the Vercel build and live same-host authentication remain deployment acceptance gates. Gateway configuration and exact interrupted build/rollback recovery passed 13 Python regression tests and independent review. Live results are recorded in the Affiliate OS deployment evidence, separately from fixture verification.

This release enables administrator access. It does not approve links/sites, install scripts on operating sites, configure a model, or activate revenue providers. Preserve the global pause and the separation of source collection, product review, partner permission, and site-specific publication approval.
