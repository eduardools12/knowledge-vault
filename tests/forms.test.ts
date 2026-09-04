import { describe, expect, it } from "vitest";

import { signInSchema } from "@/features/auth/schemas";
import { parseFormData } from "@/lib/forms";

/**
 * `parseFormData` sits between raw `FormData` and every Server Action, so a bug
 * here would either drop validation or lose the messages the form needs to show.
 */
describe("parseFormData", () => {
  function formDataFrom(entries: Record<string, string>): FormData {
    const formData = new FormData();

    for (const [key, value] of Object.entries(entries)) {
      formData.append(key, value);
    }

    return formData;
  }

  it("returns parsed data for a valid submission", () => {
    const result = parseFormData(
      signInSchema,
      formDataFrom({ email: "eduardo@exemplo.com", password: "senha1234" }),
    );

    expect(result.ok).toBe(true);
    expect(result.ok && result.data.email).toBe("eduardo@exemplo.com");
  });

  it("groups messages under the field they belong to", () => {
    const result = parseFormData(signInSchema, formDataFrom({ email: "invalido", password: "" }));

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.state.status).toBe("error");
      expect(result.state.fieldErrors?.email).toBeDefined();
      expect(result.state.fieldErrors?.password).toBeDefined();
    }
  });

  it("reports missing fields rather than treating them as empty strings", () => {
    const result = parseFormData(signInSchema, formDataFrom({}));

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.state.fieldErrors?.email).toBeDefined();
  });

  it("ignores extra fields that the schema does not declare", () => {
    // Forms carry control fields such as `redirectTo`; an unknown key must not
    // fail the whole submission.
    const result = parseFormData(
      signInSchema,
      formDataFrom({ email: "eduardo@exemplo.com", password: "senha1234", redirectTo: "/inbox" }),
    );

    expect(result.ok).toBe(true);
  });
});
