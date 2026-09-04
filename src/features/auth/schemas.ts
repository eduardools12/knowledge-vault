import { z } from "zod";

/**
 * Validation for every auth form.
 *
 * The same schemas run on the server inside the Server Actions. Client-side
 * validation is a convenience; this is the enforcement point, because a form
 * post can be crafted by hand.
 */

const MIN_PASSWORD_LENGTH = 8;

/**
 * Normalise first, validate second.
 *
 * In Zod 4 `z.email()` is its own schema rather than a check on `z.string()`,
 * so `z.email().trim()` would validate the raw value and only then clean it —
 * rejecting a perfectly good address pasted with a trailing space. Piping in
 * the other order means the cleaned value is what gets validated and stored,
 * which also stops "Ana@x.com" and "ana@x.com" becoming two accounts.
 */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email({ error: "Informe um e-mail válido." })
      .max(255, { error: "E-mail muito longo." }),
  );

/**
 * Long enough to resist offline guessing, mixed enough to rule out the worst
 * choices, but no character-class gauntlet — rules that fussy push people
 * toward predictable substitutions and reused passwords.
 */
const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, { error: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` })
  .max(72, { error: "A senha deve ter no máximo 72 caracteres." })
  .regex(/[a-zA-Z]/, { error: "A senha deve conter pelo menos uma letra." })
  .regex(/[0-9]/, { error: "A senha deve conter pelo menos um número." });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: "Informe sua senha." }),
});

export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, { error: "O nome deve ter pelo menos 2 caracteres." })
      .max(80, { error: "O nome deve ter no máximo 80 caracteres." }),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
