"use client";

import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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
import { deleteKnowledgeAction, setKnowledgeArchivedAction } from "@/features/knowledge/actions";
import { ROUTES } from "@/lib/routes";

/**
 * Edit, archive and delete for a single record.
 *
 * Archiving and deleting are plain form submissions to Server Actions, so both
 * work without JavaScript and neither can be triggered by a cross-site GET the
 * way a link could.
 *
 * Deleting asks first. Archiving does not: it is reversible from the same
 * screen, and a confirmation on a reversible action just trains people to click
 * through dialogs without reading them.
 */
export function KnowledgeActions({
  id,
  title,
  isArchived,
}: {
  id: string;
  title: string;
  isArchived: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        nativeButton={false}
        render={<Link href={`${ROUTES.knowledge}/${id}/editar`} />}
        variant="outline"
        size="sm"
      >
        <PencilIcon className="size-4" aria-hidden="true" />
        Editar
      </Button>

      <form action={setKnowledgeArchivedAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="archived" value={isArchived ? "false" : "true"} />
        <Button type="submit" variant="outline" size="sm">
          {isArchived ? (
            <>
              <ArchiveRestoreIcon className="size-4" aria-hidden="true" />
              Restaurar
            </>
          ) : (
            <>
              <ArchiveIcon className="size-4" aria-hidden="true" />
              Arquivar
            </>
          )}
        </Button>
      </form>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2Icon className="size-4" aria-hidden="true" />
        Excluir
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. As relações e os vínculos com fontes e projetos
              também serão removidos. Se a intenção é só tirar da frente, arquive.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>

            <form action={deleteKnowledgeAction}>
              <input type="hidden" name="id" value={id} />
              {/*
                The confirming control is the submit button itself, not an
                onClick that closes the dialog and fires the action separately —
                that pattern loses the submission when the dialog unmounts first.
              */}
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
    </div>
  );
}
