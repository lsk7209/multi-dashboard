# Risk Notice

Task: Replace raw endpoint-call ratios with qualified banner CTR.

Why Needed: Raw image and click endpoint requests permit cache, automation, prefetch, and repeated-request distortion.

Impact Scope: Dashboard API/schema plus 21 production banner installations (12 Next/Vite, 9 WordPress).

Rollback: Keep existing raw event rows and legacy ratio; disable qualified metrics or revert individual site deployment without deleting data.

Safer Alternative: Retain the current internal-call ratio only. This does not provide actual CTR.

Approval Needed: Production schema/deployment and WordPress remote writes require a final explicit production rollout approval after local checks and canary evidence are ready.
