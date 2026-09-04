import { FileQuestionIcon } from "lucide-react";

import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { ROUTES } from "@/lib/routes";

export default function SourceNotFound() {
  return (
    <EmptyState
      icon={FileQuestionIcon}
      title="Fonte não encontrada"
      description="Ela pode ter sido excluída, ou o endereço está incorreto."
      action={<ButtonLink href={ROUTES.sources}>Ver todas as fontes</ButtonLink>}
    />
  );
}
