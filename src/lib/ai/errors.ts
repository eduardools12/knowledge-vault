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

/**
 * Turns any of the above into the user-facing (Portuguese) message a Server
 * Action should return, logging the ones worth investigating server-side
 * along the way. Shared by every feature that calls the AI client — first
 * `features/inbox/actions.ts` (Etapa 10), now `features/search/actions.ts`
 * (Etapa 12) — because the chain to catch and the shape of the message is
 * identical; only the failure-specific wording differs.
 */
export function describeAiError(error: unknown, options: { logPrefix: string; failureMessage: string }): string {
  if (error instanceof AiBudgetExceededError) {
    return "Isso custaria mais do que o limite configurado. Tente novamente com menos conteúdo, ou mais tarde.";
  }

  if (error instanceof AiRateLimitError) {
    return "Muitas chamadas de IA em pouco tempo. Aguarde um instante e tente novamente.";
  }

  if (error instanceof AiConfigError) {
    console.error(`${options.logPrefix} AI misconfigured:`, (error as Error).message);

    return "A IA não está configurada neste ambiente.";
  }

  if (error instanceof AiError) {
    console.error(`${options.logPrefix} AI call failed:`, (error as Error).message);

    return options.failureMessage;
  }

  console.error(`${options.logPrefix} AI call failed unexpectedly:`, error);

  return options.failureMessage;
}
