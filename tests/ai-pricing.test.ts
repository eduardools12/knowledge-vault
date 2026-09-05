import { describe, expect, it } from "vitest";

import { costForUsage, estimateMaxCost, estimateTokens, isPricedModel } from "@/lib/ai/pricing";

describe("isPricedModel", () => {
  it("recognises the priced models", () => {
    expect(isPricedModel("claude-opus-5")).toBe(true);
    expect(isPricedModel("claude-sonnet-5")).toBe(true);
    expect(isPricedModel("claude-haiku-4-5")).toBe(true);
  });

  it("rejects a model with no price on file", () => {
    expect(isPricedModel("claude-opus-4-8")).toBe(false);
    expect(isPricedModel("gpt-4")).toBe(false);
  });
});

describe("costForUsage", () => {
  it("prices input and output tokens separately", () => {
    // Opus 5: $5/MTok in, $25/MTok out.
    const cost = costForUsage("claude-opus-5", { inputTokens: 1_000_000, outputTokens: 1_000_000 });

    expect(cost).toBeCloseTo(30, 5);
  });

  it("is zero for zero usage", () => {
    expect(costForUsage("claude-haiku-4-5", { inputTokens: 0, outputTokens: 0 })).toBe(0);
  });

  it("charges output at a higher rate than input, for every priced model", () => {
    for (const model of ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"] as const) {
      const inputCost = costForUsage(model, { inputTokens: 1000, outputTokens: 0 });
      const outputCost = costForUsage(model, { inputTokens: 0, outputTokens: 1000 });

      expect(outputCost, model).toBeGreaterThan(inputCost);
    }
  });
});

describe("estimateTokens", () => {
  it("returns zero for empty text", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("rounds up rather than down, so the estimate never under-counts", () => {
    // 1 character at 4 chars/token should still count as a whole token.
    expect(estimateTokens("a")).toBe(1);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
  });
});

describe("estimateMaxCost", () => {
  it("adds the estimated input cost to the full output ceiling", () => {
    // 4 chars/token, so "abcd" costs exactly 1 estimated input token.
    const cost = estimateMaxCost("claude-opus-5", "abcd", 1_000_000);
    const outputOnly = costForUsage("claude-opus-5", { inputTokens: 0, outputTokens: 1_000_000 });
    const oneInputToken = costForUsage("claude-opus-5", { inputTokens: 1, outputTokens: 0 });

    expect(cost).toBeCloseTo(outputOnly + oneInputToken, 8);
  });

  it("grows with maxOutputTokens, since that is the worst-case ceiling", () => {
    const small = estimateMaxCost("claude-haiku-4-5", "some input text", 100);
    const large = estimateMaxCost("claude-haiku-4-5", "some input text", 10_000);

    expect(large).toBeGreaterThan(small);
  });
});
