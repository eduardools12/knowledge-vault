"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { relationFormSchema, resolveRelationEndpoints } from "@/features/relations/schemas";
import { requireUser } from "@/lib/auth/dal";
import { formError, parseFormData, type FormState } from "@/lib/forms";
import { UNIQUE_VIOLATION } from "@/lib/resolve-slug";
import { ROUTES } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Writes for the knowledge graph edges.
 *
 * Both actions redirect back to the current record's own page — there is no
 * dedicated relations screen, per the roadmap: this is a section of the
 * knowledge detail page, not a feature with its own route.
 */

const idSchema = z.uuid({ error: "Registro inválido." });

/** Postgres check-constraint violation, e.g. `knowledge_relations_no_self_link`. */
const CHECK_VIOLATION = "23514";

function translateRelationError(error: { code?: string }): string {
  if (error.code === UNIQUE_VIOLATION) {
    return "Essa relação já existe entre esses dois conhecimentos.";
  }

  if (error.code === CHECK_VIOLATION) {
    return "Um conhecimento não pode se relacionar com ele mesmo.";
  }

  return "Não foi possível salvar a relação. Tente novamente.";
}

export async function createRelationAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const knowledgeId = idSchema.safeParse(formData.get("knowledgeId"));

  if (!knowledgeId.success) {
    return formError("Registro inválido.");
  }

  const parsed = parseFormData(relationFormSchema, formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const { targetId, type, direction, note } = parsed.data;

  if (targetId === knowledgeId.data) {
    // Caught here for a message next to the field the user would fix; the
    // database's own check constraint is what actually guarantees it.
    return formError("Selecione um conhecimento diferente deste.", {
      targetId: ["Selecione um conhecimento diferente deste."],
    });
  }

  // `direction` decides which end this page's record occupies; `type` always
  // reads forward from `from` to `to`.
  const { fromId, toId } = resolveRelationEndpoints(knowledgeId.data, targetId, direction);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("knowledge_relations")
    .insert({ user_id: user.id, from_id: fromId, to_id: toId, type, note });

  if (error) {
    console.error("[relations] create failed:", error.message);

    return formError(translateRelationError(error));
  }

  revalidatePath(`${ROUTES.knowledge}/${knowledgeId.data}`);
  revalidatePath(`${ROUTES.knowledge}/${targetId}`);
  redirect(`${ROUTES.knowledge}/${knowledgeId.data}`);
}

export async function deleteRelationAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = idSchema.safeParse(formData.get("id"));
  const knowledgeId = idSchema.safeParse(formData.get("knowledgeId"));

  if (!id.success || !knowledgeId.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("knowledge_relations").delete().eq("id", id.data);

  if (error) {
    console.error("[relations] delete failed:", error.message);
  }

  revalidatePath(`${ROUTES.knowledge}/${knowledgeId.data}`);
  redirect(`${ROUTES.knowledge}/${knowledgeId.data}`);
}
