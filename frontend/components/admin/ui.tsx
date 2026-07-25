"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, RefreshCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EASE_BACK, EASE_OUT } from "@/lib/motion";

/**
 * Shared layout primitives for the admin dashboard.
 *
 * These mirror the guide dashboard's reference system
 * (`components/guide/guide-shell.tsx`, `guide-stats.tsx`, `guide-table.tsx`)
 * one-for-one — same panels, tables, badges, pagination, stat cards and motion
 * — but carry the admin's teal/cyan accent instead of the guide's green, so the
 * two dashboards read as the same product without recolouring either brand.
 *
 * `PageHeader` and `EmptyState` already live in `./PageHeader`; they're
 * re-exported here so a page can pull every admin primitive from one module.
 */

export { PageHeader, EmptyState } from "./PageHeader";

/** White, hairline-bordered surface that content sits on. */
export function AdminPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The band directly under a panel's top edge: search / filters at the left,
 * stats or actions pushed to the right. Both sides are optional so pages that
 * only need one still line up on the same baseline.
 */
export function AdminToolbar({
  children,
  stats,
  className,
}: {
  children?: React.ReactNode;
  stats?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      <div className="w-full lg:max-w-xs">{children}</div>
      {stats && (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          {stats}
        </div>
      )}
    </div>
  );
}

/** Minimal underlined search field, magnifier trailing. */
export function AdminSearchInput({
  value,
  onChange,
  placeholder = "Search",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative border-b border-slate-200", className)}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent py-2 pr-8 text-sm text-slate-700 outline-none placeholder:text-slate-400"
      />
      <Search className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

/** Titled band inside a panel, ruled off from the band above it. */
export function AdminSection({
  title,
  icon: Icon,
  description,
  action,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 px-6 py-5 last:border-b-0">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            {Icon && <Icon className="h-4 w-4 text-slate-400" />}
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/** Label-over-value pair, the unit every detail section is built from. */
export function AdminField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <div className="text-sm font-semibold text-slate-900">{children}</div>
    </div>
  );
}

// ─── Tables ──────────────────────────────────────────────────────────────────

export function AdminTable({
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

export function AdminTableHead({ columns }: { columns: React.ReactNode[] }) {
  return (
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50">
        {columns.map((column, index) => (
          <th
            key={index}
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

export function AdminTableRow({
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
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.35), ease: EASE_OUT }}
    >
      {children}
    </motion.tr>
  );
}

export function AdminTableCell({
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
export function AdminCellStack({
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

// ─── Status badge ────────────────────────────────────────────────────────────

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-green-50 text-green-700 ring-green-600/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  danger: "bg-red-50 text-red-700 ring-red-600/20",
  info: "bg-teal-50 text-teal-700 ring-teal-600/20",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

/** Lifecycle states as they arrive from the API, mapped to a tone. */
const STATUS_TONES: Record<string, Tone> = {
  completed: "success",
  successful: "success",
  confirmed: "success",
  accepted: "success",
  active: "success",
  approved: "success",
  processed: "success",
  paid: "success",
  allocated: "info",
  assigned: "info",
  upcoming: "info",
  "in-progress": "info",
  planned: "info",
  pending: "warning",
  "payment-pending": "warning",
  requested: "warning",
  "not-started": "warning",
  processing: "warning",
  cancelled: "danger",
  rejected: "danger",
  declined: "danger",
  expired: "danger",
  failed: "danger",
  disabled: "danger",
};

export function AdminStatusBadge({
  status,
  tone: toneOverride,
  label: labelOverride,
}: {
  status: string;
  /** Force a tone instead of deriving it from `status`. */
  tone?: Tone;
  /** Override the humanised label. */
  label?: string;
}) {
  const tone = toneOverride ?? STATUS_TONES[status?.toLowerCase()] ?? "neutral";
  const label =
    labelOverride ??
    (status
      ? status.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Unknown");

  return (
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

// ─── Stat cards ──────────────────────────────────────────────────────────────

type StatTone = "slate" | "teal" | "green" | "blue" | "amber";

const STAT_TONES: Record<StatTone, string> = {
  slate: "bg-slate-50 text-slate-500 ring-slate-200",
  teal: "bg-teal-50 text-teal-600 ring-teal-200",
  green: "bg-green-50 text-green-600 ring-green-200",
  blue: "bg-blue-50 text-blue-600 ring-blue-200",
  amber: "bg-amber-50 text-amber-600 ring-amber-200",
};

/** A full KPI card for figures that lead a page. Mirrors `GuideStatCard`. */
export function AdminStatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "teal",
  index = 0,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: StatTone;
  /** Position in the row — staggers the entrance. */
  index?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.08, 0.4), ease: EASE_OUT }}
      whileHover={{ y: -4 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="mt-2 truncate text-2xl leading-none font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {hint && <p className="mt-2 truncate text-xs text-slate-400">{hint}</p>}
        </div>
        <motion.div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
            STAT_TONES[tone],
          )}
          whileHover={{ scale: 1.1, rotate: -8 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <Icon className="h-5 w-5" />
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Error state ─────────────────────────────────────────────────────────────

/** Standard "the fetch failed" panel with an optional retry. */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-red-200 bg-red-50/60 px-6 py-12 text-center",
        className,
      )}
      role="alert"
    >
      <p className="text-sm font-semibold text-red-800">{title}</p>
      {message && (
        <p className="mx-auto mt-1 max-w-md text-sm text-red-700/80">{message}</p>
      )}
      {onRetry && (
        <Button
          variant="outline"
          className="mt-4 h-9 rounded-lg border-red-200 bg-white text-red-700 hover:bg-red-50"
          onClick={onRetry}
        >
          <RefreshCcw aria-hidden="true" className="mr-1.5 h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

/**
 * Centred numeric pagination with a sliding five-page window. Mirrors
 * `GuidePagination`, teal active pill.
 */
export function AdminPagination({
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
          {p === page && (
            <motion.span
              layoutId="admin-pagination-active"
              className="absolute inset-0 rounded-md bg-teal-500"
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
        className={cn(stepClasses, "bg-teal-50 text-teal-600 border-teal-200")}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
