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
import { updateInboxItemAction } from "@/features/inbox/actions";
import type { InboxItemDetail } from "@/features/inbox/queries";
import { buildInboxPath } from "@/features/inbox/storage-path";
import { INBOX_KIND_LABELS, INBOX_KINDS, INBOX_STATUS_LABELS, INBOX_STATUSES } from "@/lib/domain";
import { IDLE_FORM_STATE } from "@/lib/forms";
import { ROUTES } from "@/lib/routes";

/** Base UI reads the trigger label from `items`, not from the selected child. */
const KIND_ITEMS: Record<string, string> = Object.fromEntries(
  INBOX_KINDS.map((kind) => [kind, INBOX_KIND_LABELS[kind]]),
);

const STATUS_ITEMS: Record<string, string> = Object.fromEntries(
  INBOX_STATUSES.map((status) => [status, INBOX_STATUS_LABELS[status]]),
);

export function InboxItemForm({ item, userId }: { item: InboxItemDetail; userId: string }) {
  const [state, formAction] = useActionState(updateInboxItemAction, IDLE_FORM_STATE);

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <input type="hidden" name="id" value={item.id} />

      <FormAlert state={state} />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Tipo" errors={state.fieldErrors?.kind}>
          {(field) => (
            <Select name="kind" items={KIND_ITEMS} defaultValue={item.kind}>
              <SelectTrigger id={field.id} className="w-full" aria-describedby={field["aria-describedby"]}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(KIND_ITEMS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field label="Status" errors={state.fieldErrors?.status}>
          {(field) => (
            <Select name="status" items={STATUS_ITEMS} defaultValue={item.status}>
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
      </div>

      <FormField
        name="title"
        label="Título"
        defaultValue={item.title ?? ""}
        placeholder="Opcional"
        maxLength={300}
        errors={state.fieldErrors?.title}
      />

      <FormField
        name="url"
        label="Link"
        type="url"
        inputMode="url"
        defaultValue={item.url ?? ""}
        placeholder="exemplo.com/artigo"
        hint="Opcional. O https:// é adicionado se você não escrever."
        errors={state.fieldErrors?.url}
      />

      <Field label="Conteúdo" errors={state.fieldErrors?.content}>
        {(field) => (
          <Textarea name="content" defaultValue={item.content ?? ""} rows={6} maxLength={200_000} {...field} />
        )}
      </Field>

      <Field
        label="Nota"
        hint="Um lembrete rápido sobre por que isto está aqui."
        errors={state.fieldErrors?.note}
      >
        {(field) => <Textarea name="note" defaultValue={item.note ?? ""} rows={3} maxLength={2000} {...field} />}
      </Field>

      <Field label="Arquivo" errors={state.fieldErrors?.storagePath}>
        {() => (
          <FileField
            name="storagePath"
            userId={userId}
            buildPath={buildInboxPath}
            existingPath={item.storagePath}
            existingLabel={item.title ? `Arquivo de “${item.title}”` : "Arquivo anexado"}
          />
        )}
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Salvando…">Salvar alterações</SubmitButton>

        <Button nativeButton={false} render={<Link href={ROUTES.inbox} />} variant="ghost" type="button">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
