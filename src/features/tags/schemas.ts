import { z } from "zod";

import { PALETTE } from "@/lib/palette";

const colorValues = PALETTE.map((entry) => entry.value) as [string, ...string[]];

export const tagFormSchema = z.object({
  name: z
    .string()
    .trim()
    // A leading "#" is how people write tags; it is display convention, not
    // part of the name, and keeping it would put it in the slug too.
    .transform((value) => value.replace(/^#+/, "").trim())
    .pipe(
      z
        .string()
        .min(1, { error: "Informe um nome." })
        .max(50, { error: "O nome deve ter no máximo 50 caracteres." }),
    ),

  color: z.enum(colorValues, { error: "Escolha uma cor da paleta." }),
});

export type TagFormInput = z.infer<typeof tagFormSchema>;
