import { RepeatIcon } from "lucide-react";
import type { Metadata } from "next";

import { StagePlaceholder } from "@/components/common/stage-placeholder";

export const metadata: Metadata = {
  title: "Revisões",
};

export default function RevisoesPage() {
  return (
    <StagePlaceholder
      icon={RepeatIcon}
      title="Revisões"
      description="Revisitar o que você aprendeu antes de esquecer."
      stage="Etapa 14"
      willDo={[
        "Fila do dia com o que está vencido para revisão",
        "Repetição espaçada sobre o histórico já registrado no banco",
        "Perguntas de revisão geradas a partir do próprio conteúdo",
      ]}
    />
  );
}
