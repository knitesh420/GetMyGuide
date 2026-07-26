import { Skeleton } from "@/components/ui/skeleton";
import { CARD, PAGE } from "./ui";

/**
 * Mirrors the real dashboard's layout so the page doesn't reflow when data
 * lands. Announced politely as "busy" rather than silently swapping in.
 *
 * Every block here tracks its counterpart's geometry: the hero's rounded-2xl,
 * the stat row's `sm:grid-cols-2 xl:grid-cols-4` with the double-width money
 * tile, and the panels' px-5 py-4 header band — so the grid doesn't re-flow the
 * moment the numbers arrive.
 */
function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <Skeleton className="h-4 w-4 rounded" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 px-5 py-4"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={PAGE}>
      <span className="sr-only">Loading your dashboard…</span>

      {/* Hero */}
      <Skeleton className="h-64 rounded-2xl sm:h-56 lg:h-48" />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
        <Skeleton className="h-28 rounded-xl sm:col-span-2 xl:col-span-2" />
      </div>

      {/* Next trip */}
      <Skeleton className="h-72 rounded-xl" />

      {/* Two-column body */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
        <div className="space-y-6">
          <SectionSkeleton rows={2} />
          <SectionSkeleton rows={2} />
        </div>
      </div>
    </div>
  );
}
