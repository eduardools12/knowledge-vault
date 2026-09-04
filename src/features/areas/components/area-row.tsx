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
import { deleteAreaAction } from "@/features/areas/actions";
import type { Area } from "@/features/areas/queries";
import { DEFAULT_COLOR, isPaletteColor } from "@/lib/palette";
import { ROUTES } from "@/lib/routes";

export function AreaRow({
  area,
  depth,
  childCount,
}: {
  area: Area;
  depth: number;
  childCount: number;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // A colour written before the palette changed still satisfies the database
  // CHECK but is not guaranteed to be legible on both themes.
  const color = isPaletteColor(area.color) ? area.color : DEFAULT_COLOR;

  return (
    <li className="bg-card flex items-center gap-3 px-4 py-3">
      {/* Indentation carries the hierarchy; `depth` is capped by the tree. */}
      <span style={{ paddingLeft: `${depth * 1.25}rem` }} className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />

        <span className="grid min-w-0 gap-0.5">
          <span className="truncate font-medium">{area.name}</span>
          {area.description ? (
            <span className="text-muted-foreground line-clamp-1 text-xs">{area.description}</span>
          ) : null}
        </span>
      </span>

      <Link
        href={`${ROUTES.knowledge}?area=${area.id}`}
        className="text-muted-foreground hover:text-foreground shrink-0 text-xs tabular-nums underline-offset-4 hover:underline"
      >
        {area.knowledgeCount} {area.knowledgeCount === 1 ? "conhecimento" : "conhecimentos"}
      </Link>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          nativeButton={false}
          render={<Link href={`${ROUTES.areas}/${area.id}/editar`} />}
          variant="ghost"
          size="icon-sm"
          aria-label={`Editar ${area.name}`}
        >
          <PencilIcon />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Excluir ${area.name}`}
          onClick={() => setConfirmOpen(true)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2Icon />
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a área “{area.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {/*
                Spelling out what survives matters: the whole point of the
                `on delete set null` foreign keys is that a label can be removed
                without taking the knowledge with it.
              */}
              Nada é apagado junto.{" "}
              {area.knowledgeCount > 0
                ? `${area.knowledgeCount} ${
                    area.knowledgeCount === 1 ? "conhecimento fica" : "conhecimentos ficam"
                  } sem área.`
                : "Nenhum conhecimento usa esta área."}{" "}
              {childCount > 0
                ? `${childCount} ${childCount === 1 ? "subárea passa" : "subáreas passam"} a ser área principal.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>

            <form action={deleteAreaAction}>
              <input type="hidden" name="id" value={area.id} />
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
