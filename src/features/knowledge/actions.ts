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

function revalidateKnowledge(id?: string) {
  revalidatePath(ROUTES.knowledge);
  // Counts and recent activity on the dashboard are now stale.
  revalidatePath(ROUTES.dashboard);

  if (id) {
    revalidatePath(`${ROUTES.knowledge}/${id}`);
  }
}

export async function createKnowledgeAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseFormData(knowledgeFormSchema, formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const { title, summary, content, level, status } = parsed.data;
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
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[knowledge] create failed:", error?.message);

    return formError("Não foi possível salvar o conhecimento. Tente novamente.");
  }

  revalidateKnowledge(data.id);
  redirect(`${ROUTES.knowledge}/${data.id}`);
}

const idSchema = z.uuid({ error: "Registro inválido." });

export async function updateKnowledgeAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const id = idSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return formError("Registro inválido.");
  }

  const parsed = parseFormData(knowledgeFormSchema, formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const { title, summary, content, level, status } = parsed.data;
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
