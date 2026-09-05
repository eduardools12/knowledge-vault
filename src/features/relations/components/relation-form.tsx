"use client";

import { useActionState } from "react";

import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createRelationAction } from "@/features/relations/actions";
import { RELATION_TYPE_META, RELATION_TYPES } from "@/lib/domain";
import { IDLE_FORM_STATE } from "@/lib/forms";

/** Base UI reads the trigger label from `items`, not from the selected child. */
const TYPE_ITEMS: Record<string, string> = Object.fromEntries(
  RELATION_TYPES.map((type) => [type, RELATION_TYPE_META[type].label]),
);

const DIRECTION_ITEMS = {
  from: "Este conhecimento → o selecionado",
  to: "O selecionado → este conhecimento",
} as const;

export function RelationForm({
  knowledgeId,
  targetOptions,
}: {
  knowledgeId: string;
  targetOptions: { id: string; title: string }[];
}) {
  const [state, formAction] = useActionState(createRelationAction, IDLE_FORM_STATE);

  if (targetOptions.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
        Crie outro conhecimento para poder relacioná-lo a este.
      </p>
    );
  }

  const targetItems: Record<string, string> = Object.fromEntries(
    targetOptions.map((option) => [option.id, option.title]),
  );

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border p-4" noValidate>
      <input type="hidden" name="knowledgeId" value={knowledgeId} />

      <FormAlert state={state} />

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Conhecimento relacionado" errors={state.fieldErrors?.targetId}>
          {(field) => (
            <Select name="targetId" items={targetItems}>
              <SelectTrigger id={field.id} className="w-full" aria-describedby={field["aria-describedby"]}>
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                {targetOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field label="Tipo" errors={state.fieldErrors?.type}>
          {(field) => (
            <Select name="type" items={TYPE_ITEMS} defaultValue="related_to">
              <SelectTrigger id={field.id} className="w-full" aria-describedby={field["aria-describedby"]}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_ITEMS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      </div>

      <Field
        label="Direção"
        hint="Quem faz a ação do tipo escolhido — quem depende, quem contradiz, quem é exemplo de quê."
        errors={state.fieldErrors?.direction}
      >
        {(field) => (
          <Select name="direction" items={DIRECTION_ITEMS} defaultValue="from">
            <SelectTrigger id={field.id} className="w-full" aria-describedby={field["aria-describedby"]}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DIRECTION_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      <Field label="Nota" hint="Opcional. Por que esses dois se relacionam." errors={state.fieldErrors?.note}>
        {(field) => <Textarea name="note" rows={2} maxLength={1000} {...field} />}
      </Field>

      <div>
        <SubmitButton pendingLabel="Adicionando…">Adicionar relação</SubmitButton>
      </div>
    </form>
  );
}
