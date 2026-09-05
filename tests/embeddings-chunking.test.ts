import { describe, expect, it } from "vitest";

import { buildIndexableText, chunkText } from "@/lib/embeddings/chunking";

describe("chunkText", () => {
  it("returns nothing for empty or blank text", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("keeps short text as a single chunk", () => {
    expect(chunkText("Um parágrafo curto.")).toEqual(["Um parágrafo curto."]);
  });

  it("packs consecutive short paragraphs into one chunk", () => {
    const text = "Primeiro parágrafo.\nSegundo parágrafo.\nTerceiro parágrafo.";

    expect(chunkText(text, 100)).toEqual(["Primeiro parágrafo.\n\nSegundo parágrafo.\n\nTerceiro parágrafo."]);
  });

  it("starts a new chunk once the budget would be crossed", () => {
    // Each paragraph is ~10 tokens (40 chars / 4). A budget of 12 tokens fits
    // one paragraph per chunk, never two.
    const paragraphs = ["a".repeat(40), "b".repeat(40), "c".repeat(40)];

    expect(chunkText(paragraphs.join("\n\n"), 12)).toEqual(paragraphs);
  });

  it("hard-splits a single paragraph that alone exceeds the budget", () => {
    const huge = "x".repeat(100);

    const chunks = chunkText(huge, 10); // 10 tokens = 40 chars per chunk

    expect(chunks.join("")).toBe(huge);
    expect(chunks.every((chunk) => chunk.length <= 40)).toBe(true);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("drops blank lines between paragraphs rather than treating them as content", () => {
    expect(chunkText("Um.\n\n\n\nDois.", 100)).toEqual(["Um.\n\nDois."]);
  });

  it("trims surrounding whitespace on each paragraph", () => {
    expect(chunkText("  Um.  \n  Dois.  ", 100)).toEqual(["Um.\n\nDois."]);
  });
});

describe("buildIndexableText", () => {
  it("joins non-empty parts with a blank line between them", () => {
    expect(buildIndexableText(["Título", "Resumo", "Corpo"])).toBe("Título\n\nResumo\n\nCorpo");
  });

  it("drops null, undefined and blank parts", () => {
    expect(buildIndexableText(["Título", null, undefined, "  ", "Corpo"])).toBe("Título\n\nCorpo");
  });

  it("returns an empty string when every part is empty", () => {
    expect(buildIndexableText([null, undefined, "   "])).toBe("");
  });

  it("trims each part", () => {
    expect(buildIndexableText(["  Título  "])).toBe("Título");
  });
});
