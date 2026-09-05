"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Field } from "@/components/forms/field";
import { FileField } from "@/components/forms/file-field";
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
import type { SourceDetail } from "@/features/sources/queries";
import { buildSourcePath } from "@/features/sources/storage-path";
import { SOURCE_TYPE_LABELS, SOURCE_TYPES } from "@/lib/domain";
import { IDLE_FORM_STATE, type FormState } from "@/lib/forms";
import { ROUTES } from "@/lib/routes";

/** Base UI reads the trigger label from `items`, not from the selected child. */
const TYPE_ITEMS: Record<string, string> = Object.fromEntries(
  SOURCE_TYPES.map((type) => [type, SOURCE_TYPE_LABELS[type]]),
);

export function SourceForm({
  action,
  source,
  userId,
  submitLabel,
  /** Rendered by the page, because `TagPicker` is a Server Component. */
  tagPicker,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  source?: SourceDetail;
  userId: string;
  submitLabel: string;
  tagPicker: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, IDLE_FORM_STATE);

  const cancelHref = source ? `${ROUTES.sources}/${source.id}` : ROUTES.sources;

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      {source ? <input type="hidden" name="id" value={source.id} /> : null}

      <FormAlert state={state} />

      <FormField
        name="title"
        label="Título"
        defaultValue={source?.title ?? ""}
        placeholder="Ex.: Soccermatics"
        required
        autoFocus={!source}
        maxLength={300}
        errors={state.fieldErrors?.title}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Tipo" errors={state.fieldErrors?.type}>
          {(field) => (
            <Select name="type" items={TYPE_ITEMS} defaultValue={source?.type ?? "article"}>
              <SelectTrigger id={field.id} aria-describedby={field["aria-describedby"]}>
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

        <FormField
          name="author"
          label="Autor"
          defaultValue={source?.author ?? ""}
          placeholder="Opcional"
          maxLength={200}
          errors={state.fieldErrors?.author}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
        <FormField
          name="url"
          label="Endereço"
          type="url"
          inputMode="url"
          defaultValue={source?.url ?? ""}
          placeholder="exemplo.com/artigo"
          hint="Opcional. O https:// é adicionado se você não escrever."
          errors={state.fieldErrors?.url}
        />

        <FormField
          name="publishedAt"
          label="Publicado em"
          type="date"
          defaultValue={source?.publishedAt ?? ""}
          errors={state.fieldErrors?.publishedAt}
        />
      </div>

      <Field
        label="Descrição"
        hint="Por que esta fonte importa, ou o que ela cobre."
        errors={state.fieldErrors?.description}
      >
        {(field) => (
          <Textarea
            name="description"
            defaultValue={source?.description ?? ""}
            rows={3}
            maxLength={2000}
            {...field}
          />
        )}
      </Field>

      <Field label="Arquivo" errors={state.fieldErrors?.storagePath}>
        {() => (
          <FileField
            name="storagePath"
            userId={userId}
            buildPath={buildSourcePath}
            existingPath={source?.storagePath}
            existingLabel={source ? `Arquivo de “${source.title}”` : undefined}
          />
        )}
      </Field>

      <Field label="Tags">{() => <>{tagPicker}</>}</Field>

      <Field
        label="Conteúdo"
        hint="Trecho ou texto completo. Entra na busca hoje e alimentará os embeddings na Etapa 11."
        errors={state.fieldErrors?.content}
      >
        {(field) => (
          <Textarea
            name="content"
            defaultValue={source?.content ?? ""}
            rows={8}
            placeholder="Cole aqui o texto que quiser guardar desta fonte."
            {...field}
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
