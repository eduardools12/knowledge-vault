import { FolderKanbanIcon } from "lucide-react";
import type { Metadata } from "next";

import { StagePlaceholder } from "@/components/common/stage-placeholder";

export const metadata: Metadata = {
  title: "Projetos",
};

export default function ProjetosPage() {
  return (
    <StagePlaceholder
      icon={FolderKanbanIcon}
      title="Projetos"
      description="Onde o conhecimento vira prática — e deixa de ser só teoria."
      stage="Etapa 7"
      willDo={[
        "Registrar projetos com status e período",
        "Vincular conhecimentos ao projeto e anotar como cada um foi aplicado",
        "Responder \"o que usei neste projeto?\" e \"em que projetos usei isto?\"",
      ]}
    />
  );
}
