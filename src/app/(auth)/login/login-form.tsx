"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { signInAction } from "@/features/auth/actions";
import { IDLE_FORM_STATE } from "@/lib/forms";
import { ROUTES } from "@/lib/routes";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useActionState(signInAction, IDLE_FORM_STATE);

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {/*
        Carried through the form rather than read from the URL inside the
        action: a Server Action receives no request URL, so this is the only
        way the destination survives the round trip.
      */}
      <input type="hidden" name="redirectTo" value={redirectTo} />

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

      <div className="grid gap-2">
        <FormField
          name="password"
          label="Senha"
          type="password"
          autoComplete="current-password"
          required
          errors={state.fieldErrors?.password}
        />
        <Link
          href={ROUTES.forgotPassword}
          className="text-muted-foreground hover:text-foreground justify-self-end text-xs underline underline-offset-4"
        >
          Esqueceu a senha?
        </Link>
      </div>

      <SubmitButton pendingLabel="Entrando…" className="w-full">
        Entrar
      </SubmitButton>

      <p className="text-muted-foreground text-center text-sm">
        Ainda não tem conta?{" "}
        <Link href={ROUTES.signup} className="text-foreground underline underline-offset-4">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
