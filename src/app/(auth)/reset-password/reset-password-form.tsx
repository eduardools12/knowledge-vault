"use client";

import { useActionState } from "react";

import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { updatePasswordAction } from "@/features/auth/actions";
import { IDLE_FORM_STATE } from "@/lib/forms";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, IDLE_FORM_STATE);

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormAlert state={state} />

      <FormField
        name="password"
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        required
        hint="Mínimo de 8 caracteres, com ao menos uma letra e um número."
        errors={state.fieldErrors?.password}
      />

      <FormField
        name="confirmPassword"
        label="Confirmar nova senha"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirmPassword}
      />

      <SubmitButton pendingLabel="Salvando…" className="w-full">
        Redefinir senha
      </SubmitButton>
    </form>
  );
}
