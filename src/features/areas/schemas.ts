import { z } from "zod";

import { PALETTE } from "@/lib/palette";

/**
 * Validation for the area form.
 *
 * Limits mirror the CHECK constraints in the schema. The slug is not a field:
 * it is derived from the name on the server, because a user editing a slug by
 * hand gains nothing and can only produce a value the database rejects.
 */

const colorValues = PALETTE.map((entry) => entry.value) as [string, ...string[]];

export const areaFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Informe um nome." })
    .max(80, { error: "O nome deve ter no máximo 80 caracteres." }),

  description: z
    .string()
    .trim()
    .max(500, { error: "A descrição deve ter no máximo 500 caracteres." })
    // An untouched optional field arrives as "", which must become NULL so
    // "has no description" is one state in the data rather than two.
    .transform((value) => value || null),

  color: z.enum(colorValues, { error: "Escolha uma cor da paleta." }),

  /**
   * Empty string means "no parent". The select cannot carry an empty option
   * value, so the sentinel is translated here rather than in the component.
   */
  parentId: z
    .string()
    .trim()
    .transform((value) => (value && value !== "none" ? value : null))
    .refine((value) => value === null || z.uuid().safeParse(value).success, {
      error: "Área superior inválida.",
    }),
});

export type AreaFormInput = z.infer<typeof areaFormSchema>;
