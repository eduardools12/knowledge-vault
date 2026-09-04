import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { updateAreaAction } from "@/features/areas/actions";
import { AreaForm } from "@/features/areas/components/area-form";
import { getAreaById, listAreas } from "@/features/areas/queries";
import { buildAreaTree, excludedParentIds, flattenAreaTree } from "@/features/areas/tree";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const area = await getAreaById(id);

  return { title: area ? `Editar: ${area.name}` : "Editar área" };
}

export default async function EditAreaPage({ params }: PageProps) {
  const { id } = await params;
  const [area, areas] = await Promise.all([getAreaById(id), listAreas()]);

  if (!area) {
    notFound();
  }

  // The database refuses a cycle outright. Hiding the choices that would cause
  // one means the user never meets that error in the first place.
  const excluded = excludedParentIds(areas, area.id);
  const options = flattenAreaTree(buildAreaTree(areas)).filter((node) => !excluded.has(node.id));

  return (
    <>
      <PageHeader title="Editar área" description={area.name} />

      <AreaForm
        action={updateAreaAction}
        area={area}
        parentOptions={options}
        submitLabel="Salvar alterações"
      />
    </>
  );
}
