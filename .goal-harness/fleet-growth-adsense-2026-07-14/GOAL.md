# GOAL

## Final Deliverable

An evidence-backed fleet optimization package: a freshly deployed dashboard snapshot that reports collection health honestly; a prioritized, site-specific review of AdSense approval readiness, content quality, technical SEO, Google visibility, and monetization; and only narrowly scoped fixes that are proven safe and authorized.

## User Value

Replace broad, stale, or misleading fleet actions with current first-party evidence. Operators can see which site needs a collection repair, which sites have measurable search/traffic opportunities, and which actions are safe to take before attempting Google visibility or revenue improvements.

## Required Features

- Refresh the 98-site dashboard snapshot and derive direct ops intelligence/triage from it.
- Preserve completed GA4, GSC, AdSense, and ads.txt probe statuses when a later content probe times out; show one collection-freshness finding rather than false service incidents.
- Audit the fleet with explicit separation between: technical/indexability health, AdSense policy/readiness signals, content-quality evidence, traffic/search opportunity, and source-data freshness.
- Produce a ranked, evidence-linked next-action list. Mark evidence gaps rather than claiming an optimization is ready.
- Validate dashboard code and generated artifacts with targeted tests, typecheck, build, and dashboard verification/smoke checks where feasible.
- Commit and push only this task's dashboard source, generated snapshot/evidence, harness, and continuity updates; confirm Git-connected Vercel production plus a live HTTP check.

## Non-Goals

- No bulk article generation, publishing, scheduling, CMS edits, Search Console writes, AdSense account actions, production database writes, or external server changes without a later site-specific evidence and authority gate.
- No artificial traffic, deceptive SEO, policy circumvention, or unverified claims of AdSense approval or Google ranking.
- No dependency additions or broad redesign.

## Done Conditions

- The latest snapshot and every direct operational finding are classified correctly.
- The dashboard no longer turns a content-phase timeout into false GA4/GSC/AdSense/ads.txt incidents, with regression coverage.
- The fleet review identifies high-value opportunities and blockers with site-level evidence or explicitly records missing evidence.
- Required dashboard checks pass, or any external blocker is recorded without concealment.
- The deployment contains no unrelated working-tree changes and the production dashboard serves the committed snapshot.

## User-Visible Result

The dashboard presents a current, trustworthy fleet state and a practical ranked queue for AdSense readiness, content quality, technical SEO, search growth, and monetization work—without silently executing risky site changes.
