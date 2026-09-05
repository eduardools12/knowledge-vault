import { z } from "zod";

import { KNOWLEDGE_LEVELS, KNOWLEDGE_STATUSES, SOURCE_TYPES } from "@/lib/domain";

/**
 * Filters for the global search.
 *
 * Everything optional and anything unrecognised dropped, same as every list
 * filter in the app: a stale or hand-edited URL degrades to fewer filters
 * instead of an error page. `area`/`level`/`status` only ever narrow the
 * knowledge results and `sourceType` only the source results — `tag` is the
 * one filter that applies to both, since both entities can carry tags.
 */
export const searchFiltersSchema = z.object({
  q: z.string().trim().max(120).optional().catch(undefined),
  area: z.uuid().optional().catch(undefined),
  tag: z.uuid().optional().catch(undefined),
  level: z.enum(KNOWLEDGE_LEVELS).optional().catch(undefined),
  status: z.enum(KNOWLEDGE_STATUSES).optional().catch(undefined),
  sourceType: z.enum(SOURCE_TYPES).optional().catch(undefined),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;

/** Whether any filter — text or otherwise — was actually given. */
export function hasAnySearchFilter(filters: SearchFilters): boolean {
  return Boolean(
    filters.q || filters.area || filters.tag || filters.level || filters.status || filters.sourceType,
  );
}

/**
 * Whether this set of filters has anything to say about knowledge, sources,
 * respectively.
 *
 * Both database search functions list everything when given neither a query
 * nor a filter of their own — correct for "no filter at all", wrong for
 * "filtered by level", which has nothing to do with sources. These are what
 * keep a knowledge-only filter (`area`/`level`/`status`) from being sent to
 * `search_sources` as "no filter", which would silently list every source in
 * the vault instead of none.
 */
export function knowledgeFilterApplies(filters: SearchFilters): boolean {
  return Boolean(filters.q || filters.area || filters.tag || filters.level || filters.status);
}

export function sourceFilterApplies(filters: SearchFilters): boolean {
  return Boolean(filters.q || filters.tag || filters.sourceType);
}
