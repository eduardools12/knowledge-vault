import { TagsIcon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { TagQuickAdd } from "@/features/tags/components/tag-quick-add";
import { TagRow } from "@/features/tags/components/tag-row";
import { listTags } from "@/features/tags/queries";

export const metadata: Metadata = {
  title: "Tags",
};

export default async function TagsPage() {
  const tags = await listTags();

  return (
    <>
      <PageHeader
        title="Tags"
        description="Rótulos específicos, transversais às áreas. Um conhecimento pode ter várias."
      />

      <TagQuickAdd />

      {tags.length === 0 ? (
        <EmptyState
          icon={TagsIcon}
          title="Nenhuma tag ainda"
          description="Tags cruzam as áreas: #dados serve tanto para uma nota de programação quanto para uma de futebol. Crie a primeira no formulário acima."
        />
      ) : (
        <ul className="grid gap-px overflow-hidden rounded-lg border">
          {tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} />
          ))}
        </ul>
      )}
    </>
  );
}
