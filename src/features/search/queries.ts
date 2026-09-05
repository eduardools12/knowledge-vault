import "server-only";

import {
  hasAnySearchFilter,
  knowledgeFilterApplies,
  sourceFilterApplies,
  type SearchFilters,
} from "@/features/search/schemas";
import { requireUser } from "@/lib/auth/dal";
import { embedTexts } from "@/lib/embeddings/client";
import { EmbeddingError } from "@/lib/embeddings/errors";
import type { KnowledgeLevel, KnowledgeStatus, SourceType } from "@/lib/domain";
import { reciprocalRankFusion, toPrefixTsQuery } from "@/lib/search";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The global search: hybrid since Etapa 11, keyword-only before it.
 *
 * `search_knowledge` / `search_sources` rank by `ts_rank`, with a trigram
 * fallback on the title. `search_knowledge_semantic` / `search_sources_semantic`
 * rank the same tables by cosine distance over `public.embeddings`. Both
 * kinds of function exist for the same reason: PostgREST cannot order by an
 * expression, so ranking has to happen in SQL either way. See the Etapa 8 and
 * Etapa 11 migrations, and docs/database.md.
 *
 * The two rankings are combined here, in application code, via
 * `reciprocalRankFusion` — not in one SQL query — because `ts_rank` and
 * cosine distance are not the same scale and there is no principled way to
 * make Postgres compare them directly.
 */

type MatchKind = "exact" | "fuzzy" | "semantic";

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
  const user = await requireUser();

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

  const [knowledgeRes, sourcesRes, queryEmbedding] = await Promise.all([
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
    // A filter with no text has nothing for semantic search to compare
    // against — `q` is the only trigger for this half, independent of
    // `knowledgeFilterApplies`/`sourceFilterApplies`, which also turn on for
    // a filter-only query that has no text at all.
    q ? embedQuery(user.id, q) : null,
  ]);

  if (knowledgeRes.error) {
    console.error("[search] knowledge failed:", knowledgeRes.error.message);
  }

  if (sourcesRes.error) {
    console.error("[search] sources failed:", sourcesRes.error.message);
  }

  const knowledgeHits: KnowledgeSearchHit[] = (knowledgeRes.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    level: row.level,
    status: row.status,
    updatedAt: row.updated_at,
    matchKind: row.match_kind as MatchKind,
  }));

  const sourceHits: SourceSearchHit[] = (sourcesRes.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    author: row.author,
    description: row.description,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    matchKind: row.match_kind as MatchKind,
  }));

  if (!queryEmbedding) {
    return { knowledge: knowledgeHits, sources: sourceHits };
  }

  const [semanticKnowledgeRes, semanticSourcesRes] = await Promise.all([
    knowledgeFilterApplies(filters)
      ? supabase.rpc("search_knowledge_semantic", {
          query_embedding: queryEmbedding,
          filter_area: filters.area,
          filter_tag: filters.tag,
          filter_level: filters.level,
          filter_status: filters.status,
        })
      : { data: [], error: null },
    sourceFilterApplies(filters)
      ? supabase.rpc("search_sources_semantic", {
          query_embedding: queryEmbedding,
          filter_tag: filters.tag,
          filter_type: filters.sourceType,
        })
      : { data: [], error: null },
  ]);

  if (semanticKnowledgeRes.error) {
    console.error("[search] semantic knowledge failed:", semanticKnowledgeRes.error.message);
  }

  if (semanticSourcesRes.error) {
    console.error("[search] semantic sources failed:", semanticSourcesRes.error.message);
  }

  const semanticKnowledgeHits: KnowledgeSearchHit[] = (semanticKnowledgeRes.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    level: row.level,
    status: row.status,
    updatedAt: row.updated_at,
    matchKind: "semantic",
  }));

  const semanticSourceHits: SourceSearchHit[] = (semanticSourcesRes.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    author: row.author,
    description: row.description,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    matchKind: "semantic",
  }));

  return {
    // Keyword list first: when the same record appears in both, its real
    // match kind ("exact"/"fuzzy") wins over "semantic" — see
    // `reciprocalRankFusion`'s doc comment.
    knowledge: reciprocalRankFusion([knowledgeHits, semanticKnowledgeHits]),
    sources: reciprocalRankFusion([sourceHits, semanticSourceHits]),
  };
}

/**
 * Turns the typed query into a vector, or `null` on any failure — a missing
 * `OPENAI_API_KEY`, a rate limit, an outage. Semantic search is an addition
 * to keyword search, never a replacement for it, so losing this half must
 * degrade the page to Etapa 8's behaviour, not break it. Same reasoning as
 * `translateAiError` in `features/inbox/actions.ts`: an optional AI feature
 * failing must never look like the whole page is broken.
 */
async function embedQuery(userId: string, query: string): Promise<string | null> {
  try {
    const result = await embedTexts(userId, { texts: [query] });

    // The generated column/argument type is `string` — pgvector's own text
    // input format, `"[0.1,0.2,...]"` — not a plain array.
    return JSON.stringify(result.vectors[0]);
  } catch (error) {
    if (error instanceof EmbeddingError) {
      console.error("[search] semantic search unavailable:", error.message);
    } else {
      console.error("[search] semantic search failed unexpectedly:", error);
    }

    return null;
  }
}
