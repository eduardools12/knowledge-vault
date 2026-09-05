import { describe, expect, it } from "vitest";

import {
  hasAnySearchFilter,
  knowledgeFilterApplies,
  sourceFilterApplies,
} from "@/features/search/schemas";
import { reciprocalRankFusion, toPrefixTsQuery } from "@/lib/search";

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

/**
 * The search page decides whether to query at all, or show "digite algo para
 * buscar", based on this. Forgetting a filter here when a new one is added
 * would not crash — it would just query with an empty-looking filter set
 * while the page silently shows the "nothing selected" empty state instead.
 */
describe("hasAnySearchFilter", () => {
  it("is false when nothing is set", () => {
    expect(hasAnySearchFilter({})).toBe(false);
  });

  it("is true for a bare keyword", () => {
    expect(hasAnySearchFilter({ q: "pandas" })).toBe(true);
  });

  it("is true for each filter on its own, with no keyword", () => {
    expect(hasAnySearchFilter({ area: "11111111-1111-4111-8111-111111111111" })).toBe(true);
    expect(hasAnySearchFilter({ tag: "11111111-1111-4111-8111-111111111111" })).toBe(true);
    expect(hasAnySearchFilter({ level: "discovered" })).toBe(true);
    expect(hasAnySearchFilter({ status: "active" })).toBe(true);
    expect(hasAnySearchFilter({ sourceType: "book" })).toBe(true);
  });
});

/**
 * Both `search_knowledge` and `search_sources` list everything when given
 * neither a query nor a filter of their own — correct for "nothing was
 * filtered at all", wrong for "filtered by level", which says nothing about
 * sources. These two functions are what stop a knowledge-only filter from
 * being sent to the sources search as "no filter, list everything" — get
 * this wrong and picking a nível silently surfaces every source in the vault
 * alongside it.
 */
describe("knowledgeFilterApplies / sourceFilterApplies", () => {
  it("both apply to a bare keyword", () => {
    expect(knowledgeFilterApplies({ q: "pandas" })).toBe(true);
    expect(sourceFilterApplies({ q: "pandas" })).toBe(true);
  });

  it("both apply to a tag, since either entity can carry one", () => {
    const tag = "11111111-1111-4111-8111-111111111111";

    expect(knowledgeFilterApplies({ tag })).toBe(true);
    expect(sourceFilterApplies({ tag })).toBe(true);
  });

  it("a knowledge-only filter does not apply to sources", () => {
    const area = "11111111-1111-4111-8111-111111111111";

    expect(knowledgeFilterApplies({ area })).toBe(true);
    expect(sourceFilterApplies({ area })).toBe(false);

    expect(knowledgeFilterApplies({ level: "discovered" })).toBe(true);
    expect(sourceFilterApplies({ level: "discovered" })).toBe(false);

    expect(knowledgeFilterApplies({ status: "active" })).toBe(true);
    expect(sourceFilterApplies({ status: "active" })).toBe(false);
  });

  it("a source-only filter does not apply to knowledge", () => {
    expect(sourceFilterApplies({ sourceType: "book" })).toBe(true);
    expect(knowledgeFilterApplies({ sourceType: "book" })).toBe(false);
  });

  it("neither applies when nothing was given", () => {
    expect(knowledgeFilterApplies({})).toBe(false);
    expect(sourceFilterApplies({})).toBe(false);
  });
});

/**
 * The merge behind hybrid search (Etapa 11): combines the keyword ranking
 * from `search_knowledge`/`search_sources` with the semantic ranking from
 * `search_knowledge_semantic`/`search_sources_semantic`, neither of which is
 * on a scale the other understands.
 */
describe("reciprocalRankFusion", () => {
  it("keeps a single list's order when there is nothing to merge with", () => {
    const list = [{ id: "a" }, { id: "b" }, { id: "c" }];

    expect(reciprocalRankFusion([list])).toEqual(list);
  });

  it("ranks an id found by both lists above one found by only one", () => {
    // "shared" is #2 in the first list and #1 in the second; "only-first" is
    // #1 in the first list but absent from the second. Appearing in both
    // should outweigh a single first-place finish.
    const keyword = [{ id: "only-first" }, { id: "shared" }];
    const semantic = [{ id: "shared" }, { id: "only-second" }];

    const merged = reciprocalRankFusion([keyword, semantic]);

    expect(merged[0].id).toBe("shared");
  });

  it("keeps the first list's item object on overlap, not the second's", () => {
    // This is what lets a hit's real match kind ("exact"/"fuzzy") survive a
    // merge with the semantic list instead of being overwritten by it.
    const keyword = [{ id: "a", matchKind: "exact" }];
    const semantic = [{ id: "a", matchKind: "semantic" }];

    const merged = reciprocalRankFusion([keyword, semantic]);

    expect(merged).toEqual([{ id: "a", matchKind: "exact" }]);
  });

  it("returns an empty list for no input", () => {
    expect(reciprocalRankFusion([])).toEqual([]);
    expect(reciprocalRankFusion([[], []])).toEqual([]);
  });

  it("ranks a higher position above a lower one within a single list", () => {
    const list = [{ id: "first" }, { id: "second" }, { id: "third" }];

    expect(reciprocalRankFusion([list]).map((item) => item.id)).toEqual(["first", "second", "third"]);
  });
});
