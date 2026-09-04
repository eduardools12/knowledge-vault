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
import { TagBadge } from "@/components/tags/tag-badge";
import { deleteTagAction } from "@/features/tags/actions";
import type { Tag } from "@/features/tags/queries";
import { ROUTES } from "@/lib/routes";

export function TagRow({ tag }: { tag: Tag }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const usage = tag.knowledgeCount + tag.sourceCount;

  return (
    <li className="bg-card flex items-center gap-3 px-4 py-2.5">
      <TagBadge name={tag.name} color={tag.color} className="shrink-0" />

      <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs tabular-nums">
        {usage === 0
          ? "Não usada"
          : [
              tag.knowledgeCount > 0
                ? `${tag.knowledgeCount} ${tag.knowledgeCount === 1 ? "conhecimento" : "conhecimentos"}`
                : null,
              tag.sourceCount > 0
                ? `${tag.sourceCount} ${tag.sourceCount === 1 ? "fonte" : "fontes"}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          nativeButton={false}
          render={<Link href={`${ROUTES.tags}/${tag.id}/editar`} />}
          variant="ghost"
          size="icon-sm"
          aria-label={`Editar ${tag.name}`}
        >
          <PencilIcon />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Excluir ${tag.name}`}
          onClick={() => setConfirmOpen(true)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2Icon />
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a tag “{tag.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {usage === 0
                ? "Esta tag não está em uso."
                : `Ela será removida de ${usage} ${usage === 1 ? "item" : "itens"}. Os conhecimentos e as fontes em si não são afetados.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>

            <form action={deleteTagAction}>
              <input type="hidden" name="id" value={tag.id} />
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
