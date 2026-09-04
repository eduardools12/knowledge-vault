import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { createKnowledgeAction } from "@/features/knowledge/actions";
import { KnowledgeForm } from "@/features/knowledge/components/knowledge-form";

export const metadata: Metadata = {
  title: "Novo conhecimento",
};

export default function NewKnowledgePage() {
  return (
    <>
      <PageHeader
        title="Novo conhecimento"
        description="Registre agora, refine depois. Um conhecimento não precisa estar pronto para valer a pena existir."
      />

      <KnowledgeForm action={createKnowledgeAction} submitLabel="Criar conhecimento" />
    </>
  );
}
