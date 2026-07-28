import { describe, expect, it } from "vitest";
import {
  isGreen,
  processedAfterSubmission,
  shouldSubmit,
  submissionAgeDays,
  type SitemapState,
} from "./submit-gsc-sitemap.js";

const now = new Date("2026-07-28T09:15:00.000Z");

function greenState(overrides: Partial<SitemapState> = {}): SitemapState {
  return {
    path: "https://autopickgo.com/sitemap.xml",
    lastSubmitted: "2026-07-28T09:13:09.017Z",
    lastDownloaded: "2026-07-28T09:13:11.401Z",
    warnings: 0,
    errors: 0,
    isPending: false,
    isSitemapsIndex: true,
    ...overrides,
  };
}

describe("submit-gsc-sitemap decisions", () => {
  it("recognizes a processed zero-issue sitemap as green", () => {
    const state = greenState();
    expect(isGreen(state)).toBe(true);
    expect(processedAfterSubmission(state)).toBe(true);
  });

  it("submits missing, pending, or issue-bearing states", () => {
    expect(shouldSubmit(undefined, 5, now)).toBe(true);
    expect(shouldSubmit(greenState({ isPending: true }), 5, now)).toBe(true);
    expect(shouldSubmit(greenState({ errors: 1 }), 5, now)).toBe(true);
  });

  it("refreshes a green sitemap only after the configured age", () => {
    const recent = greenState();
    const stale = greenState({
      lastSubmitted: "2026-07-20T09:13:09.017Z",
      lastDownloaded: "2026-07-20T09:13:11.401Z",
    });
    expect(submissionAgeDays(recent, now)).toBe(0);
    expect(shouldSubmit(recent, 5, now)).toBe(false);
    expect(submissionAgeDays(stale, now)).toBe(8);
    expect(shouldSubmit(stale, 5, now)).toBe(true);
  });

  it("requires a download at or after the submission timestamp", () => {
    expect(
      processedAfterSubmission(
        greenState({ lastDownloaded: "2026-07-28T09:13:08.000Z" }),
      ),
    ).toBe(false);
  });
});
