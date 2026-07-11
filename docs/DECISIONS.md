# Decisions

## 2026-07-12 Transient AdSense Evidence

When both the AdSense collector and ads.txt collector time out but the same snapshot retains `adsenseInstallStatus=installed` and `adsTxtValidationStatus=valid`, classify the condition as telemetry maintenance rather than an AdSense readiness blocker. This preserves evidence-first actionability while keeping genuine missing or invalid proof in the remediation queue.
