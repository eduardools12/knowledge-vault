import { z } from "zod";

import { PROJECT_STATUSES } from "@/lib/domain";

/**
 * Validation for projects and their link to knowledge.
 *
 * Limits mirror the CHECK constraints in `supabase/migrations`, same as every
 * other feature: the database is the guarantee, this is the readable error.
 */

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} deve ter no máximo ${max} caracteres.` })
    // An untouched optional field arrives as "", which must become NULL so
    // "has none" is one state in the data rather than two.
    .transform((value) => value || null);

const dateOrNull = z
  .string()
  .trim()
  .transform((value) => value || null)
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    error: "Data inválida.",
  });

export const projectFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: "Informe um nome." })
      .max(120, { error: "O nome deve ter no máximo 120 caracteres." }),

    description: optionalText(2000, "A descrição"),

    status: z.enum(PROJECT_STATUSES, { error: "Selecione um status." }),

    startedAt: dateOrNull,
    endedAt: dateOrNull,
  })
  .refine((value) => !value.startedAt || !value.endedAt || value.endedAt >= value.startedAt, {
    error: "A data de término não pode vir antes da data de início.",
    path: ["endedAt"],
  });

export type ProjectFormInput = z.infer<typeof projectFormSchema>;

export const projectFiltersSchema = z.object({
  status: z.enum(PROJECT_STATUSES).optional().catch(undefined),
});

export type ProjectFilters = z.infer<typeof projectFiltersSchema>;

/** Linking an existing knowledge record to a project, with an optional note. */
export const projectKnowledgeLinkSchema = z.object({
  knowledgeId: z.uuid({ error: "Selecione um conhecimento." }),
  note: optionalText(1000, "A nota"),
});

export type ProjectKnowledgeLinkInput = z.infer<typeof projectKnowledgeLinkSchema>;
