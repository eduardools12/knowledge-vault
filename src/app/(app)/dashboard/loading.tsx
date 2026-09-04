import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while the dashboard's queries run.
 *
 * The shape mirrors the real page — four cards, a list, two columns — so the
 * layout does not jump when the data arrives. A centred spinner would be less
 * work and a worse experience.
 */
export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando o dashboard…</span>

      <div className="mb-8 grid gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-10">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-[86px] rounded-lg" />
          ))}
        </div>

        <div className="grid gap-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-[132px] rounded-lg" />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="grid gap-3">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-[196px] rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
