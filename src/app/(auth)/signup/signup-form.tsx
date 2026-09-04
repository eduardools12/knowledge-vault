"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { signUpAction } from "@/features/auth/actions";
import { IDLE_FORM_STATE } from "@/lib/forms";
import { ROUTES } from "@/lib/routes";

export function SignupForm() {
  const [state, formAction] = useActionState(signUpAction, IDLE_FORM_STATE);

  // On success the account exists but the email is not confirmed yet, so the
  // form is replaced by the instruction instead of inviting another submit.
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
        name="displayName"
        label="Nome"
        autoComplete="name"
        placeholder="Como quer ser chamado"
        required
        errors={state.fieldErrors?.displayName}
      />

      <FormField
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="voce@exemplo.com"
        required
        errors={state.fieldErrors?.email}
      />

      <FormField
        name="password"
        label="Senha"
        type="password"
        autoComplete="new-password"
        required
        hint="Mínimo de 8 caracteres, com ao menos uma letra e um número."
        errors={state.fieldErrors?.password}
      />

      <FormField
        name="confirmPassword"
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirmPassword}
      />

      <SubmitButton pendingLabel="Criando conta…" className="w-full">
        Criar conta
      </SubmitButton>

      <p className="text-muted-foreground text-center text-sm">
        Já tem conta?{" "}
        <Link href={ROUTES.login} className="text-foreground underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </form>
  );
}
