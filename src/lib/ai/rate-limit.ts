import { AiRateLimitError } from "@/lib/ai/errors";

/**
 * A per-user sliding-window limiter, in memory.
 *
 * Good enough for a personal vault, not for a fleet: each serverless instance
 * keeps its own counters, so on Vercel a user's real ceiling is
 * `maxRequests` × however many instances happen to serve their requests, not
 * one hard number. That is an acceptable gap here — this guard exists to
 * catch an accidental loop (a bug that calls the AI client in a `while`, a
 * retry storm), not to police a multi-tenant SaaS. A shared store (Redis, or
 * a Postgres table keyed by user) is what closes it, if it ever matters.
 *
 * A factory rather than one module-level limiter so a caller — chiefly a
 * test — can hold its own isolated instance instead of sharing state with
 * every other caller in the process.
 */

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 20;

export type RateLimiter = {
  /** Throws `AiRateLimitError` when this user is over the limit; records the call otherwise. */
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
        throw new AiRateLimitError("Muitas chamadas de IA em pouco tempo. Aguarde um pouco e tente novamente.");
      }

      recent.push(now);
      timestampsByUser.set(userId, recent);
    },
  };
}

/** The instance every real call goes through. Tests should build their own with `createRateLimiter`. */
export const aiRateLimiter = createRateLimiter();
