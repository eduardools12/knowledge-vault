import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { InboxItemForm } from "@/features/inbox/components/inbox-item-form";
import { getInboxItemById } from "@/features/inbox/queries";
import { requireUser } from "@/lib/auth/dal";
import { INBOX_KIND_LABELS } from "@/lib/domain";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getInboxItemById(id);

  return { title: item ? `Editar: ${item.title ?? INBOX_KIND_LABELS[item.kind]}` : "Editar item" };
}

export default async function EditInboxItemPage({ params }: PageProps) {
  const { id } = await params;
  const [user, item] = await Promise.all([requireUser(), getInboxItemById(id)]);

  if (!item) {
    notFound();
  }

  return (
    <>
      <PageHeader title="Editar item" description={item.title ?? INBOX_KIND_LABELS[item.kind]} />

      <InboxItemForm item={item} userId={user.id} />
    </>
  );
}
