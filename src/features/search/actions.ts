"use server";

import type { RagState } from "@/features/search/rag-prompt";
import { answerFromVault } from "@/features/search/rag";
import { searchFiltersSchema } from "@/features/search/schemas";
import { requireUser } from "@/lib/auth/dal";
import { describeAiError } from "@/lib/ai/errors";

/**
 * Asks the model to answer a question from the vault. Never writes anything —
 * "IA sugere; o usuário decide" (docs/ai.md) applies here too: an answer is
 * read, not saved, and every claim in it is expected to trace back to a
 * citation the user can click through and check for themselves.
 *
 * Takes the same filters `/busca` already parsed from the URL — the button
 * that submits this passes them along as hidden fields, so a question is
 * always scoped to exactly what the visible results are, not the raw text
 * box on its own.
 */
export async function askVaultAction(_prevState: RagState, formData: FormData): Promise<RagState> {
  const user = await requireUser();

  // `.parse()`, not `.safeParse()`: every field of `searchFiltersSchema` is
  // optional and `.catch(undefined)`, so a stale or hand-edited field just
  // degrades to "no filter" instead of this ever throwing.
  const filters = searchFiltersSchema.parse(Object.fromEntries(formData.entries()));

  if (!filters.q) {
    return { status: "error", message: "Digite uma pergunta na busca para perguntar à IA." };
  }

  try {
    const result = await answerFromVault(user.id, filters);

    return { status: "success", result };
  } catch (error) {
    return {
      status: "error",
      message: describeAiError(error, {
        logPrefix: "[search]",
        failureMessage: "Não foi possível responder agora. Tente novamente.",
      }),
    };
  }
}
