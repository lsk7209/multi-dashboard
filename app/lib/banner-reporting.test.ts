import { describe, expect, it } from "vitest";

import {
  MIN_RELIABLE_IMAGE_REQUESTS,
  getInternalRedirectImageRatio,
  hasReliableImageSample,
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
});
