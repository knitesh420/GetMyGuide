"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/motion";

/**
 * The reference puts summary figures inline in the toolbar rather than in a row
 * of large KPI cards: a bordered icon badge, a small muted label, and a bold
 * value beneath it. One figure per strip may be highlighted (`accent`) — in the
 * shot that's the "Available to Redeem" number, rendered green.
 */
export function GuideStat({
  icon: Icon,
  label,
  value,
  accent = false,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
        <Icon className="h-4 w-4 text-slate-600" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] leading-tight font-medium text-slate-400">
          {label}
        </p>
        <p
          className={cn(
            "truncate text-base leading-tight font-bold",
            accent ? "text-green-600" : "text-slate-900",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export function GuideStatStrip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-8 gap-y-4", className)}>
      {children}
    </div>
  );
}

type StatTone = "slate" | "green" | "blue" | "amber";

/** Icon tile fill, foreground, and hairline ring, per tone. */
const STAT_TONES: Record<StatTone, string> = {
  slate: "bg-slate-50 text-slate-500 ring-slate-200",
  green: "bg-green-50 text-green-600 ring-green-200",
  blue: "bg-blue-50 text-blue-600 ring-blue-200",
  amber: "bg-amber-50 text-amber-600 ring-amber-200",
};

/**
 * The standalone counterpart to `GuideStat`: a full card for figures that lead a
 * page rather than trail a toolbar. Landing pages use these; list pages keep the
 * inline strip so the numbers stay subordinate to the table.
 */
export function GuideStatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "slate",
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
