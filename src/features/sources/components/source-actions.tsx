"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { deleteSourceAction } from "@/features/sources/actions";
import { ROUTES } from "@/lib/routes";

/**
 * Edit and delete for a single source.
 *
 * No archive option here, unlike knowledge: a source is a reference record, not
 * something with its own maturity or lifecycle to track. It exists or it does
 * not.
 */
export function SourceActions({
  id,
  title,
  knowledgeCount,
}: {
  id: string;
  title: string;
  knowledgeCount: number;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        nativeButton={false}
        render={<Link href={`${ROUTES.sources}/${id}/editar`} />}
        variant="outline"
        size="sm"
      >
        <PencilIcon className="size-4" aria-hidden="true" />
        Editar
      </Button>

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
              {knowledgeCount > 0
                ? `Esta ação não pode ser desfeita. ${knowledgeCount} ${
                    knowledgeCount === 1
                      ? "conhecimento perde o vínculo com esta fonte"
                      : "conhecimentos perdem o vínculo com esta fonte"
                  }, mas nenhum conteúdo é apagado além do arquivo anexado.`
                : "Esta ação não pode ser desfeita. O arquivo anexado, se houver, também será removido."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>

            <form action={deleteSourceAction}>
              <input type="hidden" name="id" value={id} />
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
