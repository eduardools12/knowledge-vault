import { describe, expect, it } from "vitest";

import { toPrefixTsQuery } from "@/lib/search";

/**
 * A search box receives whatever people type, and `to_tsquery` treats `&`, `|`,
 * `!`, `:` and parentheses as operators. Anything that slips through unescaped
 * is not a wrong result — it is a database error where a result should be.
 */
describe("toPrefixTsQuery", () => {
  it("turns a single word into a prefix match", () => {
    // The point of the prefix: "pand" has to find "Pandas" while still typing.
    expect(toPrefixTsQuery("pandas")).toBe("pandas:*");
    expect(toPrefixTsQuery("pand")).toBe("pand:*");
  });

  it("requires every word, so more typing narrows the result", () => {
    expect(toPrefixTsQuery("expected goals")).toBe("expected:* & goals:*");
  });

  it("lowercases input", () => {
    expect(toPrefixTsQuery("Expected Goals")).toBe("expected:* & goals:*");
  });

  it("keeps accented letters intact", () => {
    // `\\w` would split "análise" into "an" and "lise" and find nothing.
    expect(toPrefixTsQuery("análise estatística")).toBe("análise:* & estatística:*");
  });

  it("strips tsquery operators instead of passing them through", () => {
    for (const input of ["ab & cd", "ab | cd", "!ab", "(ab)", "ab:cd", "ab <-> cd", "'ab'"]) {
      const result = toPrefixTsQuery(input) ?? "";

      // Remove the syntax this function is allowed to emit — the `:*` prefix
      // suffix and the ` & ` separator — and nothing operator-like may remain.
      const terms = result.replaceAll(":*", "").split(" & ").join("");

      expect(terms, input).not.toMatch(/[&|!():'<>]/);
    }
  });

  it("survives input that is only punctuation", () => {
    expect(toPrefixTsQuery("!!!")).toBeNull();
    expect(toPrefixTsQuery("&|()")).toBeNull();
  });

  it("returns null when there is nothing to search for", () => {
    expect(toPrefixTsQuery("")).toBeNull();
    expect(toPrefixTsQuery("   ")).toBeNull();
  });

  it("drops single characters, which match almost everything", () => {
    expect(toPrefixTsQuery("a")).toBeNull();
    expect(toPrefixTsQuery("a pandas")).toBe("pandas:*");
  });

  it("caps the number of terms", () => {
    const many = Array.from({ length: 30 }, (_, index) => `termo${index}`).join(" ");

    expect(toPrefixTsQuery(many)?.split(" & ")).toHaveLength(8);
  });

  it("handles digits and mixed tokens", () => {
    expect(toPrefixTsQuery("postgres 17")).toBe("postgres:* & 17:*");
  });

  it("splits on punctuation rather than keeping it inside a term", () => {
    expect(toPrefixTsQuery("data-analysis")).toBe("data:* & analysis:*");
    expect(toPrefixTsQuery("xG, PPDA")).toBe("xg:* & ppda:*");
  });
});
