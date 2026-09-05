import { describe, expect, it } from "vitest";

import { costForUsage, estimateMaxCost, estimateTokens, isPricedEmbeddingModel } from "@/lib/embeddings/pricing";

describe("isPricedEmbeddingModel", () => {
  it("recognises the priced model", () => {
    expect(isPricedEmbeddingModel("text-embedding-3-small")).toBe(true);
  });

  it("rejects a model with no price on file", () => {
    expect(isPricedEmbeddingModel("text-embedding-3-large")).toBe(false);
    expect(isPricedEmbeddingModel("claude-opus-5")).toBe(false);
  });
});

describe("costForUsage", () => {
  it("prices input tokens, with no output side to add", () => {
    // text-embedding-3-small: $0.02/MTok.
    expect(costForUsage("text-embedding-3-small", 1_000_000)).toBeCloseTo(0.02, 6);
  });

  it("is zero for zero usage", () => {
    expect(costForUsage("text-embedding-3-small", 0)).toBe(0);
  });
});

describe("estimateTokens", () => {
  it("returns zero for empty text", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("rounds up rather than down, so the estimate never under-counts", () => {
    expect(estimateTokens("a")).toBe(1);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
  });
});

describe("estimateMaxCost", () => {
  it("sums every text in the batch", () => {
    const oneText = estimateMaxCost("text-embedding-3-small", ["abcd"]);
    const threeTexts = estimateMaxCost("text-embedding-3-small", ["abcd", "abcd", "abcd"]);

    expect(threeTexts).toBeCloseTo(oneText * 3, 10);
  });

  it("is zero for an empty batch", () => {
    expect(estimateMaxCost("text-embedding-3-small", [])).toBe(0);
  });
});
