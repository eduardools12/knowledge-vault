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
