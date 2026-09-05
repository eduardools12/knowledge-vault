"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AreaSelectField, type AreaOption } from "@/components/areas/area-select-field";
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
import { KnowledgeEditor } from "@/features/knowledge/components/knowledge-editor";
import type { KnowledgeDocument } from "@/features/knowledge/document";
import type { KnowledgeDetail } from "@/features/knowledge/queries";
import {
  KNOWLEDGE_LEVEL_META,
  KNOWLEDGE_LEVELS,
  KNOWLEDGE_STATUS_LABELS,
  type KnowledgeLevel,
} from "@/lib/domain";
import { IDLE_FORM_STATE, type FormState } from "@/lib/forms";
import { ROUTES } from "@/lib/routes";

type KnowledgeAction = (state: FormState, formData: FormData) => Promise<FormState>;

/**
 * Base UI takes the trigger's label from `items`, not from the selected
 * option's children. Without these maps the closed select shows the stored
 * value — "understood" instead of "Entendi".
 */
const LEVEL_ITEMS: Record<string, string> = Object.fromEntries(
  KNOWLEDGE_LEVELS.map((level) => [
    level,
    `${KNOWLEDGE_LEVEL_META[level].emoji} ${KNOWLEDGE_LEVEL_META[level].label}`,
  ]),
);

const STATUS_ITEMS: Record<string, string> = {
  draft: KNOWLEDGE_STATUS_LABELS.draft,
  active: KNOWLEDGE_STATUS_LABELS.active,
};

/**
 * The create and edit form.
 *
 * One component for both, because they differ only in which action runs and
 * which values start filled in. Two near-identical forms drift, and the one
 * that gets less use is the one that quietly loses a field.
 */
export function KnowledgeForm({
  action,
  knowledge,
  initialValues,
  areaOptions,
  submitLabel,
  /** Rendered by the page, because `TagPicker` and `SourcePicker` are Server Components. */
  tagPicker,
  sourcePicker,
  /** Extra hidden inputs the action needs, e.g. the inbox item being processed. */
  hiddenFields,
}: {
  action: KnowledgeAction;
  /** Absent when creating. */
  knowledge?: KnowledgeDetail;
  /**
   * Starting title and content for a fresh record that did not come from
   * nothing — an inbox item being turned into knowledge. Ignored once
   * `knowledge` is set: an edit always starts from the record itself.
   */
  initialValues?: { title?: string | null; content?: KnowledgeDocument };
  areaOptions: AreaOption[];
  submitLabel: string;
  tagPicker: React.ReactNode;
  sourcePicker: React.ReactNode;
  hiddenFields?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, IDLE_FORM_STATE);

  const cancelHref = knowledge ? `${ROUTES.knowledge}/${knowledge.id}` : ROUTES.knowledge;

  // An archived record keeps its status through an edit. The form only offers
  // draft and active; archiving is a deliberate action of its own.
  const defaultStatus = knowledge?.status === "archived" ? "active" : (knowledge?.status ?? "draft");

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      {knowledge ? <input type="hidden" name="id" value={knowledge.id} /> : null}
      {hiddenFields}

      <FormAlert state={state} />

      <FormField
        name="title"
        label="Título"
        defaultValue={knowledge?.title ?? initialValues?.title ?? ""}
        placeholder="Ex.: Expected Goals (xG)"
        required
        autoFocus={!knowledge}
        maxLength={300}
        errors={state.fieldErrors?.title}
      />

      <Field
        label="Resumo"
        hint="Uma ou duas frases que expliquem o essencial. É o que aparece nas listagens."
        errors={state.fieldErrors?.summary}
      >
        {(field) => (
          <Textarea
            name="summary"
            defaultValue={knowledge?.summary ?? ""}
            placeholder="O que isso é, em poucas palavras."
            rows={3}
            maxLength={2000}
            {...field}
          />
        )}
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Nível de conhecimento"
          hint={KNOWLEDGE_LEVEL_META[(knowledge?.level ?? "discovered") as KnowledgeLevel].description}
          errors={state.fieldErrors?.level}
        >
          {(field) => (
            <Select
              name="level"
              items={LEVEL_ITEMS}
              defaultValue={knowledge?.level ?? "discovered"}
            >
              <SelectTrigger id={field.id} aria-describedby={field["aria-describedby"]}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEVEL_ITEMS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field
          label="Status"
          hint="Rascunho fica de fora das contagens do dashboard."
          errors={state.fieldErrors?.status}
        >
          {(field) => (
            <Select name="status" items={STATUS_ITEMS} defaultValue={defaultStatus}>
              <SelectTrigger id={field.id} aria-describedby={field["aria-describedby"]}>
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
      </div>

      <AreaSelectField
        name="areaId"
        label="Área"
        hint="Opcional. A grande categoria em que este conhecimento se encaixa."
        options={areaOptions}
        defaultValue={knowledge?.area?.id}
        errors={state.fieldErrors?.areaId}
      />

      <Field label="Tags" errors={state.fieldErrors?.tagIds}>
        {() => <>{tagPicker}</>}
      </Field>

      <Field
        label="Fontes"
        hint="De onde este conhecimento veio, se houver uma referência específica."
        errors={state.fieldErrors?.sourceIds}
      >
        {() => <>{sourcePicker}</>}
      </Field>

      <Field label="Conteúdo" errors={state.fieldErrors?.content}>
        {(field) => (
          <KnowledgeEditor
            name="content"
            defaultValue={(knowledge?.content as KnowledgeDocument | undefined) ?? initialValues?.content}
            ariaDescribedBy={field["aria-describedby"]}
          />
        )}
      </Field>

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
