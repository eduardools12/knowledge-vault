import "server-only";

import { cache } from "react";

import { sanitizeDocument, type KnowledgeDocument } from "@/features/knowledge/document";
import { PAGE_SIZE, type KnowledgeFilters } from "@/features/knowledge/schemas";
import { requireUser } from "@/lib/auth/dal";
import type { KnowledgeLevel, KnowledgeStatus, SourceType } from "@/lib/domain";
import { toPrefixTsQuery } from "@/lib/search";
import { isUuid } from "@/lib/uuid";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Reads for the knowledge section.
 *
 * As everywhere else, no query filters by `user_id`: Row Level Security scopes
 * every one of them. Writing the filter by hand would suggest the policy is
 * optional and would hide a broken policy behind a condition that happens to do
 * the same job.
 */

export type KnowledgeTag = { id: string; name: string; color: string | null };
export type LinkedSource = { id: string; title: string; type: SourceType };

export type KnowledgeSummary = {
  id: string;
  title: string;
  summary: string | null;
  level: KnowledgeLevel;
  status: KnowledgeStatus;
  createdAt: string;
  updatedAt: string;
  area: { id: string; name: string; color: string | null } | null;
  tags: KnowledgeTag[];
};

export type KnowledgeDetail = KnowledgeSummary & {
  content: KnowledgeDocument;
  contentText: string;
  archivedAt: string | null;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  reviewCount: number;
  sources: LinkedSource[];
};

const LIST_SELECT =
  "id, title, summary, level, status, created_at, updated_at, area:areas!knowledge_area_fk(id, name, color), knowledge_tags(tags(id, name, color))";

// A separate specifier from `LIST_SELECT`'s `knowledge_tags(tags(...))`, plus
// one more relation. PostgREST resolves one specifier per relation name, so
// this stays additive rather than redefining `knowledge_tags`.
const DETAIL_SELECT = `${LIST_SELECT}, content, content_text, archived_at, last_reviewed_at, next_review_at, review_count, knowledge_sources(sources(id, title, type))`;

export type KnowledgeListResult = {
  items: KnowledgeSummary[];
  total: number;
  page: number;
  pageCount: number;
};

export async function listKnowledge(filters: KnowledgeFilters): Promise<KnowledgeListResult> {
  await requireUser();

  const supabase = await createSupabaseServerClient();
  const page = filters.page ?? 1;
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("knowledge")
    .select(LIST_SELECT, { count: "exact" })
    .range(from, from + PAGE_SIZE - 1);

  // Archived records are hidden unless explicitly asked for. Archiving is how a
  // user says "not now"; honouring that is the whole point of the feature.
  query = filters.status ? query.eq("status", filters.status) : query.neq("status", "archived");

  if (filters.level) {
    query = query.eq("level", filters.level);
  }

  if (filters.area) {
    query = query.eq("area_id", filters.area);
  }

  const tsQuery = filters.q ? toPrefixTsQuery(filters.q) : null;

  if (tsQuery) {
    // Runs against the stored `search_vector`, so it covers title, summary and
    // body at once and uses the GIN index built in Etapa 1.
    query = query.textSearch("search_vector", tsQuery, { config: "portuguese" });
  }

  // Most recently touched first, even with a search term: this list is a
  // filtered view of a known collection, not a ranked result set — someone
  // typing into it expects the same recency order as the unfiltered list,
  // just narrowed. Relevance-ranked search (weighted, with a trigram
  // fallback) lives at `/busca` instead, via `search_knowledge()` — see
  // `features/search/queries.ts` — because PostgREST cannot order by
  // `ts_rank(...)` here at all.
  query = query.order("updated_at", { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error("[knowledge] list failed:", error.message);

    return { items: [], total: 0, page, pageCount: 1 };
  }

  const total = count ?? 0;

  return {
    items: (data ?? []).map(toSummary),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/**
 * A single record, or `null` when it does not exist — which, thanks to RLS, is
 * also the answer for a record belonging to somebody else. The caller renders a
 * 404 either way, so the two cases stay indistinguishable from outside.
 */
export const getKnowledgeById = cache(async (id: string): Promise<KnowledgeDetail | null> => {
  await requireUser();

  if (!isUuid(id)) {
    // Postgres raises a type error on a malformed uuid; catching it here turns
    // a junk URL into an ordinary 404 instead of a 500.
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("knowledge")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[knowledge] detail failed:", error.message);
    }

    return null;
  }

  const row = data as ListRow & {
    content: KnowledgeDocument;
    content_text: string;
    archived_at: string | null;
    last_reviewed_at: string | null;
    next_review_at: string | null;
    review_count: number;
    knowledge_sources: { sources: LinkedSource | null }[];
  };

  return {
    ...toSummary(row),
    // Sanitised on the way out as well as on the way in. Rows written before a
    // schema change — or by a future importer — must not be able to render
    // something the current schema would reject.
    content: sanitizeDocument(row.content),
    contentText: row.content_text,
    archivedAt: row.archived_at,
    lastReviewedAt: row.last_reviewed_at,
    nextReviewAt: row.next_review_at,
    reviewCount: row.review_count,
    // The join row survives even if RLS or a race filters the embedded source
    // out, so the filter is what keeps a broken row from rendering as a link
    // to nowhere.
    sources: (row.knowledge_sources ?? [])
      .map((link) => link.sources)
      .filter((source): source is LinkedSource => source !== null),
  };
});

type ListRow = {
  id: string;
  title: string;
  summary: string | null;
  level: KnowledgeLevel;
  status: KnowledgeStatus;
  created_at: string;
  updated_at: string;
  area: { id: string; name: string; color: string | null } | null;
  knowledge_tags: { tags: KnowledgeTag | null }[];
};

/** Minimal list for pickers, such as choosing the other side of a relation. */
export const listKnowledgeOptions = cache(
  async (excludeId?: string): Promise<{ id: string; title: string }[]> => {
    await requireUser();

    const supabase = await createSupabaseServerClient();
    let query = supabase.from("knowledge").select("id, title").order("title").limit(500);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[knowledge] options failed:", error.message);

      return [];
    }

    return data ?? [];
  },
);

function toSummary(row: ListRow): KnowledgeSummary {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    level: row.level,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    area: row.area,
    // The join row survives even if the tag embed comes back null, so the
    // filter is what keeps a broken row from rendering as an empty badge.
    tags: (row.knowledge_tags ?? [])
      .map((link) => link.tags)
      .filter((tag): tag is KnowledgeTag => tag !== null),
  };
}
