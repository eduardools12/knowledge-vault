"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { documentToPlainText } from "@/features/knowledge/document";
import { knowledgeFormSchema } from "@/features/knowledge/schemas";
import { requireUser } from "@/lib/auth/dal";
import { formError, parseFormData, type FormState } from "@/lib/forms";
import { ROUTES } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Writes for the knowledge section.
 *
 * Two rules hold throughout:
 *
 * - **`content_text` is derived here, never accepted from the client.** It is
 *   the search index; a browser that sent text not matching its own document
 *   could make a record findable by words it does not contain, or silently
 *   unfindable.
 *
 * - **Ownership is not checked in application code.** Row Level Security scopes
 *   every statement, so an update or delete aimed at somebody else's record
 *   simply affects zero rows. The actions below treat "zero rows" as "not
 *   found", which is also the right answer to give.
 */

/** `tagIds` and `sourceIds` are checkbox groups, read with `getAll`. */
const ARRAY_FIELDS = ["tagIds", "sourceIds"] as const;

function revalidateKnowledge(id?: string) {
  revalidatePath(ROUTES.knowledge);
  // Counts and recent activity on the dashboard are now stale.
  revalidatePath(ROUTES.dashboard);
  // A source's "conhecimentos que citam esta fonte" list is affected too.
  revalidatePath(ROUTES.sources);

  if (id) {
    revalidatePath(`${ROUTES.knowledge}/${id}`);
  }
}

/**
 * Replaces a knowledge record's tag links.
 *
 * Delete-then-insert rather than a diff: the set is small, the operation runs
 * once per save, and a diff would be more code for no observable difference.
 * The composite foreign keys make a link to another user's tag impossible
 * regardless.
 */
async function replaceKnowledgeTags(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  knowledgeId: string,
  tagIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("knowledge_tags")
    .delete()
    .eq("knowledge_id", knowledgeId);

  if (deleteError) {
    console.error("[knowledge] could not clear tags:", deleteError.message);

    return;
  }

  if (tagIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("knowledge_tags")
    .insert(tagIds.map((tagId) => ({ user_id: userId, knowledge_id: knowledgeId, tag_id: tagId })));

  if (error) {
    console.error("[knowledge] could not set tags:", error.message);
  }
}

/** Same shape as `replaceKnowledgeTags`, for the source links. */
async function replaceKnowledgeSources(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  knowledgeId: string,
  sourceIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("knowledge_sources")
    .delete()
    .eq("knowledge_id", knowledgeId);

  if (deleteError) {
    console.error("[knowledge] could not clear sources:", deleteError.message);

    return;
  }

  if (sourceIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("knowledge_sources")
    .insert(
      sourceIds.map((sourceId) => ({ user_id: userId, knowledge_id: knowledgeId, source_id: sourceId })),
    );

  if (error) {
    console.error("[knowledge] could not set sources:", error.message);
  }
}

export async function createKnowledgeAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseFormData(knowledgeFormSchema, formData, { arrayFields: ARRAY_FIELDS });

  if (!parsed.ok) {
    return parsed.state;
  }

  const { title, summary, content, level, status, areaId, tagIds, sourceIds } = parsed.data;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("knowledge")
    .insert({
      // Required by the NOT NULL column and by the RLS check; there is no
      // default, so a missing value is a failed insert rather than a silent
      // orphan.
      user_id: user.id,
      title,
      summary,
      content,
      content_text: documentToPlainText(content),
      level,
      status: status as "draft" | "active",
      area_id: areaId,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[knowledge] create failed:", error?.message);

    return formError("Não foi possível salvar o conhecimento. Tente novamente.");
  }

  await Promise.all([
    replaceKnowledgeTags(supabase, user.id, data.id, tagIds),
    replaceKnowledgeSources(supabase, user.id, data.id, sourceIds),
  ]);

  revalidateKnowledge(data.id);
  redirect(`${ROUTES.knowledge}/${data.id}`);
}

const idSchema = z.uuid({ error: "Registro inválido." });

export async function updateKnowledgeAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const id = idSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return formError("Registro inválido.");
  }

  const parsed = parseFormData(knowledgeFormSchema, formData, { arrayFields: ARRAY_FIELDS });

  if (!parsed.ok) {
    return parsed.state;
  }

  const { title, summary, content, level, status, areaId, tagIds, sourceIds } = parsed.data;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("knowledge")
    .update({
      title,
      summary,
      content,
      content_text: documentToPlainText(content),
      level,
      status: status as "draft" | "active",
      area_id: areaId,
    })
    .eq("id", id.data)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[knowledge] update failed:", error.message);

    return formError("Não foi possível salvar as alterações. Tente novamente.");
  }

  if (!data) {
    // Filtered out by RLS, or already deleted. Both mean the same to the user.
    return formError("Este conhecimento não existe mais.");
  }

  await Promise.all([
    replaceKnowledgeTags(supabase, user.id, id.data, tagIds),
    replaceKnowledgeSources(supabase, user.id, id.data, sourceIds),
  ]);

  revalidateKnowledge(id.data);
  redirect(`${ROUTES.knowledge}/${id.data}`);
}

/**
 * Archiving and restoring are the same operation in both directions, so they
 * share one action. `status` is the only field written: `archived_at` is
 * maintained by a database trigger precisely so the two cannot disagree.
 */
export async function setKnowledgeArchivedAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = idSchema.safeParse(formData.get("id"));
  const archived = formData.get("archived") === "true";

  if (!id.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("knowledge")
    .update({ status: archived ? "archived" : "active" })
    .eq("id", id.data);

  if (error) {
    console.error("[knowledge] archive toggle failed:", error.message);
  }

  revalidateKnowledge(id.data);
  redirect(`${ROUTES.knowledge}/${id.data}`);
}

export async function deleteKnowledgeAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = idSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("knowledge").delete().eq("id", id.data);

  if (error) {
    console.error("[knowledge] delete failed:", error.message);
  }

  revalidateKnowledge();
  // Back to the list: the page this was called from no longer exists.
  redirect(ROUTES.knowledge);
}
