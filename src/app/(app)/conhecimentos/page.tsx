import { LibraryBigIcon } from "lucide-react";
import type { Metadata } from "next";

import { StagePlaceholder } from "@/components/common/stage-placeholder";

export const metadata: Metadata = {
  title: "Conhecimentos",
};

export default function ConhecimentosPage() {
  return (
    <StagePlaceholder
      icon={LibraryBigIcon}
      title="Conhecimentos"
      description="O centro do acervo: o que você aprendeu, com contexto, fontes e conexões."
      stage="Etapa 3"
      willDo={[
        "Criar, editar, arquivar e excluir conhecimentos",
        "Editor rico com títulos, listas, citações, código, links, tabelas e checklists",
        "Definir o nível de maturidade: Descobri, Entendi, Pratiquei ou Domino",
        "Filtrar por área, tag, nível e status",
      ]}
    />
  );
}
