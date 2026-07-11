import { describe, expect, it } from "vitest";

import {
  MIN_RELIABLE_IMAGE_REQUESTS,
  MIN_RELIABLE_QUALIFIED_IMPRESSIONS,
  getInternalRedirectImageRatio,
  getQualifiedCtr,
  hasReliableImageSample,
  hasReliableQualifiedSample,
} from "./banner-reporting.js";

describe("banner reporting metrics", () => {
  it("calculates the internal endpoint-call ratio without presenting it as CTR", () => {
    expect(getInternalRedirectImageRatio({ redirects: 4, imageRequests: 1 })).toBe(4);
    expect(getInternalRedirectImageRatio({ redirects: 5, imageRequests: 0 })).toBe(0);
  });

  it("requires enough image requests before a site can appear in the ratio ranking", () => {
    expect(hasReliableImageSample({ imageRequests: MIN_RELIABLE_IMAGE_REQUESTS - 1 })).toBe(false);
    expect(hasReliableImageSample({ imageRequests: MIN_RELIABLE_IMAGE_REQUESTS })).toBe(true);
  });

  it("bounds the qualified CTR to a valid percentage", () => {
    expect(getQualifiedCtr({ clicks: 3, impressions: 100 })).toBe(0.03);
    expect(getQualifiedCtr({ clicks: 4, impressions: 1 })).toBe(1);
  });

  it("requires a sufficient visible-impression sample before CTR actions are eligible", () => {
    expect(hasReliableQualifiedSample({ impressions: MIN_RELIABLE_QUALIFIED_IMPRESSIONS - 1 })).toBe(false);
    expect(hasReliableQualifiedSample({ impressions: MIN_RELIABLE_QUALIFIED_IMPRESSIONS })).toBe(true);
  });
});
