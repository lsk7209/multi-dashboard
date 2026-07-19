# Askore Nongsaro key recovery - 2026-07-19

Status: `credential_recovery_required`

## Verified production evidence

- Askore PR #1 merged the ETL failure-signaling repair at `2026-07-19T05:14:10Z`.
- The next scheduled workflow run, `29674776726`, checked out merge commit `9ae2ae7` and failed at the Nongsaro collection step.
- The structured ETL output was `nongsaro_api_key_not_registered` with `retryable=false`.
- `NONGSARO_API_KEY` exists in GitHub Actions secret metadata and was last updated `2026-07-06T06:43:46Z`; secret values were not inspected.

## Interpretation

The correction worked: GitHub Actions now records the credential failure instead of reporting a false successful collection. This is neither a transient network failure nor a Turso/content-pipeline issue.

## Required recovery and verification

1. Obtain a currently registered Nongsaro Garden API key from the authorized provider account.
2. Replace only the `NONGSARO_API_KEY` GitHub Actions secret in `lsk7209/askorekr`.
3. Let the next scheduled run execute, or manually dispatch only after explicit authorization for an external production operation.
4. Verify a nonzero Nongsaro ETL run record and updated plant freshness using the existing read-only Turso query before any content generation.

No secret values, database rows, content, deployment, or manual workflow dispatch were changed.
