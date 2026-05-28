import pRetry, { AbortError } from "p-retry";
import { getErrorMessage } from "./errors.js";

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: { retries?: number; minTimeout?: number },
): Promise<T> {
  return pRetry(fn, {
    retries: opts?.retries ?? 3,
    minTimeout: opts?.minTimeout ?? 250,
    factor: 2,
    onFailedAttempt: (error) => {
      const message = getErrorMessage(error);
      if (/4\d\d/.test(message) && !/429/.test(message)) {
        throw new AbortError(message);
      }
    },
  });
}
