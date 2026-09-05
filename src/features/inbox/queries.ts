import "server-only";

import { cache } from "react";

import { INBOX_PAGE_SIZE, type InboxFilters } from "@/features/inbox/schemas";
import { createSignedUrl } from "@/features/inbox/storage";
import { requireUser } from "@/lib/auth/dal";
import { INBOX_STATUSES, type InboxKind, type InboxStatus } from "@/lib/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

export type InboxItemSummary = {
  id: string;
  kind: InboxKind;
  status: InboxStatus;
  title: string | null;
  url: string | null;
  content: string | null;
  note: string | null;
  hasFile: boolean;
  knowledgeId: string | null;
  createdAt: string;
};

export type InboxItemDetail = InboxItemSummary & {
  storagePath: string | null;
  /** Short-lived link for the attached file, generated at render time. */
  fileUrl: string | null;
};

const LIST_SELECT = "id, kind, status, title, url, content, note, storage_path, knowledge_id, created_at";

type InboxItemRow = {
  id: string;
  kind: InboxKind;
  status: InboxStatus;
  title: string | null;
  url: string | null;
  content: string | null;
  note: string | null;
  storage_path: string | null;
  knowledge_id: string | null;
  created_at: string;
};

export type InboxListResult = {
  items: InboxItemSummary[];
  total: number;
  page: number;
  pageCount: number;
};

export async function listInboxItems(filters: InboxFilters): Promise<InboxListResult> {
  await requireUser();

  const supabase = await createSupabaseServerClient();
  const page = filters.page ?? 1;
  const from = (page - 1) * INBOX_PAGE_SIZE;

  let query = supabase
    .from("inbox_items")
    .select(LIST_SELECT, { count: "exact" })
    .range(from, from + INBOX_PAGE_SIZE - 1)
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[inbox] list failed:", error.message);

    return { items: [], total: 0, page, pageCount: 1 };
  }

  const total = count ?? 0;

  return {
    items: (data ?? []).map(toSummary),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / INBOX_PAGE_SIZE)),
  };
}

export const getInboxItemById = cache(async (id: string): Promise<InboxItemDetail | null> => {
  await requireUser();

  if (!isUuid(id)) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inbox_items")
    .select(`${LIST_SELECT}`)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[inbox] detail failed:", error.message);
    }

    return null;
  }

  const row = data as InboxItemRow;

  return {
    ...toSummary(row),
    storagePath: row.storage_path,
    fileUrl: row.storage_path ? await createSignedUrl(supabase, row.storage_path) : null,
  };
});

/**
 * How many items sit in each status.
 *
 * Four small counts rather than one aggregate query: the states are fixed and
 * few, and `count: "exact", head: true"` per status is a lighter and more
 * direct way to get them than fetching every row to reduce in JavaScript.
 */
export async function countInboxByStatus(): Promise<Record<InboxStatus, number>> {
  await requireUser();

  const supabase = await createSupabaseServerClient();
  const results = await Promise.all(
    INBOX_STATUSES.map((status) =>
      supabase.from("inbox_items").select("id", { count: "exact", head: true }).eq("status", status),
    ),
  );

  const counts = {} as Record<InboxStatus, number>;

  INBOX_STATUSES.forEach((status, index) => {
    const { count, error } = results[index];

    if (error) {
      console.error("[inbox] count failed:", error.message);
    }

    counts[status] = count ?? 0;
  });

  return counts;
}

function toSummary(row: InboxItemRow): InboxItemSummary {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    title: row.title,
    url: row.url,
    content: row.content,
    note: row.note,
    hasFile: Boolean(row.storage_path),
    knowledgeId: row.knowledge_id,
    createdAt: row.created_at,
  };
}
