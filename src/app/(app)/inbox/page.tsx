import { InboxIcon } from "lucide-react";
import type { Metadata } from "next";

import { StagePlaceholder } from "@/components/common/stage-placeholder";

export const metadata: Metadata = {
  title: "Inbox",
};

export default function InboxPage() {
  return (
    <StagePlaceholder
      icon={InboxIcon}
      title="Inbox"
      description="A porta de entrada do acervo. Jogue aqui o que for interessante e organize depois."
      stage="Etapa 5"
      willDo={[
        "Capturar link, texto, arquivo, ideia ou referência em segundos",
        "Acompanhar a fila nos quatro estados: não processado, em análise, processado e arquivado",
        "Transformar um item em conhecimento estruturado, preservando de onde ele veio",
      ]}
    />
  );
}
