import { FileQuestionIcon } from "lucide-react";

import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { ROUTES } from "@/lib/routes";

export default function TagNotFound() {
  return (
    <EmptyState
      icon={FileQuestionIcon}
      title="Tag não encontrada"
      description="Ela pode ter sido excluída, ou o endereço está incorreto."
      action={<ButtonLink href={ROUTES.tags}>Ver todas as tags</ButtonLink>}
    />
  );
}
