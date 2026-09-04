import "server-only";

import { cache } from "react";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { KNOWLEDGE_LEVELS, type KnowledgeLevel } from "@/lib/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Reads that back the dashboard.
 *
 * Every query here runs as the signed-in user, so Row Level Security scopes the
 * results — there is deliberately no `.eq("user_id", ...)` anywhere below.
 * Adding one would imply the policy is optional and quietly hide a broken
 * policy behind a filter that happens to do the same job.
 */

// -----------------------------------------------------------------------------
// Aggregates
// -----------------------------------------------------------------------------

/**
 * The database returns `jsonb`, which the generated types can only describe as
 * `Json`. Parsing it restores a real type at the boundary and turns a schema
 * change that was not reflected in the migration into a loud failure here,
 * rather than `undefined` rendering as an empty card.
 */
const summaryRowSchema = z.object({
  knowledge_total: z.number().int(),
  knowledge_archived: z.number().int(),
  sources_total: z.number().int(),
  areas_total: z.number().int(),
  tags_total: z.number().int(),
  projects_active: z.number().int(),
  relations_total: z.number().int(),
  inbox_unprocessed: z.number().int(),
  needs_review: z.number().int(),
  without_sources: z.number().int(),
  added_this_week: z.number().int(),
  updated_this_week: z.number().int(),
  by_level: z.record(z.string(), z.number().int()),
  top_area_this_week: z
    .object({ id: z.uuid(), name: z.string(), total: z.number().int() })
    .nullable(),
});

export type DashboardSummary = {
  knowledgeTotal: number;
  knowledgeArchived: number;
  sourcesTotal: number;
  areasTotal: number;
  tagsTotal: number;
  projectsActive: number;
  relationsTotal: number;
  inboxUnprocessed: number;
  needsReview: number;
  withoutSources: number;
  addedThisWeek: number;
  updatedThisWeek: number;
  byLevel: Record<KnowledgeLevel, number>;
  topAreaThisWeek: { id: string; name: string; total: number } | null;
};

/** Used when the vault is empty or the summary could not be read. */
const EMPTY_SUMMARY: DashboardSummary = {
  knowledgeTotal: 0,
  knowledgeArchived: 0,
  sourcesTotal: 0,
  areasTotal: 0,
  tagsTotal: 0,
  projectsActive: 0,
  relationsTotal: 0,
  inboxUnprocessed: 0,
  needsReview: 0,
  withoutSources: 0,
  addedThisWeek: 0,
  updatedThisWeek: 0,
  byLevel: { discovered: 0, understood: 0, practiced: 0, mastered: 0 },
  topAreaThisWeek: null,
};

export const getDashboardSummary = cache(async (): Promise<DashboardSummary> => {
  await requireUser();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("dashboard_summary");

  if (error) {
    console.error("[dashboard] dashboard_summary failed:", error.message);
    return EMPTY_SUMMARY;
  }

  const parsed = summaryRowSchema.safeParse(data);

  if (!parsed.success) {
    console.error("[dashboard] unexpected summary shape:", z.prettifyError(parsed.error));
    return EMPTY_SUMMARY;
  }

  const row = parsed.data;

  return {
    knowledgeTotal: row.knowledge_total,
    knowledgeArchived: row.knowledge_archived,
    sourcesTotal: row.sources_total,
    areasTotal: row.areas_total,
    tagsTotal: row.tags_total,
    projectsActive: row.projects_active,
    relationsTotal: row.relations_total,
    inboxUnprocessed: row.inbox_unprocessed,
    needsReview: row.needs_review,
    withoutSources: row.without_sources,
    addedThisWeek: row.added_this_week,
    updatedThisWeek: row.updated_this_week,
    // The SQL omits levels with no rows. Filling the zeros here means a level
    // added to the enum later renders as "0" instead of crashing the chart.
    byLevel: Object.fromEntries(
      KNOWLEDGE_LEVELS.map((level) => [level, row.by_level[level] ?? 0]),
    ) as Record<KnowledgeLevel, number>,
    topAreaThisWeek: row.top_area_this_week,
  };
});

// -----------------------------------------------------------------------------
// Recent activity
// -----------------------------------------------------------------------------

export type KnowledgeListItem = {
  id: string;
  title: string;
  level: KnowledgeLevel;
  createdAt: string;
  updatedAt: string;
  area: { id: string; name: string; color: string | null } | null;
};

/**
 * `areas!knowledge_area_fk` names the constraint explicitly. The foreign key is
 * composite — `(user_id, area_id)` — and being explicit keeps the query working
 * if a second path between the two tables is ever added.
 */
const KNOWLEDGE_LIST_SELECT =
  "id, title, level, created_at, updated_at, area:areas!knowledge_area_fk(id, name, color)";

const RECENT_LIMIT = 5;

async function fetchKnowledgeList(
  orderBy: "created_at" | "updated_at",
): Promise<KnowledgeListItem[]> {
  const supabase = await createSupabaseServerClient();

  // A record that has never been edited still has `updated_at == created_at`,
  // so ordering by `updated_at` alone would render the "recently edited" list
  // as an exact copy of "recently added". PostgREST filters compare a column to
  // a literal, never to another column, so the pair is dropped here instead —
  // over-fetching a little to keep the list full after filtering.
  const shouldExcludeUntouched = orderBy === "updated_at";
  const limit = shouldExcludeUntouched ? RECENT_LIMIT * 3 : RECENT_LIMIT;

  const { data, error } = await supabase
    .from("knowledge")
    .select(KNOWLEDGE_LIST_SELECT)
    .neq("status", "archived")
    .order(orderBy, { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`[dashboard] recent knowledge by ${orderBy} failed:`, error.message);
    return [];
  }

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    level: row.level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    area: row.area,
  }));

  return (shouldExcludeUntouched ? rows.filter((row) => row.updatedAt !== row.createdAt) : rows).slice(
    0,
    RECENT_LIMIT,
  );
}

export const getRecentlyAdded = cache(async (): Promise<KnowledgeListItem[]> => {
  await requireUser();
  return fetchKnowledgeList("created_at");
});

export const getRecentlyUpdated = cache(async (): Promise<KnowledgeListItem[]> => {
  await requireUser();
  return fetchKnowledgeList("updated_at");
});
