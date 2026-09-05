"use client";

import { ArchiveIcon, ArrowUpRightIcon, PaperclipIcon, PencilIcon, RotateCcwIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteInboxItemAction, setInboxStatusAction } from "@/features/inbox/actions";
import type { InboxItemSummary } from "@/features/inbox/queries";
import { formatRelativeTime, toDateTimeAttribute } from "@/lib/dates";
import { INBOX_KIND_LABELS, INBOX_STATUS_LABELS } from "@/lib/domain";
import { ROUTES } from "@/lib/routes";

export function InboxItemRow({ item, now }: { item: InboxItemSummary; now: Date }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const preview =
    item.title ?? item.url ?? item.content ?? item.note ?? (item.hasFile ? "Arquivo anexado" : "Sem conteúdo");
  const secondary = item.title ? (item.url ?? item.content) : null;

  return (
    <li className="bg-card grid gap-3 px-4 py-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="grid min-w-0 gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{INBOX_KIND_LABELS[item.kind]}</Badge>
            <Badge variant="secondary">{INBOX_STATUS_LABELS[item.status]}</Badge>
            {item.hasFile ? (
              <PaperclipIcon className="text-muted-foreground size-3.5 shrink-0">
                <title>Tem arquivo anexado</title>
              </PaperclipIcon>
            ) : null}
          </div>

          <p className="truncate font-medium">{preview}</p>
          {secondary ? <p className="text-muted-foreground line-clamp-1 text-sm">{secondary}</p> : null}
        </div>

        <time
          dateTime={toDateTimeAttribute(item.createdAt)}
          className="text-muted-foreground shrink-0 text-xs whitespace-nowrap"
        >
          {formatRelativeTime(item.createdAt, now)}
        </time>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {item.knowledgeId ? (
          <Button
            nativeButton={false}
            render={<Link href={`${ROUTES.knowledge}/${item.knowledgeId}`} />}
            variant="outline"
            size="sm"
          >
            <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
            Ver conhecimento
          </Button>
        ) : (
          <Button
            nativeButton={false}
            render={<Link href={`${ROUTES.inbox}/${item.id}/processar`} />}
            variant="outline"
            size="sm"
          >
            <SparklesIcon className="size-3.5" aria-hidden="true" />
            Processar
          </Button>
        )}

        <Button
          nativeButton={false}
          render={<Link href={`${ROUTES.inbox}/${item.id}/editar`} />}
          variant="ghost"
          size="sm"
        >
          <PencilIcon className="size-3.5" aria-hidden="true" />
          Editar
        </Button>

        <form action={setInboxStatusAction}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="status" value={item.status === "archived" ? "unprocessed" : "archived"} />
          <Button type="submit" variant="ghost" size="sm">
            {item.status === "archived" ? (
              <>
                <RotateCcwIcon className="size-3.5" aria-hidden="true" />
                Reabrir
              </>
            ) : (
              <>
                <ArchiveIcon className="size-3.5" aria-hidden="true" />
                Arquivar
              </>
            )}
          </Button>
        </form>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2Icon className="size-3.5" aria-hidden="true" />
          Excluir
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este item da inbox?</AlertDialogTitle>
            <AlertDialogDescription>
              {item.knowledgeId
                ? "O conhecimento que ele originou não é afetado — só o registro da captura some."
                : "Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>

            <form action={deleteInboxItemAction}>
              <input type="hidden" name="id" value={item.id} />
              <AlertDialogAction
                nativeButton
                render={<button type="submit" />}
                className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              >
                Excluir
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
