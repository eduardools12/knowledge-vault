import { BoxesIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";

import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { AreaRow } from "@/features/areas/components/area-row";
import { listAreas } from "@/features/areas/queries";
import { buildAreaTree, flattenAreaTree } from "@/features/areas/tree";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Áreas",
};

export default async function AreasPage() {
  const areas = await listAreas();

  // Flattened after building the tree, so a parent is always followed by its
  // children and each row knows its own depth for indentation.
  const rows = flattenAreaTree(buildAreaTree(areas));

  const childCounts = new Map<string, number>();
  for (const area of areas) {
    if (area.parentId) {
      childCounts.set(area.parentId, (childCounts.get(area.parentId) ?? 0) + 1);
    }
  }

  return (
    <>
      <PageHeader
        title="Áreas"
        description="As grandes categorias do acervo. Podem ser aninhadas, e você cria as que quiser."
        action={
          <ButtonLink href={`${ROUTES.areas}/nova`}>
            <PlusIcon className="size-4" aria-hidden="true" />
            Nova
          </ButtonLink>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={BoxesIcon}
          title="Nenhuma área ainda"
          description="Áreas separam o acervo em grandes assuntos — Tecnologia, Esportes, Filosofia. Comece com poucas e amplie conforme precisar."
          action={
            <ButtonLink href={`${ROUTES.areas}/nova`} size="lg">
              Criar a primeira
            </ButtonLink>
          }
        />
      ) : (
        <ul className="grid gap-px overflow-hidden rounded-lg border">
          {rows.map((node) => (
            <AreaRow
              key={node.id}
              area={node}
              depth={node.depth}
              childCount={childCounts.get(node.id) ?? 0}
            />
          ))}
        </ul>
      )}
    </>
  );
}
