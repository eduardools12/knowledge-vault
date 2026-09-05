/**
 * The error hierarchy every caller of `src/lib/embeddings` should catch,
 * instead of reaching into whatever the underlying SDK throws.
 *
 * A sibling of `src/lib/ai/errors.ts`, kept as its own hierarchy rather than
 * reused: embeddings and text completion are different vendors here (OpenAI,
 * Anthropic) with different failure shapes, and a caller checking
 * `instanceof EmbeddingRateLimitError` should not have to know or care that
 * `AiRateLimitError` also exists for a different subsystem.
 *
 * Most-specific-first when catching: `EmbeddingBudgetExceededError` /
 * `EmbeddingRateLimitError` / `EmbeddingConfigError` before the general
 * `EmbeddingProviderError`, itself before a bare `EmbeddingError`.
 */

export class EmbeddingError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EmbeddingError";
  }
}

/** Missing or rejected configuration — an absent or invalid API key, chiefly. */
export class EmbeddingConfigError extends EmbeddingError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EmbeddingConfigError";
  }
}

/** This caller is asking for embeddings too fast. Not the provider's own rate limit. */
export class EmbeddingRateLimitError extends EmbeddingError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EmbeddingRateLimitError";
  }
}

/** The batch's own estimated cost exceeds the ceiling it was given. */
export class EmbeddingBudgetExceededError extends EmbeddingError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EmbeddingBudgetExceededError";
  }
}

/** The provider itself failed — a bad request, an outage, its own rate limit. */
export class EmbeddingProviderError extends EmbeddingError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EmbeddingProviderError";
  }
}
