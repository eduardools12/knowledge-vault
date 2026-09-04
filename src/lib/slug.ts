/**
 * Slugs for areas, tags and projects.
 *
 * The database enforces `^[a-z0-9]+(-[a-z0-9]+)*$` on these columns, so a name
 * that does not reduce to something matching is a constraint violation rather
 * than a bad-looking URL. In Portuguese that is the normal case, not an edge
 * one: "Estatística" and "Análise" are ordinary area names.
 */

const MAX_SLUG_LENGTH = 60;

/**
 * Turns a display name into a slug.
 *
 * Returns `null` when nothing usable survives — a name of only emoji or
 * punctuation. The caller decides what to do about it rather than getting an
 * empty string that would fail the CHECK constraint further down.
 */
export function slugify(value: string): string | null {
  const slug = value
    .normalize("NFD")
    // Strips the combining accents that NFD just separated, so "análise"
    // becomes "analise" instead of losing the letter entirely.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    // Slicing can leave a trailing hyphen when the cut lands on a separator.
    .replace(/-+$/g, "");

  return slug || null;
}

/**
 * Makes a slug unique against those already taken.
 *
 * Suffixes with `-2`, `-3`, … which is what people expect from a second area
 * called "Dados". `taken` is the set of slugs already used by this user; the
 * uniqueness constraint is per user, not global.
 *
 * The suffix is appended within the length limit, so a very long name cannot
 * produce a slug the database will reject.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);

  if (!used.has(base)) {
    return base;
  }

  for (let n = 2; n < 1000; n += 1) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/g, "")}${suffix}`;

    if (!used.has(candidate)) {
      return candidate;
    }
  }

  // A thousand areas with the same name is not a case worth designing for, but
  // silently returning a duplicate would be.
  return `${base.slice(0, MAX_SLUG_LENGTH - 14).replace(/-+$/g, "")}-${Date.now().toString(36)}`;
}
