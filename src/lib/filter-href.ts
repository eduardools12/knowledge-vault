import type { ReadonlyURLSearchParams } from "next/navigation";

export type FilterChanges = Record<string, string | undefined>;

/**
 * Builds the next URL from the current one, applying a set of filter changes.
 *
 * Pure and shared by every filter bar, so a debounce effect can call it without
 * taking a function recreated on each render as a dependency.
 *
 * The page number is always dropped: page 3 of the old result set is usually
 * empty in the new one, and landing on an empty page after changing a filter
 * reads as "no results".
 */
export function buildFilterHref(
  pathname: string,
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
  changes: FilterChanges,
): string {
  const params = new URLSearchParams(searchParams.toString());

  for (const [key, value] of Object.entries(changes)) {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  }

  params.delete("page");

  const search = params.toString();

  return search ? `${pathname}?${search}` : pathname;
}
