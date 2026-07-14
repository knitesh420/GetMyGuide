import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CARD, PAGE } from "./ui";

/**
 * Mirrors the real dashboard's layout so the page doesn't reflow when data
 * lands. Announced politely as "busy" rather than silently swapping in.
 *
 * The stat placeholders repeat StatsGrid's column spans — including the wide
 * money tile — so the grid doesn't re-flow from 7 equal tiles into 6 + 1 double
 * the moment the numbers arrive.
 */
function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card className={`${CARD} gap-0 overflow-hidden py-0`}>
      <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-6 py-5 lg:px-8">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 px-6 py-4 lg:px-8"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={PAGE}>
      <span className="sr-only">Loading your dashboard…</span>

      {/* Header */}
      <div className="flex flex-col gap-6 border-b border-gray-200 pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          <Skeleton className="h-12 w-full sm:w-56" />
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6 2xl:grid-cols-7">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl lg:h-44" />
        ))}
        <Skeleton className="col-span-2 h-40 rounded-2xl lg:col-span-2 lg:h-44 2xl:col-span-1" />
      </div>

      {/* Hero */}
      <Skeleton className="h-72 rounded-2xl" />

      {/* Two-column body */}
      <div className="grid gap-6 lg:gap-8 xl:grid-cols-3">
        <div className="space-y-8 lg:space-y-10 xl:col-span-2">
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
        <div className="space-y-8 lg:space-y-10">
          <SectionSkeleton rows={2} />
          <SectionSkeleton rows={2} />
        </div>
      </div>
    </div>
  );
}
