import { describe, expect, it } from "vitest";

import {
  type AssignmentPerformance,
  buildWeightPlans,
} from "./optimize-coupang-banner-weights.js";

const baseRows: AssignmentPerformance[] = [
  {
    assignmentId: "assignment_coupang_temon_inline_a",
    creativeName: "Temon A",
    currentWeight: 34,
    impressions: 300,
    placementId: "placement_coupang_temon_inline",
    redirects: 6,
    siteKey: "temon",
    slotKey: "coupang-inline",
  },
  {
    assignmentId: "assignment_coupang_temon_inline_b",
    creativeName: "Temon B",
    currentWeight: 33,
    impressions: 300,
    placementId: "placement_coupang_temon_inline",
    redirects: 30,
    siteKey: "temon",
    slotKey: "coupang-inline",
  },
  {
    assignmentId: "assignment_coupang_temon_inline_c",
    creativeName: "Temon C",
    currentWeight: 33,
    impressions: 300,
    placementId: "placement_coupang_temon_inline",
    redirects: 9,
    siteKey: "temon",
    slotKey: "coupang-inline",
  },
];

describe("Coupang banner weight optimizer", () => {
  it("promotes the strongest redirect-rate variant with bounded weights", () => {
    const [plan] = buildWeightPlans(baseRows, {
      maxWeight: 80,
      minPlacementImpressions: 100,
      minPlacementRedirects: 3,
      minWeight: 10,
      minWeightDelta: 5,
      priorImpressions: 100,
      priorRedirects: 2,
    });

    expect(plan?.changed).toBe(true);
    expect(plan?.decisions.reduce((sum, decision) => sum + decision.recommendedWeight, 0)).toBe(100);
    expect(plan?.decisions.find((decision) => decision.assignmentId.endsWith("_b"))?.recommendedWeight).toBeGreaterThan(50);
    expect(plan?.decisions.every((decision) => decision.recommendedWeight >= 10)).toBe(true);
  });

  it("does not change weights while placement sample is too small", () => {
    const [plan] = buildWeightPlans(
      baseRows.map((row) => ({ ...row, impressions: 10 })),
      {
        maxWeight: 80,
        minPlacementImpressions: 100,
        minPlacementRedirects: 3,
        minWeight: 10,
        minWeightDelta: 5,
        priorImpressions: 100,
        priorRedirects: 2,
      },
    );

    expect(plan?.changed).toBe(false);
    expect(plan?.decisions.map((decision) => decision.reason)).toEqual([
      "insufficient_placement_sample",
      "insufficient_placement_sample",
      "insufficient_placement_sample",
    ]);
    expect(plan?.decisions.map((decision) => decision.recommendedWeight)).toEqual([34, 33, 33]);
  });

  it("keeps stable weights when the recommended delta is below threshold", () => {
    const [plan] = buildWeightPlans(
      baseRows.map((row) => ({ ...row, redirects: 10 })),
      {
        maxWeight: 80,
        minPlacementImpressions: 100,
        minPlacementRedirects: 3,
        minWeight: 10,
        minWeightDelta: 5,
        priorImpressions: 100,
        priorRedirects: 2,
      },
    );

    expect(plan?.changed).toBe(false);
    expect(plan?.decisions.map((decision) => decision.reason)).toEqual(["unchanged", "unchanged", "unchanged"]);
    expect(plan?.decisions.map((decision) => decision.recommendedWeight)).toEqual([34, 33, 33]);
  });

  it("does not optimize zero-redirect placements even when impressions are enough", () => {
    const [plan] = buildWeightPlans(
      baseRows.map((row) => ({ ...row, redirects: 0 })),
      {
        maxWeight: 80,
        minPlacementImpressions: 100,
        minPlacementRedirects: 3,
        minWeight: 10,
        minWeightDelta: 5,
        priorImpressions: 100,
        priorRedirects: 2,
      },
    );

    expect(plan?.changed).toBe(false);
    expect(plan?.decisions.map((decision) => decision.reason)).toEqual([
      "insufficient_placement_redirects",
      "insufficient_placement_redirects",
      "insufficient_placement_redirects",
    ]);
    expect(plan?.decisions.map((decision) => decision.recommendedWeight)).toEqual([34, 33, 33]);
  });
});
