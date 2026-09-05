"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { projectFormSchema, projectKnowledgeLinkSchema } from "@/features/projects/schemas";
import { requireUser } from "@/lib/auth/dal";
import { formError, parseFormData, type FormState } from "@/lib/forms";
import { resolveUniqueSlug, UNIQUE_VIOLATION } from "@/lib/resolve-slug";
import { ROUTES } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const idSchema = z.uuid({ error: "Registro inválido." });

function revalidateProjects(id?: string) {
  revalidatePath(ROUTES.projects);
  revalidatePath(ROUTES.dashboard);

  if (id) {
    revalidatePath(`${ROUTES.projects}/${id}`);
  }
}

function translateProjectError(error: { code?: string; message: string }): string {
  if (error.code === UNIQUE_VIOLATION) {
    return "Já existe um projeto com esse nome.";
  }

  console.error("[projects] write failed:", error.message);

  return "Não foi possível salvar o projeto. Tente novamente.";
}

export async function createProjectAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseFormData(projectFormSchema, formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const { name, description, status, startedAt, endedAt } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const slug = await resolveUniqueSlug(supabase, "projects", name);

  if (!slug) {
    return formError("Escolha um nome com pelo menos uma letra ou número.", {
      name: ["Este nome não gera um endereço válido."],
    });
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      slug,
      description,
      status,
      started_at: startedAt,
      ended_at: endedAt,
    })
    .select("id")
    .single();

  if (error || !data) {
    return formError(translateProjectError(error ?? { message: "insert returned no row" }));
  }

  revalidateProjects(data.id);
  redirect(`${ROUTES.projects}/${data.id}`);
}

export async function updateProjectAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const id = idSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return formError("Registro inválido.");
  }

  const parsed = parseFormData(projectFormSchema, formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const { name, description, status, startedAt, endedAt } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const slug = await resolveUniqueSlug(supabase, "projects", name, id.data);

  if (!slug) {
    return formError("Escolha um nome com pelo menos uma letra ou número.", {
      name: ["Este nome não gera um endereço válido."],
    });
  }

  const { data, error } = await supabase
    .from("projects")
    .update({ name, slug, description, status, started_at: startedAt, ended_at: endedAt })
    .eq("id", id.data)
    .select("id")
    .maybeSingle();

  if (error) {
    return formError(translateProjectError(error));
  }

  if (!data) {
    return formError("Este projeto não existe mais.");
  }

  revalidateProjects(id.data);
  redirect(`${ROUTES.projects}/${id.data}`);
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = idSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("projects").delete().eq("id", id.data);

  if (error) {
    console.error("[projects] delete failed:", error.message);
  }

  revalidateProjects();
  redirect(ROUTES.projects);
}

/**
 * Links a knowledge record to a project, with a note on how it was used.
 *
 * Managed from the project's own page, not the knowledge form: unlike a tag
 * or a source, this link carries a note specific to the pairing, which does
 * not fit a checkbox picker shared across every knowledge record.
 */
export async function linkProjectKnowledgeAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const projectId = idSchema.safeParse(formData.get("projectId"));

  if (!projectId.success) {
    return formError("Registro inválido.");
  }

  const parsed = parseFormData(projectKnowledgeLinkSchema, formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const { knowledgeId, note } = parsed.data;
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("knowledge_projects")
    .insert({ user_id: user.id, project_id: projectId.data, knowledge_id: knowledgeId, note });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return formError("Este conhecimento já está vinculado a este projeto.", {
        knowledgeId: ["Este conhecimento já está vinculado a este projeto."],
      });
    }

    console.error("[projects] link failed:", error.message);

    return formError("Não foi possível vincular. Tente novamente.");
  }

  revalidatePath(`${ROUTES.projects}/${projectId.data}`);
  revalidatePath(`${ROUTES.knowledge}/${knowledgeId}`);
  redirect(`${ROUTES.projects}/${projectId.data}`);
}

/**
 * The join's primary key is `(knowledge_id, project_id)` — there is no single
 * `id` column to delete by, unlike `knowledge_relations`.
 */
export async function unlinkProjectKnowledgeAction(formData: FormData): Promise<void> {
  await requireUser();

  const projectId = idSchema.safeParse(formData.get("projectId"));
  const knowledgeId = idSchema.safeParse(formData.get("knowledgeId"));

  if (!projectId.success || !knowledgeId.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("knowledge_projects")
    .delete()
    .eq("project_id", projectId.data)
    .eq("knowledge_id", knowledgeId.data);

  if (error) {
    console.error("[projects] unlink failed:", error.message);
  }

  revalidatePath(`${ROUTES.projects}/${projectId.data}`);
  revalidatePath(`${ROUTES.knowledge}/${knowledgeId.data}`);
  redirect(`${ROUTES.projects}/${projectId.data}`);
}
