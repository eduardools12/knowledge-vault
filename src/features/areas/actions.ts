"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { areaFormSchema } from "@/features/areas/schemas";
import { requireUser } from "@/lib/auth/dal";
import { formError, parseFormData, type FormState } from "@/lib/forms";
import { resolveUniqueSlug, UNIQUE_VIOLATION } from "@/lib/resolve-slug";
import { ROUTES } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const idSchema = z.uuid({ error: "Registro inválido." });

function revalidateAreas() {
  revalidatePath(ROUTES.areas);
  // An area name shows on knowledge rows and the dashboard counts areas.
  revalidatePath(ROUTES.knowledge);
  revalidatePath(ROUTES.dashboard);
}

/**
 * Postgres rejects a cycle with `check_violation` raised by the
 * `areas_prevent_cycle` trigger. The picker already hides descendants, so
 * reaching this means a hand-crafted post or a race with another tab — either
 * way it deserves the real reason rather than "tente novamente".
 */
function translateAreaError(error: { code?: string; message: string }): string {
  if (error.code === UNIQUE_VIOLATION) {
    return "Já existe uma área com esse nome.";
  }

  if (error.message.includes("descendente de si mesma")) {
    return "Uma área não pode ficar dentro de si mesma.";
  }

  console.error("[areas] write failed:", error.message);

  return "Não foi possível salvar a área. Tente novamente.";
}

export async function createAreaAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseFormData(areaFormSchema, formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const { name, description, color, parentId } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const slug = await resolveUniqueSlug(supabase, "areas", name);

  if (!slug) {
    return formError("Escolha um nome com pelo menos uma letra ou número.", {
      name: ["Este nome não gera um endereço válido."],
    });
  }

  const { error } = await supabase
    .from("areas")
    .insert({ user_id: user.id, name, slug, description, color, parent_id: parentId });

  if (error) {
    return formError(translateAreaError(error));
  }

  revalidateAreas();
  redirect(ROUTES.areas);
}

export async function updateAreaAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const id = idSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return formError("Registro inválido.");
  }

  const parsed = parseFormData(areaFormSchema, formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const { name, description, color, parentId } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const slug = await resolveUniqueSlug(supabase, "areas", name, id.data);

  if (!slug) {
    return formError("Escolha um nome com pelo menos uma letra ou número.", {
      name: ["Este nome não gera um endereço válido."],
    });
  }

  const { data, error } = await supabase
    .from("areas")
    .update({ name, slug, description, color, parent_id: parentId })
    .eq("id", id.data)
    .select("id")
    .maybeSingle();

  if (error) {
    return formError(translateAreaError(error));
  }

  if (!data) {
    return formError("Esta área não existe mais.");
  }

  revalidateAreas();
  redirect(ROUTES.areas);
}

/**
 * Deleting an area does not delete what is filed under it.
 *
 * The foreign keys are `on delete set null`, so knowledge loses its area and
 * child areas move to the top level. That is deliberate: an area is a label,
 * and losing the label should never mean losing the knowledge.
 */
export async function deleteAreaAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = idSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("areas").delete().eq("id", id.data);

  if (error) {
    console.error("[areas] delete failed:", error.message);
  }

  revalidateAreas();
  redirect(ROUTES.areas);
}
