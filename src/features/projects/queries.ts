import "server-only";

import { cache } from "react";

import type { ProjectFilters } from "@/features/projects/schemas";
import { requireUser } from "@/lib/auth/dal";
import type { ProjectStatus } from "@/lib/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

/**
 * Reads for projects and what they link to.
 *
 * No pagination: a personal vault has a handful to dozens of projects, the
 * same order of magnitude as areas and tags, which do not paginate either.
 */

export type ProjectSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  knowledgeCount: number;
};

export type LinkedKnowledgeNote = { id: string; title: string; note: string | null };

export type ProjectDetail = ProjectSummary & {
  knowledge: LinkedKnowledgeNote[];
};

const LIST_SELECT =
  "id, name, slug, description, status, started_at, ended_at, created_at, knowledge_projects(count)";

type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  knowledge_projects: { count: number }[];
};

export async function listProjects(filters: ProjectFilters): Promise<ProjectSummary[]> {
  await requireUser();

  const supabase = await createSupabaseServerClient();
  let query = supabase.from("projects").select(LIST_SELECT).order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[projects] list failed:", error.message);

    return [];
  }

  return (data ?? []).map(toSummary);
}

// A separate select from `LIST_SELECT`, not an extension of it: PostgREST
// resolves one specifier per relation name, so `knowledge_projects(count)` and
// `knowledge_projects(note, knowledge(...))` cannot both appear in the same
// query. The detail page needs the actual linked records, so it embeds those
// directly and derives the count from how many come back.
const DETAIL_SELECT =
  "id, name, slug, description, status, started_at, ended_at, created_at, knowledge_projects(note, knowledge(id, title))";

type ProjectDetailRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  knowledge_projects: { note: string | null; knowledge: { id: string; title: string } | null }[];
};

export const getProjectById = cache(async (id: string): Promise<ProjectDetail | null> => {
  await requireUser();

  if (!isUuid(id)) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[projects] detail failed:", error.message);
    }

    return null;
  }

  const row = data as ProjectDetailRow;

  // The join row survives even if RLS or a race filters the embedded
  // knowledge out, so the filter is what keeps a broken row from rendering as
  // a link to nowhere.
  const knowledge = (row.knowledge_projects ?? [])
    .filter(
      (link): link is { note: string | null; knowledge: { id: string; title: string } } =>
        link.knowledge !== null,
    )
    .map((link) => ({ id: link.knowledge.id, title: link.knowledge.title, note: link.note }));

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    knowledgeCount: knowledge.length,
    knowledge,
  };
});

/** Minimal list for pickers, such as attaching a project to a knowledge record. */
export const listProjectOptions = cache(async (): Promise<{ id: string; name: string }[]> => {
  await requireUser();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("projects").select("id, name").order("name").limit(500);

  if (error) {
    console.error("[projects] options failed:", error.message);

    return [];
  }

  return data ?? [];
});

export type ProjectLink = { id: string; name: string; note: string | null };

/**
 * The other side of the same join, read from a knowledge record: which
 * projects it has been used in, and how.
 */
export async function listProjectsForKnowledge(knowledgeId: string): Promise<ProjectLink[]> {
  await requireUser();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("knowledge_projects")
    .select("note, created_at, projects(id, name)")
    .eq("knowledge_id", knowledgeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[projects] list for knowledge failed:", error.message);

    return [];
  }

  return (data ?? [])
    .filter(
      (link): link is { note: string | null; created_at: string; projects: { id: string; name: string } } =>
        link.projects !== null,
    )
    .map((link) => ({ id: link.projects.id, name: link.projects.name, note: link.note }));
}

function toSummary(row: ProjectRow): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    knowledgeCount: row.knowledge_projects?.[0]?.count ?? 0,
  };
}
