"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { IDLE_FORM_STATE } from "@/lib/forms";
import { ROUTES } from "@/lib/routes";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, IDLE_FORM_STATE);

  // The success message is intentionally non-committal about whether the
  // address exists, so there is nothing to gain from submitting again.
  if (state.status === "success") {
    return (
      <div className="grid gap-4">
        <FormAlert state={state} />
        <Link
          href={ROUTES.login}
          className="text-muted-foreground hover:text-foreground text-center text-sm underline underline-offset-4"
        >
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormAlert state={state} />

      <FormField
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="voce@exemplo.com"
        required
        errors={state.fieldErrors?.email}
      />

      <SubmitButton pendingLabel="Enviando…" className="w-full">
        Enviar link de recuperação
      </SubmitButton>

      <Link
        href={ROUTES.login}
        className="text-muted-foreground hover:text-foreground text-center text-sm underline underline-offset-4"
      >
        Voltar para o login
      </Link>
    </form>
  );
}
