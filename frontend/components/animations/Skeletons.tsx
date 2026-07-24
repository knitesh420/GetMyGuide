"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { staggerParent } from "@/lib/motion";

/**
 * Shimmering placeholder block. Prefer this over a spinner whenever the shape
 * of the incoming content is known — it keeps layout stable and reads as
 * faster than an indeterminate spinner.
 */
export function Shimmer({ className }: { className?: string }) {
  return <div className={cn("gmg-shimmer rounded-md", className)} aria-hidden="true" />;
}

/** Placeholder matching a tour/package card: image, title, meta, price row. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-slate-100 bg-white overflow-hidden", className)}>
      <Shimmer className="h-44 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-3 w-1/2" />
        <div className="flex items-center gap-2 pt-2">
          <Shimmer className="h-3 w-16" />
          <Shimmer className="h-3 w-16" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <Shimmer className="h-6 w-24" />
          <Shimmer className="h-9 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** A responsive grid of card placeholders. */
export function SkeletonCardGrid({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6", className)}
      variants={staggerParent(0.05)}
      initial="hidden"
      animate="visible"
      role="status"
      aria-label="Loading results"
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
        >
          <SkeletonCard />
        </motion.div>
      ))}
    </motion.div>
  );
}

/** Placeholder for a dashboard KPI tile. */
export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-slate-100 bg-white p-5 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-9 w-9 rounded-xl" />
      </div>
      <Shimmer className="h-8 w-20" />
      <Shimmer className="h-3 w-32" />
    </div>
  );
}

/** Row of KPI placeholders. */
export function SkeletonStatRow({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}
      role="status"
      aria-label="Loading statistics"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStat key={i} />
      ))}
    </div>
  );
}

/** Placeholder for a data table — header bar plus N rows. */
export function SkeletonTable({
  rows = 6,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-2xl border border-slate-100 bg-white overflow-hidden", className)}
      role="status"
      aria-label="Loading table"
    >
      <div className="flex gap-4 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Shimmer key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-slate-50 px-4 py-4 last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Shimmer key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Placeholder for a stacked list of rows (bookings, notifications, reviews). */
export function SkeletonList({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label="Loading list">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4">
          <Shimmer className="h-12 w-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-3.5 w-1/3" />
            <Shimmer className="h-3 w-1/2" />
          </div>
          <Shimmer className="h-8 w-20 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}
