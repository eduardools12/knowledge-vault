"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/features/auth/schemas";
import { formError, formSuccess, parseFormData, type FormState } from "@/lib/forms";
import { ROUTES, safeRedirectPath } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Auth Server Actions.
 *
 * Two conventions hold throughout:
 *
 * - **Errors are returned, not thrown.** `useActionState` renders the returned
 *   state, which keeps the user's input on screen instead of replacing the page
 *   with an error boundary.
 *
 * - **Failures are deliberately vague.** Sign-in and password-reset responses
 *   never reveal whether an address is registered. A precise message here would
 *   turn either form into an account-enumeration oracle.
 */

export async function signUpAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseFormData(signUpSchema, formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const { email, password, displayName } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const siteUrl = await getSiteUrl();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read by the `handle_new_user` trigger to seed the profile row.
      data: { display_name: displayName },
      emailRedirectTo: `${siteUrl}${ROUTES.authConfirm}?next=${encodeURIComponent(ROUTES.dashboard)}`,
    },
  });

  if (error) {
    return formError(translateAuthError(error.message));
  }

  // Supabase returns success for an address that already exists, by design, so
  // the copy has to work for both a new account and a duplicate attempt.
  return formSuccess(
    "Conta criada. Enviamos um e-mail de confirmação — verifique sua caixa de entrada para ativar o acesso.",
  );
}

export async function signInAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseFormData(signInSchema, formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return formError("E-mail ou senha inválidos.");
  }

  const redirectTo = safeRedirectPath(formData.get("redirectTo")?.toString());

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signOutAction(): Promise<never> {
  const supabase = await createSupabaseServerClient();

  // `scope: 'global'` revokes every refresh token for the account, so signing
  // out on a shared machine also ends sessions elsewhere.
  await supabase.auth.signOut({ scope: "global" });

  revalidatePath("/", "layout");
  redirect(ROUTES.login);
}

export async function requestPasswordResetAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseFormData(forgotPasswordSchema, formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const supabase = await createSupabaseServerClient();
  const siteUrl = await getSiteUrl();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}${ROUTES.authConfirm}?next=${encodeURIComponent(ROUTES.resetPassword)}`,
  });

  // The result is intentionally ignored: reporting "this address is not
  // registered" would let anyone test which emails have accounts here.
  return formSuccess(
    "Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha.",
  );
}

export async function updatePasswordAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseFormData(resetPasswordSchema, formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const supabase = await createSupabaseServerClient();

  // The recovery link established a session before this page rendered. Without
  // it there is nothing to update, and an anonymous caller must not be able to
  // reach this action at all.
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return formError(
      "Seu link de recuperação expirou. Solicite um novo link para redefinir a senha.",
    );
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return formError(translateAuthError(error.message));
  }

  revalidatePath("/", "layout");
  redirect(ROUTES.dashboard);
}

/**
 * Maps Supabase's English error strings to Portuguese copy.
 *
 * Only messages that are safe and useful to show are translated. Anything
 * unrecognised collapses to a generic sentence rather than leaking internal
 * detail to the browser.
 *
 * The original is written to the server log first. Without that, an
 * unrecognised failure reaches the user as "tente novamente" and leaves no
 * trace anywhere in the application — the cause has to be dug out of the
 * Supabase dashboard, which is a bad place to be at 2am.
 */
function translateAuthError(message: string): string {
  console.error("[auth] Supabase returned an error:", message);

  const normalized = message.toLowerCase();

  if (normalized.includes("is invalid") && normalized.includes("email address")) {
    return "Este endereço de e-mail não é aceito. Use um e-mail válido e ativo.";
  }

  if (normalized.includes("already registered") || normalized.includes("already been registered")) {
    return "Este e-mail já está cadastrado.";
  }

  if (normalized.includes("password should be at least")) {
    return "A senha não atende aos requisitos mínimos.";
  }

  if (normalized.includes("should be different from the old password")) {
    return "A nova senha deve ser diferente da senha atual.";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  }

  return "Não foi possível concluir a operação. Tente novamente.";
}
