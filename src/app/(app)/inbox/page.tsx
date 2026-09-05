import { InboxIcon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { InboxItemRow } from "@/features/inbox/components/inbox-item-row";
import { InboxQuickAdd } from "@/features/inbox/components/inbox-quick-add";
import { InboxStatusTabs } from "@/features/inbox/components/inbox-status-tabs";
import { countInboxByStatus, listInboxItems } from "@/features/inbox/queries";
import { inboxFiltersSchema } from "@/features/inbox/schemas";
import { requireUser } from "@/lib/auth/dal";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Inbox",
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  // `.catch(undefined)` per field: a stale or hand-edited URL degrades to the
  // unfiltered queue instead of an error page.
  const filters = inboxFiltersSchema.parse(raw);

  const [user, { items, total, page, pageCount }, counts] = await Promise.all([
    requireUser(),
    listInboxItems(filters),
    countInboxByStatus(),
  ]);
  const now = new Date();

  function buildHref(nextPage: number): string {
    const params = new URLSearchParams();

    if (filters.status) params.set("status", filters.status);
    if (nextPage > 1) params.set("page", String(nextPage));

    const search = params.toString();

    return search ? `${ROUTES.inbox}?${search}` : ROUTES.inbox;
  }

  return (
    <>
      <PageHeader
        title="Inbox"
        description="A porta de entrada do acervo. Jogue aqui o que for interessante e organize depois."
      />

      <InboxQuickAdd userId={user.id} />

      <InboxStatusTabs active={filters.status} counts={counts} />

      {items.length === 0 ? (
        filters.status ? (
          <EmptyState
            icon={InboxIcon}
            title="Nada por aqui"
            description="Nenhum item neste status no momento."
          />
        ) : (
          <EmptyState
            icon={InboxIcon}
            title="Inbox vazia"
            description="Capture um link, uma nota ou uma ideia acima. Organizar vem depois — o que importa agora é não perder o que passou pela sua cabeça."
          />
        )
      ) : (
        <>
          <ul className="grid gap-px overflow-hidden rounded-lg border">
            {items.map((item) => (
              <InboxItemRow key={item.id} item={item} now={now} />
            ))}
          </ul>

          <Pagination page={page} pageCount={pageCount} total={total} buildHref={buildHref} />
        </>
      )}
    </>
  );
}
