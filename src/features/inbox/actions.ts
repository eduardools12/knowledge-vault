"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { listAreas } from "@/features/areas/queries";
import { suggestKnowledgeFromInboxItem } from "@/features/inbox/ai-suggestion";
import type { KnowledgeSuggestion, SuggestionState } from "@/features/inbox/ai-suggestion-prompt";
import { getInboxItemById } from "@/features/inbox/queries";
import { inboxCaptureSchema, inboxItemFormSchema } from "@/features/inbox/schemas";
import { isOwnedPath } from "@/features/inbox/storage-path";
import { removeFile } from "@/features/inbox/storage";
import { insertKnowledge, replaceKnowledgeSources, replaceKnowledgeTags } from "@/features/knowledge/actions";
import { knowledgeFormSchema } from "@/features/knowledge/schemas";
import { search } from "@/features/search/queries";
import { listTags } from "@/features/tags/queries";
import { requireUser } from "@/lib/auth/dal";
import { describeAiError } from "@/lib/ai/errors";
import { INBOX_STATUSES } from "@/lib/domain";
import { formError, formSuccess, parseFormData, type FormState } from "@/lib/forms";
import { ROUTES } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Writes for the inbox.
 *
 * The queue exists to make capture cheap, so `captureInboxItemAction` stays on
 * the same page and reports success instead of redirecting — the same choice
 * `createTagAction` makes, for the same reason: this gets used in bursts.
 */

const idSchema = z.uuid({ error: "Registro inválido." });

/** `tagIds` and `sourceIds` are checkbox groups, read with `getAll`. */
const KNOWLEDGE_ARRAY_FIELDS = ["tagIds", "sourceIds"] as const;

function revalidateInbox(id?: string) {
  revalidatePath(ROUTES.inbox);
  revalidatePath(ROUTES.dashboard);

  if (id) {
    revalidatePath(`${ROUTES.inbox}/${id}`);
  }
}

export async function captureInboxItemAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseFormData(inboxCaptureSchema, formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const { kind, title, url, content, storagePath } = parsed.data;

  // The browser uploads straight to Storage and submits the resulting path as
  // an ordinary field — so the path is user input, re-checked here against the
  // same `{user_id}/` rule the bucket policies enforce.
  if (storagePath && !isOwnedPath(storagePath, user.id)) {
    return formError("Arquivo inválido. Envie o arquivo novamente.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("inbox_items").insert({
    user_id: user.id,
    kind,
    title,
    url,
    content,
    storage_path: storagePath,
  });

  if (error) {
    console.error("[inbox] capture failed:", error.message);

    return formError("Não foi possível capturar. Tente novamente.");
  }

  revalidateInbox();

  return formSuccess("Capturado.");
}

export async function updateInboxItemAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const id = idSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return formError("Registro inválido.");
  }

  const parsed = parseFormData(inboxItemFormSchema, formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const { storagePath, ...fields } = parsed.data;

  if (storagePath && !isOwnedPath(storagePath, user.id)) {
    return formError("Arquivo inválido. Envie o arquivo novamente.");
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("inbox_items")
    .select("storage_path")
    .eq("id", id.data)
    .maybeSingle();

  const { data, error } = await supabase
    .from("inbox_items")
    .update({ ...fields, storage_path: storagePath })
    .eq("id", id.data)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[inbox] update failed:", error.message);

    return formError("Não foi possível salvar as alterações. Tente novamente.");
  }

  if (!data) {
    return formError("Este item não existe mais.");
  }

  if (existing?.storage_path && existing.storage_path !== storagePath) {
    await removeFile(supabase, existing.storage_path);
  }

  revalidateInbox(id.data);
  redirect(ROUTES.inbox);
}

/**
 * Moves an item between the four states without touching anything else.
 * Kept apart from the full edit so a single click on the list can archive or
 * reopen an item without leaving the page.
 */
export async function setInboxStatusAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = idSchema.safeParse(formData.get("id"));
  const status = z.enum(INBOX_STATUSES).safeParse(formData.get("status"));

  if (!id.success || !status.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("inbox_items")
    .update({ status: status.data })
    .eq("id", id.data);

  if (error) {
    console.error("[inbox] status change failed:", error.message);
  }

  revalidateInbox(id.data);
}

export async function deleteInboxItemAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = idSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("inbox_items")
    .select("storage_path")
    .eq("id", id.data)
    .maybeSingle();

  const { error } = await supabase.from("inbox_items").delete().eq("id", id.data);

  if (error) {
    console.error("[inbox] delete failed:", error.message);
  } else {
    await removeFile(supabase, existing?.storage_path ?? null);
  }

  revalidateInbox();
  redirect(ROUTES.inbox);
}

/**
 * Turns an inbox item into a structured knowledge record.
 *
 * Reuses `insertKnowledge` — the exact function a plain create runs — so a
 * processed item is created no differently from one typed straight into the
 * knowledge form. The only extra step is pointing the inbox item at what it
 * became, which is what keeps the capture's origin traceable.
 */
export async function processInboxItemAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const inboxItemId = idSchema.safeParse(formData.get("inboxItemId"));

  if (!inboxItemId.success) {
    return formError("Item inválido.");
  }

  const parsed = parseFormData(knowledgeFormSchema, formData, { arrayFields: KNOWLEDGE_ARRAY_FIELDS });

  if (!parsed.ok) {
    return parsed.state;
  }

  const { title, summary, content, level, status, areaId, tagIds, sourceIds } = parsed.data;
  const supabase = await createSupabaseServerClient();

  const inserted = await insertKnowledge(supabase, user.id, {
    title,
    summary,
    content,
    level,
    status: status as "draft" | "active",
    areaId,
  });

  if (!inserted) {
    return formError("Não foi possível criar o conhecimento. Tente novamente.");
  }

  await Promise.all([
    replaceKnowledgeTags(supabase, user.id, inserted.id, tagIds),
    replaceKnowledgeSources(supabase, user.id, inserted.id, sourceIds),
  ]);

  const { error } = await supabase
    .from("inbox_items")
    .update({ status: "processed", knowledge_id: inserted.id })
    .eq("id", inboxItemId.data);

  if (error) {
    // The knowledge record exists either way; losing the back-link only means
    // the inbox item forgets what it became, not that the write failed.
    console.error("[inbox] could not link processed item:", error.message);
  }

  revalidatePath(ROUTES.knowledge);
  revalidatePath(ROUTES.dashboard);
  revalidateInbox(inboxItemId.data);
  redirect(`${ROUTES.knowledge}/${inserted.id}`);
}

/** Most-specific-first, same chain `src/lib/ai/errors.ts` recommends catching. */
function translateAiError(error: unknown): string {
  return describeAiError(error, {
    logPrefix: "[inbox]",
    failureMessage: "Não foi possível gerar uma sugestão agora. Tente novamente.",
  });
}

/**
 * Asks the model to propose a title, summary, level, area and tags for an
 * inbox item — never writes anything. The suggestion only ever reaches
 * `knowledge` if the user reviews it in the form and submits
 * `processInboxItemAction` themselves, per docs/ai.md's "IA sugere; o usuário
 * decide".
 */
export async function suggestKnowledgeFromInboxItemAction(
  _prevState: SuggestionState,
  formData: FormData,
): Promise<SuggestionState> {
  const user = await requireUser();

  const itemId = idSchema.safeParse(formData.get("itemId"));

  if (!itemId.success) {
    return { status: "error", message: "Item inválido." };
  }

  const item = await getInboxItemById(itemId.data);

  if (!item) {
    return { status: "error", message: "Este item não existe mais." };
  }

  const [areas, tags] = await Promise.all([listAreas(), listTags()]);
  const areaOptions = areas.map((area) => ({ id: area.id, name: area.name }));
  const tagOptions = tags.map((tag) => ({ id: tag.id, name: tag.name }));

  let suggestion: KnowledgeSuggestion;

  try {
    suggestion = await suggestKnowledgeFromInboxItem(user.id, item, areaOptions, tagOptions);
  } catch (error) {
    return { status: "error", message: translateAiError(error) };
  }

  // A likely-duplicate check, done with the search Etapa 8 already built
  // (ranked keyword match, trigram fallback) rather than a second AI call —
  // cheaper, and it is exactly the tool built for "does something like this
  // already exist".
  const results = await search({ q: suggestion.title });
  const topHit = results.knowledge[0];

  return {
    status: "success",
    suggestion,
    possibleDuplicate: topHit ? { id: topHit.id, title: topHit.title } : null,
  };
}
