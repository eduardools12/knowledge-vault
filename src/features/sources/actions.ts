"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { sourceFormSchema } from "@/features/sources/schemas";
import { isOwnedPath } from "@/features/sources/storage-path";
import { removeFile } from "@/features/sources/storage";
import { requireUser } from "@/lib/auth/dal";
import { formError, parseFormData, type FormState } from "@/lib/forms";
import { ROUTES } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const idSchema = z.uuid({ error: "Registro inválido." });

/** `tagIds` is a group of checkboxes, so it has to be read with `getAll`. */
const ARRAY_FIELDS = ["tagIds"] as const;

function revalidateSources(id?: string) {
  revalidatePath(ROUTES.sources);
  revalidatePath(ROUTES.dashboard);
  // "Conhecimentos sem fonte" on the dashboard and the sources listed on a
  // knowledge page both change with these writes.
  revalidatePath(ROUTES.knowledge);

  if (id) {
    revalidatePath(`${ROUTES.sources}/${id}`);
  }
}

/**
 * Replaces a source's tag links.
 *
 * Delete-then-insert rather than a diff: the set is small, the operation runs
 * twice per save at most, and a diff would be more code for no observable
 * difference. The composite foreign keys make a link to another user's tag
 * impossible regardless.
 */
async function replaceSourceTags(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  sourceId: string,
  tagIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("source_tags")
    .delete()
    .eq("source_id", sourceId);

  if (deleteError) {
    console.error("[sources] could not clear tags:", deleteError.message);

    return;
  }

  if (tagIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("source_tags")
    .insert(tagIds.map((tagId) => ({ user_id: userId, source_id: sourceId, tag_id: tagId })));

  if (error) {
    console.error("[sources] could not set tags:", error.message);
  }
}

export async function createSourceAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseFormData(sourceFormSchema, formData, { arrayFields: ARRAY_FIELDS });

  if (!parsed.ok) {
    return parsed.state;
  }

  const { tagIds, storagePath, publishedAt, ...fields } = parsed.data;

  // The browser uploads straight to Storage and submits the resulting path as
  // an ordinary field — so the path is user input, and is re-checked here
  // against the same `{user_id}/` rule the bucket policies enforce.
  if (storagePath && !isOwnedPath(storagePath, user.id)) {
    return formError("Arquivo inválido. Envie o arquivo novamente.");
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("sources")
    .insert({
      user_id: user.id,
      ...fields,
      published_at: publishedAt,
      storage_path: storagePath,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[sources] create failed:", error?.message);

    return formError("Não foi possível salvar a fonte. Tente novamente.");
  }

  await replaceSourceTags(supabase, user.id, data.id, tagIds);

  revalidateSources(data.id);
  redirect(`${ROUTES.sources}/${data.id}`);
}

export async function updateSourceAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const id = idSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return formError("Registro inválido.");
  }

  const parsed = parseFormData(sourceFormSchema, formData, { arrayFields: ARRAY_FIELDS });

  if (!parsed.ok) {
    return parsed.state;
  }

  const { tagIds, storagePath, publishedAt, ...fields } = parsed.data;

  if (storagePath && !isOwnedPath(storagePath, user.id)) {
    return formError("Arquivo inválido. Envie o arquivo novamente.");
  }

  const supabase = await createSupabaseServerClient();

  // Read first, so the previous file can be removed once the new row is saved.
  const { data: existing } = await supabase
    .from("sources")
    .select("storage_path")
    .eq("id", id.data)
    .maybeSingle();

  const { data, error } = await supabase
    .from("sources")
    .update({ ...fields, published_at: publishedAt, storage_path: storagePath })
    .eq("id", id.data)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[sources] update failed:", error.message);

    return formError("Não foi possível salvar as alterações. Tente novamente.");
  }

  if (!data) {
    return formError("Esta fonte não existe mais.");
  }

  await replaceSourceTags(supabase, user.id, id.data, tagIds);

  // Only after the row points somewhere else. Deleting first would orphan the
  // source if the update then failed.
  if (existing?.storage_path && existing.storage_path !== storagePath) {
    await removeFile(supabase, existing.storage_path);
  }

  revalidateSources(id.data);
  redirect(`${ROUTES.sources}/${id.data}`);
}

export async function deleteSourceAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = idSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("sources")
    .select("storage_path")
    .eq("id", id.data)
    .maybeSingle();

  const { error } = await supabase.from("sources").delete().eq("id", id.data);

  if (error) {
    console.error("[sources] delete failed:", error.message);
  } else {
    await removeFile(supabase, existing?.storage_path ?? null);
  }

  revalidateSources();
  redirect(ROUTES.sources);
}
