import { InboxIcon } from "lucide-react";

import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { ROUTES } from "@/lib/routes";

export default function InboxItemNotFound() {
  return (
    <EmptyState
      icon={InboxIcon}
      title="Item não encontrado"
      description="Ele pode ter sido excluído, ou o endereço está incorreto."
      action={<ButtonLink href={ROUTES.inbox}>Ver a inbox</ButtonLink>}
    />
  );
}
