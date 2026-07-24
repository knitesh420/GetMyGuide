"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EASE_OUT, staggerParent } from "@/lib/motion";

export type TicketRow = { label: string; value: ReactNode };

/**
 * Boarding-pass style booking confirmation.
 *
 * Reveals by unfolding from the top (scaleY from the origin) so it reads like a
 * ticket being printed, then staggers the detail rows in. The perforated middle
 * and the notches on either side are pure CSS — no images.
 */
export default function BookingTicket({
  title,
  subtitle,
  bookingId,
  rows,
  footer,
  className,
}: {
  /** Headline on the stub — usually the tour or guide name. */
  title: string;
  subtitle?: string;
  /** Shown in the tear-off strip. */
  bookingId?: string;
  rows: TicketRow[];
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={cn("relative mx-auto w-full max-w-md", className)}
      initial={{ opacity: 0, y: 28, scaleY: 0.9 }}
      animate={{ opacity: 1, y: 0, scaleY: 1 }}
      style={{ originY: 0 }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.35 }}
    >
      <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-100">
        {/* ── Header ── */}
        <div className="relative bg-gradient-to-br from-red-600 to-orange-500 px-6 py-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
            Booking Confirmed
          </p>
          <h3 className="mt-1 truncate text-lg font-bold">{title}</h3>
          {subtitle && <p className="truncate text-sm text-white/80">{subtitle}</p>}
        </div>

        {/* ── Detail rows ── */}
        <motion.dl
          className="space-y-3 px-6 py-5"
          variants={staggerParent(0.08, 0.75)}
          initial="hidden"
          animate="visible"
        >
          {rows.map((row) => (
            <motion.div
              key={row.label}
              className="flex items-start justify-between gap-4"
              variants={{
                hidden: { opacity: 0, x: -12 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE_OUT } },
              }}
            >
              <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {row.label}
              </dt>
              <dd className="text-right text-sm font-semibold text-slate-800">{row.value}</dd>
            </motion.div>
          ))}
        </motion.dl>

        {/* ── Perforated tear line, with a notch punched out of each side ── */}
        <div className="relative" aria-hidden="true">
          <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-slate-50 ring-1 ring-slate-100" />
          <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-slate-50 ring-1 ring-slate-100" />
          <motion.div
            className="mx-6 border-t-2 border-dashed border-slate-200"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.65, ease: EASE_OUT }}
          />
        </div>

        {/* ── Stub ── */}
        <div className="flex items-center justify-between gap-4 px-6 py-5">
          {bookingId && (
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Booking ID
              </p>
              <p className="truncate font-mono text-sm font-bold text-slate-800">{bookingId}</p>
            </div>
          )}
          {footer}
        </div>
      </div>
    </motion.div>
  );
}
