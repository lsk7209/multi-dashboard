# prep-automation v1.1

This directory automates the setup work described in `docs/prep-automation-spec-v1.1.md`.

## Prerequisites

- Node.js 24+
- pnpm 10+
- GitHub CLI `gh`

## Configure

1. Fill `scripts/setup/sites.yaml`.
2. Put shared secrets in environment variables, `.env.setup.local`, `.env.local`, or `D:\env\키파일.txt`.
3. Add one WordPress credential set per site.

Examples:

- `.env.setup.local.example`
- `scripts/setup/sites.example.yaml`

WordPress credential variable names:

```bash
WP_ADMIN_<SITE_ID>_URL=https://example.com
WP_ADMIN_<SITE_ID>_USERNAME=admin
WP_ADMIN_<SITE_ID>_PASSWORD=application-password
```

`<SITE_ID>` is uppercased and non-alphanumeric characters become `_`. For `recipes-01`, use `WP_ADMIN_RECIPES_01_*`.

## Commands

```bash
pnpm setup:preflight:dashboard
pnpm setup:preflight
pnpm setup:all
pnpm setup:resume
pnpm setup:verify
pnpm setup:verify:dry
pnpm setup:cleanup-wp <siteId>
pnpm setup:revoke
```

`setup:wp` sends generated WordPress App Passwords through stdout JSON only. It does not write generated passwords to disk.
`setup:all` runs `setup:preflight` first and stops before external changes if required inputs are missing.

## State

`.setup-state.json` contains progress state only. `setup.log` contains verification error details. Neither file stores generated WordPress passwords.
