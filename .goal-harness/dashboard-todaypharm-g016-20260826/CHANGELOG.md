# Changelog

- Raised the default full collector timeout from 10 minutes to 15 minutes, matching the first fresh budget that completed all 113 configured sites.
- Added a dedicated high-priority dashboard action for content-phase collection failures while preserving completed GA4/GSC/AdSense evidence.
- Added regression tests for the timeout default and action/status separation.
- Refreshed the read-only Vercel/API-data inventory and current dashboard snapshot.
