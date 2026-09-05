"use client";

import { PlusIcon } from "lucide-react";
import { useActionState, useState } from "react";

import { Field } from "@/components/forms/field";
import { FileField } from "@/components/forms/file-field";
import { FormAlert } from "@/components/forms/form-alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { captureInboxItemAction } from "@/features/inbox/actions";
import { buildInboxPath } from "@/features/inbox/storage-path";
import { INBOX_KIND_LABELS, INBOX_KINDS, type InboxKind } from "@/lib/domain";
import { IDLE_FORM_STATE } from "@/lib/forms";

/** Base UI reads the trigger label from `items`, not from the selected child. */
const KIND_ITEMS: Record<string, string> = Object.fromEntries(
  INBOX_KINDS.map((kind) => [kind, INBOX_KIND_LABELS[kind]]),
);

const TEXT_LABEL: Record<Exclude<InboxKind, "file">, string> = {
  link: "Link",
  note: "Nota",
  idea: "Ideia",
  reference: "Referência",
};

const TEXT_PLACEHOLDER: Record<Exclude<InboxKind, "file">, string> = {
  link: "exemplo.com/artigo",
  note: "O que você quer guardar?",
  idea: "Do que você não quer esquecer?",
  reference: "Uma citação, um nome, um número para checar depois.",
};

/**
 * Fast capture, kept on the list page.
 *
 * Mirrors `TagQuickAdd`: this gets used the moment something interesting shows
 * up, so it stays put and clears itself on success instead of redirecting away
 * from whatever the user was doing.
 */
export function InboxQuickAdd({ userId }: { userId: string }) {
  const [state, formAction] = useActionState(captureInboxItemAction, IDLE_FORM_STATE);
  const [kind, setKind] = useState<InboxKind>("note");
  // Bumped to remount the form after a successful capture, which clears every
  // field (controlled or not) at once — `autoFocus` on the text field then
  // fires again for free, the same way it does on first mount.
  const [formInstance, setFormInstance] = useState(0);
  const [lastHandledState, setLastHandledState] = useState(state);

  // Reacting to the action's result during render, not in an effect: the
  // pattern React recommends for "adjust state when something external
  // changed" instead of the extra render a `useEffect` would cost here.
  if (state !== lastHandledState) {
    setLastHandledState(state);

    if (state.status === "success") {
      setKind("note");
      setFormInstance((instance) => instance + 1);
    }
  }

  return (
    <form key={formInstance} action={formAction} className="mb-8 grid gap-4 rounded-lg border p-4" noValidate>
      <FormAlert state={state} />

      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label="Tipo" errors={state.fieldErrors?.kind}>
          {(field) => (
            <Select
              name="kind"
              items={KIND_ITEMS}
              value={kind}
              onValueChange={(value) => setKind(value as InboxKind)}
            >
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

        {kind === "file" ? (
          <Field label="Arquivo" errors={state.fieldErrors?.storagePath}>
            {() => <FileField name="storagePath" userId={userId} buildPath={buildInboxPath} />}
          </Field>
        ) : (
          <Field label={TEXT_LABEL[kind]} errors={state.fieldErrors?.text}>
            {(field) => (
              <Textarea
                name="text"
                placeholder={TEXT_PLACEHOLDER[kind]}
                rows={kind === "link" ? 1 : 3}
                maxLength={kind === "link" ? 2000 : 200_000}
                autoFocus
                {...field}
              />
            )}
          </Field>
        )}
      </div>

      {kind === "file" ? (
        <FormField
          name="title"
          label="Título"
          placeholder="Opcional"
          maxLength={300}
          errors={state.fieldErrors?.title}
        />
      ) : null}

      <div>
        <SubmitButton pendingLabel="Capturando…">
          <PlusIcon className="size-4" aria-hidden="true" />
          Capturar
        </SubmitButton>
      </div>
    </form>
  );
}
