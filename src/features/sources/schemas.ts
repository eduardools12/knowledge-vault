import { z } from "zod";

import { SOURCE_TYPES } from "@/lib/domain";

/**
 * Validation for the source form.
 *
 * Limits mirror the CHECK constraints in the schema, so a value that would be
 * rejected by the database comes back as a readable message instead.
 */

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} deve ter no máximo ${max} caracteres.` })
    // An untouched field arrives as "", which must become NULL so "absent" is
    // one state in the data rather than two.
    .transform((value) => value || null);

export const sourceFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: "Informe um título." })
    .max(300, { error: "O título deve ter no máximo 300 caracteres." }),

  type: z.enum(SOURCE_TYPES, { error: "Selecione um tipo." }),

  url: z
    .string()
    .trim()
    .transform((value) => {
      if (!value) {
        return null;
      }

      // "exemplo.com/artigo" is what people paste. Without a protocol the
      // database CHECK rejects it and the link would resolve inside the app.
      return /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
    })
    .refine((value) => value === null || /^https?:\/\/.+/i.test(value), {
      error: "Informe um endereço http ou https válido.",
    })
    .refine((value) => value === null || value.length <= 2000, {
      error: "Endereço muito longo.",
    }),

  author: optionalText(200, "O autor"),
  description: optionalText(2000, "A descrição"),

  /** Extracted or pasted full text. Feeds search, and later the embeddings. */
  content: optionalText(200_000, "O conteúdo"),

  publishedAt: z
    .string()
    .trim()
    .transform((value) => value || null)
    .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      error: "Data inválida.",
    }),

  /**
   * Path of a file already uploaded by the browser, or empty. Never trusted:
   * `isOwnedPath` re-checks it server-side before it reaches the database.
   */
  storagePath: z
    .string()
    .trim()
    .max(400)
    .transform((value) => value || null),

  tagIds: z.array(z.uuid()).max(50).default([]),
});

export type SourceFormInput = z.infer<typeof sourceFormSchema>;

export const sourceFiltersSchema = z.object({
  q: z.string().trim().max(120).optional().catch(undefined),
  type: z.enum(SOURCE_TYPES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
});

export type SourceFilters = z.infer<typeof sourceFiltersSchema>;
