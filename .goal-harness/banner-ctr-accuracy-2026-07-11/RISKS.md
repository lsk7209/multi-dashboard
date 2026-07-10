# Risks

| Risk | Mitigation | Status |
|---|---|---|
| Production telemetry rollout spans multiple repositories | Inventory paths, deploy incrementally, validate representative sites | Open |
| Historical events lack qualified-session data | Keep legacy metrics separate; do not backfill or delete | Open |
| Privacy risk from identifiers | Anonymous, per-site, rotating session tokens only | Open |
