# Goal

## Final Deliverable

Classify an intentional `editorial_hold` as a non-collector status so a fresh dashboard evidence chain remains internally consistent and the runtime smoke test can pass without hiding the hold.

## Non-Goals

- No CMS, GSC, AdSense, publishing, or deployment mutation.
- Do not remove or bypass the `caregos` editorial hold.

## Done Conditions

- `editorial_hold` is excluded from refresh-failure aggregation.
- A regression test locks the classification.
- Fresh local chain and dashboard smoke pass against the same snapshot.
