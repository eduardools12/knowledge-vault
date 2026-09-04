"use client";

import Link from "next/link";
import { useActionState } from "react";

import { ColorField } from "@/components/forms/color-field";
import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { updateTagAction } from "@/features/tags/actions";
import type { Tag } from "@/features/tags/queries";
import { IDLE_FORM_STATE } from "@/lib/forms";
import { DEFAULT_COLOR } from "@/lib/palette";
import { ROUTES } from "@/lib/routes";

export function TagForm({ tag }: { tag: Tag }) {
  const [state, formAction] = useActionState(updateTagAction, IDLE_FORM_STATE);

  return (
    <form action={formAction} className="grid max-w-md gap-6" noValidate>
      <input type="hidden" name="id" value={tag.id} />

      <FormAlert state={state} />

      <FormField
        name="name"
        label="Nome"
        defaultValue={tag.name}
        required
        autoFocus
        maxLength={50}
        errors={state.fieldErrors?.name}
      />

      <ColorField name="color" label="Cor" defaultValue={tag.color ?? DEFAULT_COLOR} />

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Salvando…">Salvar alterações</SubmitButton>

        <Button
          nativeButton={false}
          render={<Link href={ROUTES.tags} />}
          variant="ghost"
          type="button"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
