import "server-only";

import {
  hasAnySearchFilter,
  knowledgeFilterApplies,
  sourceFilterApplies,
  type SearchFilters,
} from "@/features/search/schemas";
import { requireUser } from "@/lib/auth/dal";
import type { KnowledgeLevel, KnowledgeStatus, SourceType } from "@/lib/domain";
import { toPrefixTsQuery } from "@/lib/search";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The global search, ranked by `search_knowledge` / `search_sources`.
 *
 * Those two functions exist because PostgREST's query builder has no way to
 * order by an expression like `ts_rank(...)` — there is no column to point
 * `.order()` at. See the migration and docs/database.md for the rest.
 */

type MatchKind = "exact" | "fuzzy";

export type KnowledgeSearchHit = {
  id: string;
  title: string;
  summary: string | null;
  level: KnowledgeLevel;
  status: KnowledgeStatus;
  updatedAt: string;
  matchKind: MatchKind;
};

export type SourceSearchHit = {
  id: string;
  title: string;
  type: SourceType;
  author: string | null;
  description: string | null;
  publishedAt: string | null;
  createdAt: string;
  matchKind: MatchKind;
};

export type SearchResults = {
  knowledge: KnowledgeSearchHit[];
  sources: SourceSearchHit[];
};

const EMPTY_RESULTS: SearchResults = { knowledge: [], sources: [] };

export async function search(filters: SearchFilters): Promise<SearchResults> {
  await requireUser();

  // Nothing typed and nothing picked: skip the round trips rather than
  // deciding what "everything" should mean here.
  if (!hasAnySearchFilter(filters)) {
    return EMPTY_RESULTS;
  }

  // Supabase's generated RPC types want `undefined` for "not passed", not
  // `null` — the database sees the same SQL NULL either way, but the client
  // types are stricter than the wire format.
  const q = filters.q || undefined;
  const tsQuery = (q ? toPrefixTsQuery(q) : null) ?? undefined;
  const supabase = await createSupabaseServerClient();

  const [knowledgeRes, sourcesRes] = await Promise.all([
    knowledgeFilterApplies(filters)
      ? supabase.rpc("search_knowledge", {
          q_tsquery: tsQuery,
          q_raw: q,
          filter_area: filters.area,
          filter_tag: filters.tag,
          filter_level: filters.level,
          filter_status: filters.status,
        })
      : { data: [], error: null },
    sourceFilterApplies(filters)
      ? supabase.rpc("search_sources", {
          q_tsquery: tsQuery,
          q_raw: q,
          filter_tag: filters.tag,
          filter_type: filters.sourceType,
        })
      : { data: [], error: null },
  ]);

  if (knowledgeRes.error) {
    console.error("[search] knowledge failed:", knowledgeRes.error.message);
  }

  if (sourcesRes.error) {
    console.error("[search] sources failed:", sourcesRes.error.message);
  }

  return {
    knowledge: (knowledgeRes.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      level: row.level,
      status: row.status,
      updatedAt: row.updated_at,
      matchKind: row.match_kind as MatchKind,
    })),
    sources: (sourcesRes.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      author: row.author,
      description: row.description,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      matchKind: row.match_kind as MatchKind,
    })),
  };
}
