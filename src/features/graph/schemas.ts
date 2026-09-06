import { z } from "zod";

/**
 * URL state for `/grafo`, same convention as every other filtered list in the
 * app: state lives in the query string, shareable and surviving a reload.
 *
 * `center` is not a form field — it is set by clicking a node in the graph —
 * but it lives in the same URL-parsed object as `area` and `depth` because
 * all three narrow the same server-computed graph together.
 */
export const graphFiltersSchema = z.object({
  area: z.uuid().optional().catch(undefined),
  center: z.uuid().optional().catch(undefined),
  // Anything outside 1–3 falls back to the default rather than rendering an
  // unusably huge or pointlessly empty neighbourhood.
  depth: z.coerce.number().int().min(1).max(3).optional().catch(undefined),
});

export type GraphFilters = z.infer<typeof graphFiltersSchema>;
