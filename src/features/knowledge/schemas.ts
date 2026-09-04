import { z } from "zod";

import { sanitizeDocument, type KnowledgeDocument } from "@/features/knowledge/document";
import { KNOWLEDGE_LEVELS, KNOWLEDGE_STATUSES } from "@/lib/domain";

/**
 * Validation for the knowledge form.
 *
 * The limits mirror the CHECK constraints in `supabase/migrations`. Duplicated
 * on purpose: the database is the guarantee, this is the readable error. A
 * title of 400 characters should come back as "no máximo 300 caracteres", not
 * as a constraint violation.
 */

const title = z
  .string()
  .trim()
  .min(1, { error: "Informe um título." })
  .max(300, { error: "O título deve ter no máximo 300 caracteres." });

const summary = z
  .string()
  .trim()
  .max(2000, { error: "O resumo deve ter no máximo 2000 caracteres." })
  // An untouched optional field arrives as "", which must become NULL rather
  // than an empty string, so "has no summary" is one state in the data and not
  // two.
  .transform((value) => value || null);

/**
 * The editor document, submitted as a JSON string in a hidden field.
 *
 * Parsed and sanitised here so no unchecked document reaches a Server Action.
 * `sanitizeDocument` drops unknown nodes and unsafe link protocols; see
 * `document.ts` for why that has to happen server-side.
 */
const document = z.string().transform((raw, ctx): KnowledgeDocument => {
  try {
    return sanitizeDocument(JSON.parse(raw));
  } catch {
    ctx.addIssue({
      code: "custom",
      message: "Não foi possível ler o conteúdo do editor. Recarregue a página e tente de novo.",
    });

    return z.NEVER;
  }
});

/**
 * `archived` is absent by design: archiving is its own action, not something to
 * be reached by editing a dropdown. It carries a side effect (the record leaves
 * every default listing) that deserves an explicit gesture.
 */
const editableStatuses = KNOWLEDGE_STATUSES.filter((status) => status !== "archived");

export const knowledgeFormSchema = z.object({
  title,
  summary,
  content: document,
  level: z.enum(KNOWLEDGE_LEVELS, { error: "Selecione um nível de conhecimento." }),
  status: z.enum(editableStatuses as [string, ...string[]], {
    error: "Selecione um status.",
  }),
});

export type KnowledgeFormInput = z.infer<typeof knowledgeFormSchema>;

// -----------------------------------------------------------------------------
// Listing filters
// -----------------------------------------------------------------------------

export const PAGE_SIZE = 20;

/**
 * Filters read from the query string.
 *
 * Everything is optional and anything unrecognised is dropped rather than
 * rejected: a URL is shareable and editable by hand, and a stale bookmark
 * should degrade to the unfiltered list instead of an error page.
 */
export const knowledgeFiltersSchema = z.object({
  q: z.string().trim().max(120).optional().catch(undefined),
  level: z.enum(KNOWLEDGE_LEVELS).optional().catch(undefined),
  status: z.enum(KNOWLEDGE_STATUSES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
});

export type KnowledgeFilters = z.infer<typeof knowledgeFiltersSchema>;
