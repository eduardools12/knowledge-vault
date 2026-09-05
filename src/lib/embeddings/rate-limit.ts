import { EmbeddingRateLimitError } from "@/lib/embeddings/errors";

/**
 * A per-user sliding-window limiter, in memory. Same design and same caveat
 * as `src/lib/ai/rate-limit.ts` (each serverless instance keeps its own
 * counters), kept as a separate instance rather than a shared one because it
 * throws `EmbeddingRateLimitError`, not `AiRateLimitError` — a caller of
 * `embedTexts` should never need to know the AI-completion hierarchy exists.
 *
 * A factory rather than one module-level limiter so a caller — chiefly a
 * test — can hold its own isolated instance instead of sharing state with
 * every other caller in the process.
 */

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 20;

export type RateLimiter = {
  /** Throws `EmbeddingRateLimitError` when this user is over the limit; records the call otherwise. */
  check(userId: string, now?: number): void;
};

export function createRateLimiter(options?: { windowMs?: number; maxRequests?: number }): RateLimiter {
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const timestampsByUser = new Map<string, number[]>();

  return {
    check(userId: string, now: number = Date.now()): void {
      const recent = (timestampsByUser.get(userId) ?? []).filter((timestamp) => now - timestamp < windowMs);

      if (recent.length >= maxRequests) {
        throw new EmbeddingRateLimitError(
          "Muitas chamadas de embedding em pouco tempo. Aguarde um pouco e tente novamente.",
        );
      }

      recent.push(now);
      timestampsByUser.set(userId, recent);
    },
  };
}

/** The instance every real call goes through. Tests should build their own with `createRateLimiter`. */
export const embeddingRateLimiter = createRateLimiter();
