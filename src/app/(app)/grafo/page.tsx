import { NetworkIcon } from "lucide-react";
import type { Metadata } from "next";

import { StagePlaceholder } from "@/components/common/stage-placeholder";

export const metadata: Metadata = {
  title: "Grafo",
};

export default function GrafoPage() {
  return (
    <StagePlaceholder
      icon={NetworkIcon}
      title="Grafo"
      description="O acervo visto como rede: o que depende do quê, o que complementa o quê."
      stage="Etapa 13"
      willDo={[
        "Visualização interativa das relações entre conhecimentos",
        "Filtro por área e por profundidade de conexão",
        "Navegar do grafo direto para o conhecimento",
      ]}
    />
  );
}
