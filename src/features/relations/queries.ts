import "server-only";

import { requireUser } from "@/lib/auth/dal";
import type { RelationType } from "@/lib/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Reads for the knowledge graph edges.
 *
 * A relation is directional (`from --type--> to`), and `knowledge_relations`
 * has two foreign keys into the same `knowledge` table — so each direction
 * needs its own query, disambiguated by constraint name
 * (`knowledge_relations_from_fk` / `_to_fk`), and the "other side" is always
 * aliased to `knowledge` so both rows come back the same shape.
 */

export type RelationSummary = {
  id: string;
  type: RelationType;
  note: string | null;
  createdAt: string;
  /** The record at the *other* end of this edge, whichever side that is. */
  knowledge: { id: string; title: string };
};

export type KnowledgeRelations = {
  /** This record --type--> `knowledge`. Rendered with the type's forward label. */
  outgoing: RelationSummary[];
  /** `knowledge` --type--> this record. Rendered with the type's inverse label. */
  incoming: RelationSummary[];
};

type RelationRow = {
  id: string;
  type: RelationType;
  note: string | null;
  created_at: string;
  knowledge: { id: string; title: string } | null;
};

export async function listRelationsForKnowledge(id: string): Promise<KnowledgeRelations> {
  await requireUser();

  const supabase = await createSupabaseServerClient();

  const [outgoingRes, incomingRes] = await Promise.all([
    supabase
      .from("knowledge_relations")
      .select("id, type, note, created_at, knowledge:knowledge!knowledge_relations_to_fk(id, title)")
      .eq("from_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("knowledge_relations")
      .select("id, type, note, created_at, knowledge:knowledge!knowledge_relations_from_fk(id, title)")
      .eq("to_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (outgoingRes.error) {
    console.error("[relations] outgoing list failed:", outgoingRes.error.message);
  }

  if (incomingRes.error) {
    console.error("[relations] incoming list failed:", incomingRes.error.message);
  }

  return {
    outgoing: toSummaries(outgoingRes.data),
    incoming: toSummaries(incomingRes.data),
  };
}

/**
 * The join row survives even if RLS or a race filters the embedded knowledge
 * out, so the filter is what keeps a broken row from rendering as a link to
 * nowhere — same reasoning as every other embed in this codebase.
 */
function toSummaries(rows: RelationRow[] | null | undefined): RelationSummary[] {
  return (rows ?? [])
    .filter((row): row is RelationRow & { knowledge: { id: string; title: string } } => row.knowledge !== null)
    .map((row) => ({
      id: row.id,
      type: row.type,
      note: row.note,
      createdAt: row.created_at,
      knowledge: row.knowledge,
    }));
}
