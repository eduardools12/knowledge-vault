import type { z } from "zod";

/**
 * Shared shape for every Server Action driven by a form.
 *
 * `useActionState` needs a serialisable value it can render, so actions return
 * this instead of throwing. Field errors are keyed by input name so a form can
 * place each message next to the input it belongs to.
 */
export type FormState = {
  status: "idle" | "error" | "success";
  /** Message for the form as a whole, e.g. "E-mail ou senha inválidos." */
  message?: string;
  /** Per-field messages, keyed by the input's `name`. */
  fieldErrors?: Record<string, string[]>;
};

export const IDLE_FORM_STATE: FormState = { status: "idle" };

export function formError(message: string, fieldErrors?: Record<string, string[]>): FormState {
  return { status: "error", message, fieldErrors };
}

export function formSuccess(message?: string): FormState {
  return { status: "success", message };
}

/**
 * Runs a schema against submitted form data.
 *
 * Returns a discriminated union so the caller is forced to handle the failure
 * branch before touching the parsed data.
 */
export function parseFormData<TSchema extends z.ZodType>(
  schema: TSchema,
  formData: FormData,
): { ok: true; data: z.infer<TSchema> } | { ok: false; state: FormState } {
  const raw = Object.fromEntries(formData.entries());
  const result = schema.safeParse(raw);

  if (!result.success) {
    return {
      ok: false,
      state: formError("Verifique os campos destacados.", flattenFieldErrors(result.error)),
    };
  }

  return { ok: true, data: result.data };
}

function flattenFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path.join(".") || "form";
    (fieldErrors[field] ??= []).push(issue.message);
  }

  return fieldErrors;
}
