/**
 * Per-token pricing and the pre-flight cost estimate for embeddings.
 *
 * A sibling of `src/lib/ai/pricing.ts`, not a reuse of it — this table prices
 * a different vendor's models. Prices are USD per token (not per million), so
 * `costForUsage` stays a plain multiplication.
 */

export type PricedEmbeddingModel = "text-embedding-3-small";

const PRICE_PER_TOKEN_USD: Record<PricedEmbeddingModel, number> = {
  "text-embedding-3-small": 0.02 / 1_000_000,
};

export function isPricedEmbeddingModel(model: string): model is PricedEmbeddingModel {
  return model in PRICE_PER_TOKEN_USD;
}

/** The real cost of a call, from the usage the provider actually reported. */
export function costForUsage(model: PricedEmbeddingModel, inputTokens: number): number {
  return inputTokens * PRICE_PER_TOKEN_USD[model];
}

/**
 * A coarse characters-per-token estimate, same heuristic as
 * `src/lib/ai/pricing.ts`. Used for the pre-flight ceiling below and for
 * chunking — never for the real, billed cost, which always comes from
 * `costForUsage` on the response's actual usage.
 */
const CHARS_PER_TOKEN_ESTIMATE = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

/**
 * The worst case a batch of texts could cost: every character in every text
 * counted as a token. Embeddings have no output tokens to add on top of that,
 * unlike a completion's `maxOutputTokens`.
 */
export function estimateMaxCost(model: PricedEmbeddingModel, texts: string[]): number {
  const totalTokens = texts.reduce((sum, text) => sum + estimateTokens(text), 0);

  return totalTokens * PRICE_PER_TOKEN_USD[model];
}
