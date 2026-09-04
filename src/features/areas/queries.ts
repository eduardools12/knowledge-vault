import "server-only";

import { cache } from "react";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

export type Area = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  parentId: string | null;
  /** Non-archived knowledge filed directly under this area. */
  knowledgeCount: number;
};

const SELECT = "id, name, slug, description, color, parent_id, knowledge(count)";

type AreaRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  parent_id: string | null;
  knowledge: { count: number }[];
};

/**
 * Every area, flat. The caller shapes it into a tree.
 *
 * All of them are fetched in one query rather than level by level: a personal
 * vault has tens of areas, not thousands, and one round trip beats a recursive
 * fetch that would need a query per level.
 */
export const listAreas = cache(async (): Promise<Area[]> => {
  await requireUser();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("areas").select(SELECT).order("name");

  if (error) {
    console.error("[areas] list failed:", error.message);

    return [];
  }

  return (data ?? []).map(toArea);
});

export const getAreaById = cache(async (id: string): Promise<Area | null> => {
  await requireUser();

  if (!isUuid(id)) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("areas").select(SELECT).eq("id", id).maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[areas] detail failed:", error.message);
    }

    return null;
  }

  return toArea(data);
});

function toArea(row: AreaRow): Area {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    color: row.color,
    parentId: row.parent_id,
    // PostgREST returns an aggregate embed as a one-element array. An area with
    // nothing filed under it comes back empty rather than as zero.
    knowledgeCount: row.knowledge?.[0]?.count ?? 0,
  };
}
