import { describe, expect, it } from "vitest";

import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/features/auth/schemas";

/**
 * These schemas are the server-side enforcement point for every auth form. The
 * browser can be bypassed entirely, so what matters is that a hand-crafted POST
 * is rejected here.
 */

const validSignUp = {
  displayName: "Eduardo",
  email: "eduardo@exemplo.com",
  password: "senha1234",
  confirmPassword: "senha1234",
};

describe("signUpSchema", () => {
  it("accepts a well-formed submission", () => {
    expect(signUpSchema.safeParse(validSignUp).success).toBe(true);
  });

  it("normalises the email so casing and spacing cannot create duplicate accounts", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      email: "  Eduardo@Exemplo.COM  ",
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.email).toBe("eduardo@exemplo.com");
  });

  it("rejects mismatched passwords and reports it on the confirmation field", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, confirmPassword: "outra1234" });

    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0]?.path).toEqual(["confirmPassword"]);
  });

  it("rejects passwords that are too short", () => {
    expect(signUpSchema.safeParse({ ...validSignUp, password: "abc1", confirmPassword: "abc1" }).success).toBe(false);
  });

  it("rejects passwords made only of digits or only of letters", () => {
    expect(
      signUpSchema.safeParse({ ...validSignUp, password: "12345678", confirmPassword: "12345678" }).success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({ ...validSignUp, password: "abcdefgh", confirmPassword: "abcdefgh" }).success,
    ).toBe(false);
  });

  it("rejects passwords beyond the bcrypt input limit", () => {
    // Over 72 bytes bcrypt silently truncates, so anything longer would give a
    // false sense of strength.
    const tooLong = `a1${"x".repeat(80)}`;
    expect(
      signUpSchema.safeParse({ ...validSignUp, password: tooLong, confirmPassword: tooLong }).success,
    ).toBe(false);
  });

  it("rejects malformed emails", () => {
    for (const email of ["sem-arroba", "a@b", "@exemplo.com", "eduardo@", ""]) {
      expect(signUpSchema.safeParse({ ...validSignUp, email }).success).toBe(false);
    }
  });

  it("requires a display name", () => {
    expect(signUpSchema.safeParse({ ...validSignUp, displayName: " " }).success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("accepts any non-empty password so an old password still reaches the auth server", () => {
    // Sign-in must not apply the strength rules: tightening them later would
    // otherwise lock out every account created before the change.
    const result = signInSchema.safeParse({ email: "eduardo@exemplo.com", password: "curta" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(signInSchema.safeParse({ email: "eduardo@exemplo.com", password: "" }).success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "eduardo@exemplo.com" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "nao-e-email" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts a matching pair that meets the policy", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "novaSenha1", confirmPassword: "novaSenha1" }).success,
    ).toBe(true);
  });

  it("rejects a mismatch", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "novaSenha1", confirmPassword: "outraSenha1" }).success,
    ).toBe(false);
  });
});
