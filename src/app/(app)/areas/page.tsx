import { BoxesIcon } from "lucide-react";
import type { Metadata } from "next";

import { StagePlaceholder } from "@/components/common/stage-placeholder";

export const metadata: Metadata = {
  title: "Áreas",
};

export default function AreasPage() {
  return (
    <StagePlaceholder
      icon={BoxesIcon}
      title="Áreas"
      description="As grandes categorias do acervo — e você cria as que quiser."
      stage="Etapa 4"
      willDo={[
        "Criar, renomear e reordenar áreas livremente",
        "Aninhar áreas em hierarquia, sem taxonomia rígida imposta",
        "Ver quanto de cada área o acervo já cobre",
      ]}
    />
  );
}
