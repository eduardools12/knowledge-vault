"use client";

import { PlusIcon } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { ColorField } from "@/components/forms/color-field";
import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { createTagAction } from "@/features/tags/actions";
import { IDLE_FORM_STATE } from "@/lib/forms";
import { DEFAULT_COLOR } from "@/lib/palette";

/**
 * Inline creation, kept on the list page.
 *
 * Tags get made in bursts — you notice three missing at once — so this form
 * stays put and clears itself instead of redirecting after each one. The action
 * returns a success state rather than a redirect for the same reason.
 */
export function TagQuickAdd() {
  const [state, formAction] = useActionState(createTagAction, IDLE_FORM_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    // Clearing the fields and returning focus is what makes "add another"
    // actually fast. Resetting the DOM form is not React state, so this stays
    // out of the render path.
    formRef.current?.reset();
    nameRef.current?.focus();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mb-8 grid gap-4 rounded-lg border p-4" noValidate>
      <FormAlert state={state} />

      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <FormField
          ref={nameRef}
          name="name"
          label="Nova tag"
          placeholder="python"
          required
          maxLength={50}
          errors={state.fieldErrors?.name}
        />

        <SubmitButton pendingLabel="Criando…">
          <PlusIcon className="size-4" aria-hidden="true" />
          Criar
        </SubmitButton>
      </div>

      <ColorField name="color" label="Cor" defaultValue={DEFAULT_COLOR} />
    </form>
  );
}
