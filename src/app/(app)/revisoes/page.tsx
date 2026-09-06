import { PartyPopperIcon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ReviewQueueList } from "@/features/reviews/components/review-queue-list";
import { listDueReviews } from "@/features/reviews/queries";

export const metadata: Metadata = {
  title: "Revisões",
};

export default async function RevisoesPage() {
  const items = await listDueReviews();
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Revisões"
        description="Revisitar o que você aprendeu antes de esquecer."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={PartyPopperIcon}
          title="Tudo em dia"
          description="Nenhum conhecimento ativo está vencido para revisão agora. Volte mais tarde, ou crie e relacione mais conhecimentos para revisar."
        />
      ) : (
        <ReviewQueueList items={items} now={now} />
      )}
    </>
  );
}
