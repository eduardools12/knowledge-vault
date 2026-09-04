import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for a single knowledge record.
 *
 * Without this, the list's `loading.tsx` covers this route too — a `loading`
 * file applies to every nested segment — and opening a record announces
 * "Carregando conhecimentos…" while showing a list skeleton.
 */
export default function KnowledgeDetailLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="grid gap-8">
      <span className="sr-only">Carregando conhecimento…</span>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full max-w-prose" />
        </div>
        <Skeleton className="h-4 w-56" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-20" />
        </div>
      </div>

      <div className="grid gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    </div>
  );
}
