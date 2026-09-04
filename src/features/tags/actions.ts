"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { tagFormSchema } from "@/features/tags/schemas";
import { requireUser } from "@/lib/auth/dal";
import { formError, formSuccess, parseFormData, type FormState } from "@/lib/forms";
import { resolveUniqueSlug, UNIQUE_VIOLATION } from "@/lib/resolve-slug";
import { ROUTES } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const idSchema = z.uuid({ error: "Registro inválido." });

function revalidateTags() {
  revalidatePath(ROUTES.tags);
  revalidatePath(ROUTES.knowledge);
  revalidatePath(ROUTES.sources);
  revalidatePath(ROUTES.dashboard);
}

function translateTagError(error: { code?: string; message: string }): string {
  if (error.code === UNIQUE_VIOLATION) {
    return "Já existe uma tag com esse nome.";
  }

  console.error("[tags] write failed:", error.message);

  return "Não foi possível salvar a tag. Tente novamente.";
}

/**
 * Creating stays on the page and returns a success state rather than
 * redirecting: tags are made in bursts, and bouncing the user elsewhere after
 * each one would make adding five of them five round trips.
 */
export async function createTagAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseFormData(tagFormSchema, formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const { name, color } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const slug = await resolveUniqueSlug(supabase, "tags", name);

  if (!slug) {
    return formError("Escolha um nome com pelo menos uma letra ou número.", {
      name: ["Este nome não gera um endereço válido."],
    });
  }

  const { error } = await supabase.from("tags").insert({ user_id: user.id, name, slug, color });

  if (error) {
    return formError(translateTagError(error));
  }

  revalidateTags();

  return formSuccess(`Tag “${name}” criada.`);
}

export async function updateTagAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const id = idSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return formError("Registro inválido.");
  }

  const parsed = parseFormData(tagFormSchema, formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const { name, color } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const slug = await resolveUniqueSlug(supabase, "tags", name, id.data);

  if (!slug) {
    return formError("Escolha um nome com pelo menos uma letra ou número.", {
      name: ["Este nome não gera um endereço válido."],
    });
  }

  const { data, error } = await supabase
    .from("tags")
    .update({ name, slug, color })
    .eq("id", id.data)
    .select("id")
    .maybeSingle();

  if (error) {
    return formError(translateTagError(error));
  }

  if (!data) {
    return formError("Esta tag não existe mais.");
  }

  revalidateTags();
  redirect(ROUTES.tags);
}

/**
 * Deleting a tag removes it from everything it was on.
 *
 * The join tables cascade, so the links disappear with the tag — but the
 * knowledge and the sources themselves are untouched. A tag is a label.
 */
export async function deleteTagAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = idSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("tags").delete().eq("id", id.data);

  if (error) {
    console.error("[tags] delete failed:", error.message);
  }

  revalidateTags();
  redirect(ROUTES.tags);
}
