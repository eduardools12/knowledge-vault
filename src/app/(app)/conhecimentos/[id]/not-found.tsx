import { FileQuestionIcon } from "lucide-react";

import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { ROUTES } from "@/lib/routes";

export default function KnowledgeNotFound() {
  return (
    <EmptyState
      icon={FileQuestionIcon}
      title="Conhecimento não encontrado"
      description="Ele pode ter sido excluído, ou o endereço está incorreto."
      action={<ButtonLink href={ROUTES.knowledge}>Ver todos os conhecimentos</ButtonLink>}
    />
  );
}
