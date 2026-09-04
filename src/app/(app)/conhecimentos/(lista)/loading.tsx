import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for the list.
 *
 * It sits inside the `(lista)` route group on purpose. A `loading.tsx` covers
 * every nested segment, so at `conhecimentos/` it would also be the fallback
 * for `conhecimentos/[id]` — opening a record from a fresh page load would
 * flash a list skeleton announcing "Carregando conhecimentos…". The group
 * scopes it to the list without changing the URL.
 */
export default function KnowledgeListLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando conhecimentos…</span>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>

      <Skeleton className="mb-6 h-9 w-full" />

      <div className="grid gap-px overflow-hidden rounded-lg border">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-[86px] rounded-none" />
        ))}
      </div>
    </div>
  );
}
