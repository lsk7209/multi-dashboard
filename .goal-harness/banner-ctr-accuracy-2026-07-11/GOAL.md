# Goal

## Final Deliverable

Accurate, privacy-preserving banner measurement across every managed banner installation, with dashboard metrics that distinguish eligible impressions, qualified clicks, low samples, and legacy data.

## User Value

Operators can use the console to compare banner performance without treating endpoint calls, bots, or small samples as real CTR.

## Required Features

- Anonymous session-aware impression and click events.
- Bot and automation suppression.
- Separate qualified metrics from legacy endpoint-call data.
- Fleet rollout plan and verification for all managed banner installations.

## Non-Goals

- No personal profiles, fingerprinting, or persistent cross-site identifiers.
- No production database rewrite or historical event deletion.

## Done Conditions

- Acceptance criteria and live validation evidence are recorded.
- Managed installation paths emit the new event contract.
- Dashboard labels and ranking use qualified metrics only.

## User-Visible Result

The banner console shows qualified CTR only when the sample is sufficient, and clearly labels legacy or insufficient data.
