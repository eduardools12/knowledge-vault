import "server-only";

import { cache } from "react";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

export type Tag = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  knowledgeCount: number;
  sourceCount: number;
};

const SELECT = "id, name, slug, color, knowledge_tags(count), source_tags(count)";

type TagRow = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  knowledge_tags: { count: number }[];
  source_tags: { count: number }[];
};

export const listTags = cache(async (): Promise<Tag[]> => {
  await requireUser();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("tags").select(SELECT).order("name");

  if (error) {
    console.error("[tags] list failed:", error.message);

    return [];
  }

  return (data ?? []).map(toTag);
});

export const getTagById = cache(async (id: string): Promise<Tag | null> => {
  await requireUser();

  if (!isUuid(id)) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("tags").select(SELECT).eq("id", id).maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[tags] detail failed:", error.message);
    }

    return null;
  }

  return toTag(data);
});

function toTag(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    color: row.color,
    // PostgREST returns an aggregate embed as a one-element array; a tag used
    // nowhere comes back empty rather than as zero.
    knowledgeCount: row.knowledge_tags?.[0]?.count ?? 0,
    sourceCount: row.source_tags?.[0]?.count ?? 0,
  };
}
