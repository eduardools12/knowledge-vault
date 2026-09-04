import { SettingsIcon } from "lucide-react";
import type { Metadata } from "next";

import { StagePlaceholder } from "@/components/common/stage-placeholder";

export const metadata: Metadata = {
  title: "Configurações",
};

export default function ConfiguracoesPage() {
  return (
    <StagePlaceholder
      icon={SettingsIcon}
      title="Configurações"
      description="Sua conta e as preferências do acervo."
      stage="Etapa 2+"
      willDo={[
        "Editar nome de exibição e avatar",
        "Trocar a senha e encerrar sessões ativas",
        "Preferências de idioma e de aparência",
        "Exportar o acervo inteiro",
      ]}
    />
  );
}
