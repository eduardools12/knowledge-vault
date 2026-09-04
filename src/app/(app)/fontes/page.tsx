import { BookMarkedIcon } from "lucide-react";
import type { Metadata } from "next";

import { StagePlaceholder } from "@/components/common/stage-placeholder";

export const metadata: Metadata = {
  title: "Fontes",
};

export default function FontesPage() {
  return (
    <StagePlaceholder
      icon={BookMarkedIcon}
      title="Fontes"
      description="De onde o conhecimento veio: artigos, livros, vídeos, cursos, papers e o resto."
      stage="Etapa 4"
      willDo={[
        "Cadastrar fontes com tipo, autor, URL e data de publicação",
        "Anexar arquivos ao bucket privado, servidos por URL assinada",
        "Vincular uma fonte a vários conhecimentos, com nota do trecho que importa",
      ]}
    />
  );
}
