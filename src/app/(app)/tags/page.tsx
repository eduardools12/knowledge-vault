import { TagsIcon } from "lucide-react";
import type { Metadata } from "next";

import { StagePlaceholder } from "@/components/common/stage-placeholder";

export const metadata: Metadata = {
  title: "Tags",
};

export default function TagsPage() {
  return (
    <StagePlaceholder
      icon={TagsIcon}
      title="Tags"
      description="Rótulos específicos, transversais às áreas."
      stage="Etapa 4"
      willDo={[
        "Criar e mesclar tags, com cor opcional",
        "Marcar conhecimentos e fontes com as mesmas tags",
        "Encontrar tudo que carrega uma tag, mesmo em áreas diferentes",
      ]}
    />
  );
}
