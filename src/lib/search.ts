/**
 * Turns what someone typed into a `tsquery` the database will accept.
 *
 * Postgres `to_tsquery` takes an expression, not a phrase: `&`, `|`, `!`, `:`
 * and parentheses are operators, and an unbalanced one is a syntax error rather
 * than an empty result. Handing raw input straight to it means the search box
 * throws as soon as somebody types an apostrophe.
 *
 * Every term gets a `:*` suffix so search matches as you type — "pand" finds
 * "Pandas". `websearch_to_tsquery` would sanitise the input for us but has no
 * prefix mode, which is the wrong trade for a filter box you type into.
 *
 * This is not SQL string-building: the result is sent as a parameter value.
 * The escaping here is about producing valid `tsquery` syntax, not about
 * injection.
 */
export function toPrefixTsQuery(input: string): string | null {
  const terms = input
    .toLowerCase()
    // Keep letters, digits and marks — `\p{L}` covers acentuação, which
    // `\w` would strip and leave "análise" searching for "an" and "lise".
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 0)
    // One-character terms match almost everything and only slow the query down.
    .filter((term) => term.length > 1)
    .slice(0, 8);

  if (terms.length === 0) {
    return null;
  }

  // `&` rather than `|`: typing more words should narrow the result, which is
  // what every search box has trained people to expect.
  return terms.map((term) => `${term}:*`).join(" & ");
}

/**
 * Combines ranked lists from different retrieval methods into one order,
 * using Reciprocal Rank Fusion — Etapa 11's way of merging keyword search
 * with semantic search without having to reconcile a `ts_rank` score against
 * a cosine distance, two numbers with no shared scale.
 *
 * Each item's score is the sum of `1 / (k + rank)` across every list it
 * appears in (1-indexed rank within that list). An item near the top of two
 * lists outranks one merely at the very top of one, which is the point: a
 * result both searches agree on is a better bet than one only a single
 * method found.
 *
 * `k = 60` is the constant the original RRF paper used and that most hybrid
 * search implementations keep by default — it just flattens the difference
 * between rank 1 and rank 2 enough that a middling result appearing in every
 * list isn't crowded out by one first-place finish.
 *
 * When the same id appears in more than one list, the item object from its
 * first occurrence wins — so passing the keyword list before the semantic one
 * keeps a hit's real match kind ("exact"/"fuzzy") instead of overwriting it
 * with whatever the semantic list would have said.
 */
export function reciprocalRankFusion<T extends { id: string }>(lists: T[][], k = 60): T[] {
  const scores = new Map<string, number>();
  const items = new Map<string, T>();

  for (const list of lists) {
    list.forEach((item, index) => {
      const rank = index + 1;
      scores.set(item.id, (scores.get(item.id) ?? 0) + 1 / (k + rank));

      if (!items.has(item.id)) {
        items.set(item.id, item);
      }
    });
  }

  return [...items.values()].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
}
