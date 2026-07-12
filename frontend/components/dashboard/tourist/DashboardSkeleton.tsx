import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the real dashboard's layout so the page doesn't reflow when data
 * lands. Announced politely as "busy" rather than silently swapping in.
 */
function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card className="gap-0 overflow-hidden rounded-2xl py-0 shadow-sm">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-4">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="space-y-6"
    >
      <span className="sr-only">Loading your dashboard…</span>

      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-full" />
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-[130px] rounded-2xl" />
        ))}
      </div>

      {/* Hero */}
      <Skeleton className="h-64 rounded-2xl" />

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
