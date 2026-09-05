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
import { deleteProjectAction } from "@/features/projects/actions";
import { ROUTES } from "@/lib/routes";

/**
 * Edit and delete for a single project.
 *
 * No archive shortcut here, unlike knowledge: a project already has five
 * statuses to express its lifecycle, `archived` among them, so archiving is
 * just picking a status in the same form as everything else.
 */
export function ProjectActions({
  id,
  name,
  knowledgeCount,
}: {
  id: string;
  name: string;
  knowledgeCount: number;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        nativeButton={false}
        render={<Link href={`${ROUTES.projects}/${id}/editar`} />}
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
            <AlertDialogTitle>Excluir “{name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.{" "}
              {knowledgeCount > 0
                ? `${knowledgeCount} ${
                    knowledgeCount === 1 ? "conhecimento perde o vínculo" : "conhecimentos perdem o vínculo"
                  } com este projeto, mas nenhum conteúdo é apagado.`
                : "Nenhum conhecimento está vinculado a este projeto."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>

            <form action={deleteProjectAction}>
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
