import { z } from "zod";

import { INBOX_KINDS, INBOX_STATUSES } from "@/lib/domain";

/**
 * Validation for the inbox.
 *
 * Two schemas, because the queue has two different writes: a quick capture
 * that takes almost nothing, and a full edit once the item has a title, a
 * note, or more than one field filled in. Limits mirror the CHECK constraints
 * on `inbox_items`, so a value the database would reject comes back as a
 * readable message instead.
 */

const normalizeUrl = (value: string) =>
  /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;

const isValidUrl = (value: string) => /^https?:\/\/.+/i.test(value) && value.length <= 2000;

/**
 * The quick-capture form: one field whose meaning depends on the chosen kind,
 * plus an optional title. `file` is the exception — its payload is a path a
 * browser upload already produced, not typed text.
 */
export const inboxCaptureSchema = z
  .object({
    kind: z.enum(INBOX_KINDS, { error: "Selecione um tipo." }),
    title: z.string().trim().max(300).optional().default(""),
    text: z.string().trim().max(200_000).optional().default(""),
    storagePath: z.string().trim().max(400).optional().default(""),
  })
  .transform((value, ctx) => {
    const title = value.title || null;

    if (value.kind === "file") {
      if (!value.storagePath) {
        ctx.addIssue({ code: "custom", path: ["storagePath"], message: "Envie um arquivo." });

        return z.NEVER;
      }

      return { kind: "file" as const, title, url: null, content: null, storagePath: value.storagePath };
    }

    if (!value.text) {
      ctx.addIssue({ code: "custom", path: ["text"], message: "Escreva algo para capturar." });

      return z.NEVER;
    }

    if (value.kind === "link") {
      const url = normalizeUrl(value.text);

      if (!isValidUrl(url)) {
        ctx.addIssue({
          code: "custom",
          path: ["text"],
          message: "Informe um link http ou https válido.",
        });

        return z.NEVER;
      }

      return { kind: "link" as const, title, url, content: null, storagePath: null };
    }

    return { kind: value.kind, title, url: null, content: value.text, storagePath: null };
  });

export type InboxCaptureInput = z.infer<typeof inboxCaptureSchema>;

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} deve ter no máximo ${max} caracteres.` })
    .transform((value) => value || null);

/** The full edit form, once an item needs more than the quick capture gave it. */
export const inboxItemFormSchema = z
  .object({
    kind: z.enum(INBOX_KINDS, { error: "Selecione um tipo." }),
    status: z.enum(INBOX_STATUSES, { error: "Selecione um status." }),
    title: optionalText(300, "O título"),
    url: z
      .string()
      .trim()
      .transform((value) => (value ? normalizeUrl(value) : null))
      .refine((value) => value === null || isValidUrl(value), {
        error: "Informe um endereço http ou https válido.",
      }),
    content: optionalText(200_000, "O conteúdo"),
    note: optionalText(2000, "A nota"),
    storagePath: z
      .string()
      .trim()
      .max(400)
      .transform((value) => value || null),
  })
  .refine((value) => value.title || value.url || value.content || value.storagePath, {
    error: "Preencha ao menos o título, o link, o conteúdo ou um arquivo.",
    path: ["title"],
  });

export type InboxItemFormInput = z.infer<typeof inboxItemFormSchema>;

// -----------------------------------------------------------------------------
// Listing filters
// -----------------------------------------------------------------------------

export const INBOX_PAGE_SIZE = 20;

export const inboxFiltersSchema = z.object({
  status: z.enum(INBOX_STATUSES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
});

export type InboxFilters = z.infer<typeof inboxFiltersSchema>;
