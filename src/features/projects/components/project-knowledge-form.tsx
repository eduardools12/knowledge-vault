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
import { linkProjectKnowledgeAction } from "@/features/projects/actions";
import { IDLE_FORM_STATE } from "@/lib/forms";

export function ProjectKnowledgeForm({
  projectId,
  options,
}: {
  projectId: string;
  options: { id: string; title: string }[];
}) {
  const [state, formAction] = useActionState(linkProjectKnowledgeAction, IDLE_FORM_STATE);

  if (options.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
        Crie um conhecimento para poder vinculá-lo a este projeto.
      </p>
    );
  }

  const items: Record<string, string> = Object.fromEntries(
    options.map((option) => [option.id, option.title]),
  );

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border p-4" noValidate>
      <input type="hidden" name="projectId" value={projectId} />

      <FormAlert state={state} />

      <Field label="Conhecimento" errors={state.fieldErrors?.knowledgeId}>
        {(field) => (
          <Select name="knowledgeId" items={items}>
            <SelectTrigger id={field.id} className="w-full" aria-describedby={field["aria-describedby"]}>
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      <Field label="Nota" hint="Opcional. Como esse conhecimento foi usado aqui." errors={state.fieldErrors?.note}>
        {(field) => <Textarea name="note" rows={2} maxLength={1000} {...field} />}
      </Field>

      <div>
        <SubmitButton pendingLabel="Vinculando…">Vincular conhecimento</SubmitButton>
      </div>
    </form>
  );
}
