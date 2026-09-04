"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AreaSelectField, type AreaOption } from "@/components/areas/area-select-field";
import { ColorField } from "@/components/forms/color-field";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Area } from "@/features/areas/queries";
import { DEFAULT_COLOR } from "@/lib/palette";
import { IDLE_FORM_STATE, type FormState } from "@/lib/forms";
import { ROUTES } from "@/lib/routes";

export function AreaForm({
  action,
  area,
  /** Areas that may be the parent, already excluding self and descendants. */
  parentOptions,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  area?: Area;
  parentOptions: AreaOption[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, IDLE_FORM_STATE);

  return (
    <form action={formAction} className="grid max-w-xl gap-6" noValidate>
      {area ? <input type="hidden" name="id" value={area.id} /> : null}

      <FormAlert state={state} />

      <FormField
        name="name"
        label="Nome"
        defaultValue={area?.name ?? ""}
        placeholder="Ex.: Tecnologia"
        required
        autoFocus={!area}
        maxLength={80}
        errors={state.fieldErrors?.name}
      />

      <Field
        label="Descrição"
        hint="Opcional. Ajuda a lembrar o que entra e o que não entra nesta área."
        errors={state.fieldErrors?.description}
      >
        {(field) => (
          <Textarea
            name="description"
            defaultValue={area?.description ?? ""}
            rows={2}
            maxLength={500}
            {...field}
          />
        )}
      </Field>

      <AreaSelectField
        name="parentId"
        label="Área superior"
        hint="Áreas podem ser aninhadas. Uma área não aparece como opção para si mesma nem para suas subáreas."
        options={parentOptions}
        defaultValue={area?.parentId}
        noneLabel="Nenhuma (área principal)"
        errors={state.fieldErrors?.parentId}
      />

      <ColorField name="color" label="Cor" defaultValue={area?.color ?? DEFAULT_COLOR} />

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Salvando…">{submitLabel}</SubmitButton>

        <Button
          nativeButton={false}
          render={<Link href={ROUTES.areas} />}
          variant="ghost"
          type="button"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
