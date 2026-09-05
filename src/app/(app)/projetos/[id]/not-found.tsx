import { FolderKanbanIcon } from "lucide-react";

import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { ROUTES } from "@/lib/routes";

export default function ProjectNotFound() {
  return (
    <EmptyState
      icon={FolderKanbanIcon}
      title="Projeto não encontrado"
      description="Ele pode ter sido excluído, ou o endereço está incorreto."
      action={<ButtonLink href={ROUTES.projects}>Ver todos os projetos</ButtonLink>}
    />
  );
}
