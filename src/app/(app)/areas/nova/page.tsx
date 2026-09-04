import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { createAreaAction } from "@/features/areas/actions";
import { AreaForm } from "@/features/areas/components/area-form";
import { listAreas } from "@/features/areas/queries";
import { buildAreaTree, flattenAreaTree } from "@/features/areas/tree";

export const metadata: Metadata = {
  title: "Nova área",
};

export default async function NewAreaPage() {
  const areas = await listAreas();
  const options = flattenAreaTree(buildAreaTree(areas));

  return (
    <>
      <PageHeader
        title="Nova área"
        description="Comece pelas grandes divisões. Subáreas podem vir depois, quando o acervo pedir."
      />

      <AreaForm
        action={createAreaAction}
        parentOptions={options}
        submitLabel="Criar área"
      />
    </>
  );
}
