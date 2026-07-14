# Decisions

## 2026-07-14 Content-Phase Timeout Semantics

When the per-site content probe times out after GA4, GSC, AdSense-install, and ads.txt probes have completed, retain those completed service statuses and record one content collection timeout. Do not convert completed probes into synthetic service failures. The row remains a freshness/maintenance follow-up and is excluded from site-change prioritization until its content data can be refreshed.

## 2026-07-14 API Data Content Gate

The dashboard's inventory alone does not prove new API or database data. Vercel/API-backed sites require a site-specific, read-only source timestamp and queue-state check before any content generation, publishing, or scheduling decision.

## 2026-07-12 Transient AdSense Evidence

When both the AdSense collector and ads.txt collector time out but the same snapshot retains `adsenseInstallStatus=installed` and `adsTxtValidationStatus=valid`, classify the condition as telemetry maintenance rather than an AdSense readiness blocker. This preserves evidence-first actionability while keeping genuine missing or invalid proof in the remediation queue.
