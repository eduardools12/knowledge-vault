import { describe, expect, it } from "vitest";

import { AiRateLimitError } from "@/lib/ai/errors";
import { createRateLimiter } from "@/lib/ai/rate-limit";

/**
 * A sliding window, not a fixed one: the count that matters is "how many
 * calls in the last `windowMs`", recomputed on every check, not "how many
 * calls since some fixed clock tick" — the second version would let a burst
 * right at a window boundary double up.
 */
describe("createRateLimiter", () => {
  it("allows calls up to the limit", () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 });

    expect(() => limiter.check("user-1", 0)).not.toThrow();
    expect(() => limiter.check("user-1", 1)).not.toThrow();
    expect(() => limiter.check("user-1", 2)).not.toThrow();
  });

  it("rejects the call past the limit, within the window", () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60_000 });

    limiter.check("user-1", 0);
    limiter.check("user-1", 1);

    expect(() => limiter.check("user-1", 2)).toThrow(AiRateLimitError);
  });

  it("forgets calls once they age out of the window", () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 1000 });

    limiter.check("user-1", 0);
    limiter.check("user-1", 500);
    expect(() => limiter.check("user-1", 900)).toThrow(AiRateLimitError);

    // The call at t=0 is now more than 1000ms in the past and no longer counts.
    expect(() => limiter.check("user-1", 1100)).not.toThrow();
  });

  it("tracks each user independently", () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });

    limiter.check("user-1", 0);

    expect(() => limiter.check("user-1", 1)).toThrow(AiRateLimitError);
    expect(() => limiter.check("user-2", 1)).not.toThrow();
  });
});
