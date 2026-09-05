/**
 * The error hierarchy every caller of `src/lib/ai` should catch, instead of
 * reaching into whatever the underlying SDK throws.
 *
 * Same reasoning as the provider abstraction in `types.ts`: a caller checking
 * `instanceof Anthropic.RateLimitError` has silently coupled itself to one
 * provider. Checking `instanceof AiRateLimitError` has not — it keeps working
 * the day a second provider (or a local model) sits behind `AiProvider`.
 *
 * Most-specific-first when catching, same as the SDK's own exceptions:
 * `AiBudgetExceededError` / `AiRateLimitError` / `AiConfigError` before the
 * general `AiProviderError`, itself before a bare `AiError`.
 */

export class AiError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiError";
  }
}

/** Missing or rejected configuration — an absent or invalid API key, chiefly. */
export class AiConfigError extends AiError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiConfigError";
  }
}

/** This user is calling the AI client too fast. Not the provider's own rate limit. */
export class AiRateLimitError extends AiError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiRateLimitError";
  }
}

/** The call's own estimated cost exceeds the ceiling it was given. */
export class AiBudgetExceededError extends AiError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiBudgetExceededError";
  }
}

/** The provider itself failed — a bad request, an outage, its own rate limit. */
export class AiProviderError extends AiError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiProviderError";
  }
}
