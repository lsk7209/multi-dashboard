export const MIN_RELIABLE_IMAGE_REQUESTS = 100;
export const MIN_RELIABLE_QUALIFIED_IMPRESSIONS = 100;

export function getInternalRedirectImageRatio(input: {
  redirects: number;
  imageRequests: number;
}): number {
  if (input.imageRequests <= 0) return 0;
  return input.redirects / input.imageRequests;
}

export function hasReliableImageSample(input: { imageRequests: number }): boolean {
  return input.imageRequests >= MIN_RELIABLE_IMAGE_REQUESTS;
}

export function hasReliableQualifiedSample(input: { impressions: number }): boolean {
  return input.impressions >= MIN_RELIABLE_QUALIFIED_IMPRESSIONS;
}

export function getQualifiedCtr(input: { clicks: number; impressions: number }): number {
  if (input.impressions <= 0) return 0;
  return Math.min(1, Math.max(0, input.clicks / input.impressions));
}
