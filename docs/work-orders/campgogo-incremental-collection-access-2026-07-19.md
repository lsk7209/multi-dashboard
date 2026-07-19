# Campgogo Incremental Collection Evidence Recovery

## Status

`execution_evidence_access_required` — do not generate or publish content from the collection pipeline until a fresh successful incremental run and database freshness are independently verified.

## Confirmed evidence

- Repository: `lsk7209/campgogo.kr`; the latest GitHub Production deployment was created by `vercel[bot]` on 2026-07-11 and completed successfully.
- The deployment status exposes `https://campgogo-ksalck0cr-limsubs-projects.vercel.app`; `https://campgogo.kr/` returns `200` from Vercel.
- The configured incremental path is `GET /api/cron/collect-incremental` at `00:00 UTC` every day.
- The production endpoint returns `401 Unauthorized` without its cron credential. This confirms the route is protected; no credential was read, printed, or used.
- The locally authenticated Vercel CLI scope is `limsubs-projects`, where `vercel project ls --format=json` returns zero projects. Consequently the current operator token cannot read the Campgogo Vercel run logs or inspect deployment environment values.
- The GitHub `bulk-collect` workflow is not proof of current source freshness: it exits after detecting the completed one-time full-collection checkpoint.

## Required recovery

1. Grant read-only Vercel project/log access for the `limsubs-projects` Campgogo project, or provide an approved read-only operational evidence export.
2. Inspect the most recent Vercel Cron invocation for `/api/cron/collect-incremental`; record its timestamp, status, source/result count, and any retry/error result without exposing secrets.
3. Run a read-only Turso freshness query against the production database and record the latest collection timestamp and row/change count.
4. Only if both checks are current and successful, reclassify the site as eligible for a separate content-enrichment review. Content generation, database writes, manual cron calls, and publishing remain out of scope for this work order.

## Stop condition

The collection freshness claim is supported by one recent successful Vercel Cron execution and a matching read-only production database freshness result. Until then, the dashboard may show the site as operationally unresolved rather than stale or healthy.
