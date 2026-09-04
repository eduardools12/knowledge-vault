import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for the list.
 *
 * Lives inside the `(lista)` route group so it does not also become the
 * fallback for `fontes/[id]` — see the identical note on the knowledge list for
 * the bug this avoids.
 */
export default function SourcesListLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando fontes…</span>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
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
