"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectDetail } from "@/features/projects/queries";
import { PROJECT_STATUS_LABELS, PROJECT_STATUSES } from "@/lib/domain";
import { IDLE_FORM_STATE, type FormState } from "@/lib/forms";
import { ROUTES } from "@/lib/routes";

/** Base UI reads the trigger label from `items`, not from the selected child. */
const STATUS_ITEMS: Record<string, string> = Object.fromEntries(
  PROJECT_STATUSES.map((status) => [status, PROJECT_STATUS_LABELS[status]]),
);

export function ProjectForm({
  action,
  project,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** Absent when creating. */
  project?: ProjectDetail;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, IDLE_FORM_STATE);

  const cancelHref = project ? `${ROUTES.projects}/${project.id}` : ROUTES.projects;

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      {project ? <input type="hidden" name="id" value={project.id} /> : null}

      <FormAlert state={state} />

      <FormField
        name="name"
        label="Nome"
        defaultValue={project?.name ?? ""}
        placeholder="Ex.: Relatório de scouting"
        required
        autoFocus={!project}
        maxLength={120}
        errors={state.fieldErrors?.name}
      />

      <Field
        label="Descrição"
        hint="O que este projeto é, ou o que ele busca resolver."
        errors={state.fieldErrors?.description}
      >
        {(field) => (
          <Textarea
            name="description"
            defaultValue={project?.description ?? ""}
            rows={3}
            maxLength={2000}
            {...field}
          />
        )}
      </Field>

      <div className="grid gap-6 sm:grid-cols-[auto_1fr_1fr]">
        <Field label="Status" errors={state.fieldErrors?.status}>
          {(field) => (
            <Select name="status" items={STATUS_ITEMS} defaultValue={project?.status ?? "idea"}>
              <SelectTrigger id={field.id} className="w-full" aria-describedby={field["aria-describedby"]}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_ITEMS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <FormField
          name="startedAt"
          label="Início"
          type="date"
          defaultValue={project?.startedAt ?? ""}
          errors={state.fieldErrors?.startedAt}
        />

        <FormField
          name="endedAt"
          label="Fim"
          type="date"
          defaultValue={project?.endedAt ?? ""}
          errors={state.fieldErrors?.endedAt}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Salvando…">{submitLabel}</SubmitButton>

        <Button
          nativeButton={false}
          render={<Link href={cancelHref} />}
          variant="ghost"
          type="button"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
