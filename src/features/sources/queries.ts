import "server-only";

import { cache } from "react";

import type { SourceFilters } from "@/features/sources/schemas";
import { createSignedUrl } from "@/features/sources/storage";
import { requireUser } from "@/lib/auth/dal";
import type { SourceType } from "@/lib/domain";
import { toPrefixTsQuery } from "@/lib/search";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

export const SOURCES_PAGE_SIZE = 20;

export type SourceTag = { id: string; name: string; color: string | null };

export type SourceSummary = {
  id: string;
  title: string;
  type: SourceType;
  url: string | null;
  author: string | null;
  description: string | null;
  publishedAt: string | null;
  createdAt: string;
  hasFile: boolean;
  tags: SourceTag[];
  knowledgeCount: number;
};

export type LinkedKnowledge = { id: string; title: string };

export type SourceDetail = SourceSummary & {
  content: string | null;
  storagePath: string | null;
  /** Short-lived link for the attached file, generated at render time. */
  fileUrl: string | null;
  /** Knowledge records that cite this source. */
  linkedKnowledge: LinkedKnowledge[];
};

const LIST_SELECT =
  "id, title, type, url, author, description, published_at, created_at, storage_path, source_tags(tags(id, name, color)), knowledge_sources(count)";

type SourceRow = {
  id: string;
  title: string;
  type: SourceType;
  url: string | null;
  author: string | null;
  description: string | null;
  published_at: string | null;
  created_at: string;
  storage_path: string | null;
  source_tags: { tags: SourceTag | null }[];
  knowledge_sources: { count: number }[];
};

export type SourceListResult = {
  items: SourceSummary[];
  total: number;
  page: number;
  pageCount: number;
};

export async function listSources(filters: SourceFilters): Promise<SourceListResult> {
  await requireUser();

  const supabase = await createSupabaseServerClient();
  const page = filters.page ?? 1;
  const from = (page - 1) * SOURCES_PAGE_SIZE;

  let query = supabase
    .from("sources")
    .select(LIST_SELECT, { count: "exact" })
    .range(from, from + SOURCES_PAGE_SIZE - 1)
    .order("created_at", { ascending: false });

  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  const tsQuery = filters.q ? toPrefixTsQuery(filters.q) : null;

  if (tsQuery) {
    // The generated `search_vector` on `sources` already covers title, author,
    // description and the extracted content.
    query = query.textSearch("search_vector", tsQuery, { config: "portuguese" });
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[sources] list failed:", error.message);

    return { items: [], total: 0, page, pageCount: 1 };
  }

  const total = count ?? 0;

  return {
    items: (data ?? []).map(toSummary),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / SOURCES_PAGE_SIZE)),
  };
}

// A separate select from `LIST_SELECT`, not an extension of it: PostgREST
// resolves one specifier per relation name, so `knowledge_sources(count)` and
// `knowledge_sources(knowledge(id, title))` cannot both appear in the same
// query. The detail page needs the actual linked records rather than a count,
// so it embeds those directly and derives the count from how many come back.
const DETAIL_SELECT =
  "id, title, type, url, author, description, published_at, created_at, storage_path, content, source_tags(tags(id, name, color)), knowledge_sources(knowledge(id, title))";

type SourceDetailRow = {
  id: string;
  title: string;
  type: SourceType;
  url: string | null;
  author: string | null;
  description: string | null;
  published_at: string | null;
  created_at: string;
  storage_path: string | null;
  content: string | null;
  source_tags: { tags: SourceTag | null }[];
  knowledge_sources: { knowledge: LinkedKnowledge | null }[];
};

export const getSourceById = cache(async (id: string): Promise<SourceDetail | null> => {
  await requireUser();

  if (!isUuid(id)) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sources")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[sources] detail failed:", error.message);
    }

    return null;
  }

  const row = data as SourceDetailRow;

  // The join row survives even if RLS or a race filters the embedded knowledge
  // out, so the filter is what keeps a broken row from rendering as a link to
  // nowhere.
  const linkedKnowledge = (row.knowledge_sources ?? [])
    .map((link) => link.knowledge)
    .filter((k): k is LinkedKnowledge => k !== null);

  return {
    id: row.id,
    title: row.title,
    type: row.type,
    url: row.url,
    author: row.author,
    description: row.description,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    hasFile: Boolean(row.storage_path),
    tags: toTags(row.source_tags),
    knowledgeCount: linkedKnowledge.length,
    content: row.content,
    storagePath: row.storage_path,
    // Signed here rather than stored: the URL expires, so persisting it would
    // mean serving dead links.
    fileUrl: row.storage_path ? await createSignedUrl(supabase, row.storage_path) : null,
    linkedKnowledge,
  };
});

/** Minimal list for pickers, such as attaching sources to a knowledge record. */
export const listSourceOptions = cache(
  async (): Promise<{ id: string; title: string; type: SourceType }[]> => {
    await requireUser();

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("sources")
      .select("id, title, type")
      .order("title")
      .limit(500);

    if (error) {
      console.error("[sources] options failed:", error.message);

      return [];
    }

    return data ?? [];
  },
);

function toSummary(row: SourceRow): SourceSummary {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    url: row.url,
    author: row.author,
    description: row.description,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    hasFile: Boolean(row.storage_path),
    tags: toTags(row.source_tags),
    knowledgeCount: row.knowledge_sources?.[0]?.count ?? 0,
  };
}

/**
 * The join row survives even if the tag embed comes back null, so the filter
 * is what keeps a broken row from rendering as an empty badge.
 */
function toTags(links: { tags: SourceTag | null }[] | null | undefined): SourceTag[] {
  return (links ?? []).map((link) => link.tags).filter((tag): tag is SourceTag => tag !== null);
}
