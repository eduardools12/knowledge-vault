/**
 * Per-token pricing and the pre-flight cost estimate.
 *
 * Prices are USD per token (not per million), so `costForUsage` stays a plain
 * multiplication instead of a divide-then-multiply at every call site. Update
 * this table — and nothing else — when a model's price changes or a new
 * model is added.
 */

export type PricedModel = "claude-opus-5" | "claude-sonnet-5" | "claude-haiku-4-5";

const PRICE_PER_TOKEN_USD: Record<PricedModel, { input: number; output: number }> = {
  "claude-opus-5": { input: 5 / 1_000_000, output: 25 / 1_000_000 },
  "claude-sonnet-5": { input: 2 / 1_000_000, output: 10 / 1_000_000 },
  "claude-haiku-4-5": { input: 1 / 1_000_000, output: 5 / 1_000_000 },
};

export function isPricedModel(model: string): model is PricedModel {
  return model in PRICE_PER_TOKEN_USD;
}

/** The real cost of a call, from the usage the provider actually reported. */
export function costForUsage(model: PricedModel, usage: { inputTokens: number; outputTokens: number }): number {
  const price = PRICE_PER_TOKEN_USD[model];

  return usage.inputTokens * price.input + usage.outputTokens * price.output;
}

/**
 * A coarse characters-per-token estimate. Used only for the pre-flight ceiling
 * check below — never for the real, billed cost, which always comes from
 * `costForUsage` on the response's actual usage. Good enough to reject a
 * request that is obviously over budget without an extra network round trip
 * to count tokens first.
 */
const CHARS_PER_TOKEN_ESTIMATE = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

/**
 * The worst case this call could cost: every input character counted as a
 * token, and the full `maxOutputTokens` spent on output. Real cost is at or
 * below this — a completion practically never uses every token it was
 * allowed.
 */
export function estimateMaxCost(model: PricedModel, inputText: string, maxOutputTokens: number): number {
  const price = PRICE_PER_TOKEN_USD[model];

  return estimateTokens(inputText) * price.input + maxOutputTokens * price.output;
}
