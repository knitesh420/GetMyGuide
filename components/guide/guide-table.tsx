"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_BACK, EASE_OUT } from "@/lib/motion";

/**
 * Table language for the guide dashboard: hairline rules on both axes, a grey
 * header strip, and generous row height. Written against bare table elements
 * rather than components/ui/table.tsx because that primitive leans on
 * `bg-muted` and `bg-card`, which this project never registers as Tailwind
 * colour utilities (see the `@theme inline` block in globals.css).
 */

export function GuideTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-left", className)}>
        {children}
      </table>
    </div>
  );
}

export function GuideTableHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50">
        {columns.map((column, index) => (
          <th
            key={column}
            scope="col"
            className={cn(
              "px-4 py-3 text-xs font-medium whitespace-nowrap text-slate-500",
              index < columns.length - 1 && "border-r border-slate-200",
            )}
          >
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function GuideTableRow({
  children,
  onClick,
  index = 0,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  /** Row position — staggers the entrance down the table. */
  index?: number;
}) {
  return (
    <motion.tr
      onClick={onClick}
      className={cn(
        "border-b border-slate-100 last:border-b-0",
        onClick && "cursor-pointer transition-colors hover:bg-slate-50",
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      // Capped so a long page doesn't leave the last rows waiting seconds.
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.35), ease: EASE_OUT }}
    >
      {children}
    </motion.tr>
  );
}

export function GuideTableCell({
  children,
  last = false,
  className,
}: {
  children: React.ReactNode;
  /** Suppresses the right-hand rule on the final column. */
  last?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-4 py-3.5 text-sm text-slate-700",
        !last && "border-r border-slate-100",
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Two-line cell — bold primary line over a muted caption. */
export function GuideCellStack({
  primary,
  secondary,
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-slate-900">{primary}</p>
      {secondary && (
        <p className="truncate text-xs text-slate-400">{secondary}</p>
      )}
    </div>
  );
}

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-green-50 text-green-700 ring-green-600/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  danger: "bg-red-50 text-red-700 ring-red-600/20",
  info: "bg-blue-50 text-blue-700 ring-blue-600/20",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

/** Booking, assignment, and trip lifecycle states as they arrive from the API. */
const STATUS_TONES: Record<string, Tone> = {
  completed: "success",
  successful: "success",
  confirmed: "success",
  accepted: "success",
  active: "success",
  allocated: "info",
  assigned: "info",
  upcoming: "info",
  "in-progress": "info",
  pending: "warning",
  "payment-pending": "warning",
  requested: "warning",
  "not-started": "warning",
  cancelled: "danger",
  rejected: "danger",
  declined: "danger",
  expired: "danger",
};

export function GuideStatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONES[status?.toLowerCase()] ?? "neutral";
  const label = status
    ? status.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Unknown";

  return (
    // Keyed on the status so a lifecycle change (pending → confirmed) swaps the
    // badge with a pop instead of silently recolouring it.
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={label}
        className={cn(
          "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
          TONE_CLASSES[tone],
        )}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.22, ease: EASE_BACK }}
      >
        {label}
      </motion.span>
    </AnimatePresence>
  );
}

/**
 * Centred numeric pagination. Renders a sliding five-page window so the control
 * keeps a fixed width no matter how deep the result set runs.
 */
export function GuidePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const windowSize = Math.min(5, totalPages);
  // Centre the window on the current page, then clamp it inside [1, totalPages]
  // so the first and last pages never scroll out of reach.
  const start = Math.min(
    Math.max(1, page - Math.floor(windowSize / 2)),
    totalPages - windowSize + 1,
  );
  const pages = Array.from({ length: windowSize }, (_, i) => start + i);

  const stepClasses =
    "flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-2 border-t border-slate-200 px-5 py-4"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={stepClasses}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p) => (
        <motion.button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          aria-current={p === page ? "page" : undefined}
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors",
            p === page ? "text-white" : "text-slate-600 hover:bg-slate-50",
          )}
          whileHover={{ scale: p === page ? 1 : 1.1 }}
          whileTap={{ scale: 0.92 }}
        >
          {/* One shared highlight slides across the page numbers. */}
          {p === page && (
            <motion.span
              layoutId="guide-pagination-active"
              className="absolute inset-0 rounded-md bg-green-500"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative z-10">{p}</span>
        </motion.button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={cn(stepClasses, "bg-green-50 text-green-600 border-green-200")}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
