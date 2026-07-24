"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import { usePrefersReducedMotion } from "./use-reduced-motion";

/**
 * Travel-themed decorative animations.
 *
 * These are all presentational: every element is `aria-hidden` and
 * `pointer-events-none`, and each one bails out to a static (or absent) render
 * under `prefers-reduced-motion`. They are safe to drop into any hero or empty
 * state without affecting layout or interaction.
 */

// ─── Flying plane with a dotted contrail ─────────────────────────────────────
export function FlyingPlane({
  className,
  duration = 18,
  delay = 0,
}: {
  className?: string;
  /** Seconds for one full crossing. */
  duration?: number;
  delay?: number;
}) {
  const reduceMotion = usePrefersReducedMotion();
  if (reduceMotion) return null;

  return (
    <motion.div
      className={cn("pointer-events-none absolute", className)}
      aria-hidden="true"
      initial={{ x: "-15vw", y: 0, opacity: 0 }}
      animate={{ x: "115vw", y: [-12, 12, -12], opacity: [0, 1, 1, 0] }}
      transition={{
        x: { duration, repeat: Infinity, ease: "linear", delay },
        y: { duration: duration / 3, repeat: Infinity, ease: EASE_IN_OUT, delay },
        opacity: { duration, repeat: Infinity, times: [0, 0.08, 0.9, 1], delay },
      }}
    >
      <svg width="120" height="28" viewBox="0 0 120 28" fill="none">
        {/* Contrail */}
        <path
          d="M2 15 H78"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="2 9"
          className="text-white/45"
        />
        {/* Plane */}
        <path
          d="M92 14 L110 8 L118 14 L110 20 Z M92 14 L84 6 L88 14 L84 22 Z"
          fill="currentColor"
          className="text-white/85"
        />
      </svg>
    </motion.div>
  );
}

// ─── Drifting clouds ─────────────────────────────────────────────────────────
export function FloatingClouds({ className }: { className?: string }) {
  const reduceMotion = usePrefersReducedMotion();
  if (reduceMotion) return null;

  const clouds = [
    { top: "12%", scale: 1, duration: 46, delay: 0, opacity: 0.16 },
    { top: "38%", scale: 0.65, duration: 62, delay: 8, opacity: 0.12 },
    { top: "68%", scale: 0.85, duration: 54, delay: 18, opacity: 0.1 },
  ];

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {clouds.map((cloud, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ top: cloud.top, scale: cloud.scale, opacity: cloud.opacity }}
          initial={{ x: "-25vw" }}
          animate={{ x: "125vw" }}
          transition={{ duration: cloud.duration, repeat: Infinity, ease: "linear", delay: cloud.delay }}
        >
          <svg width="180" height="70" viewBox="0 0 180 70" fill="currentColor" className="text-white">
            <ellipse cx="50" cy="45" rx="42" ry="24" />
            <ellipse cx="92" cy="34" rx="34" ry="30" />
            <ellipse cx="132" cy="46" rx="36" ry="22" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Compass ─────────────────────────────────────────────────────────────────
/** A compass whose needle sweeps and settles — good for empty / no-results states. */
export function AnimatedCompass({ size = 72, className }: { size?: number; className?: string }) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="44" className="fill-white stroke-slate-200" strokeWidth="3" />
      <circle cx="50" cy="50" r="36" className="fill-none stroke-slate-100" strokeWidth="2" />
      {/* Tick marks at the cardinal points */}
      {[0, 90, 180, 270].map((angle) => (
        <line
          key={angle}
          x1="50"
          y1="10"
          x2="50"
          y2="18"
          className="stroke-slate-300"
          strokeWidth="2.5"
          strokeLinecap="round"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}
      <motion.g
        style={{ originX: "50px", originY: "50px" }}
        animate={reduceMotion ? undefined : { rotate: [0, 340, 160, 300, 315] }}
        transition={{ duration: 4, repeat: Infinity, repeatDelay: 1.5, ease: EASE_IN_OUT }}
      >
        {/* North half (red) and south half (slate) */}
        <path d="M50 18 L58 50 L50 44 L42 50 Z" className="fill-red-600" />
        <path d="M50 82 L42 50 L50 56 L58 50 Z" className="fill-slate-400" />
      </motion.g>
      <circle cx="50" cy="50" r="4" className="fill-white stroke-slate-300" strokeWidth="2" />
    </svg>
  );
}

// ─── Rotating globe (loading) ────────────────────────────────────────────────
export function RotatingGlobe({ size = 64, className }: { size?: number; className?: string }) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Loading"
    >
      <circle cx="50" cy="50" r="40" className="fill-red-50 stroke-red-500" strokeWidth="3" />
      {/* Equator + latitude lines stay put; the meridians spin behind them. */}
      <ellipse cx="50" cy="50" rx="40" ry="14" className="fill-none stroke-red-400/60" strokeWidth="2" />
      <ellipse cx="50" cy="50" rx="40" ry="30" className="fill-none stroke-red-400/40" strokeWidth="1.5" />
      <motion.g
        style={{ originX: "50px", originY: "50px" }}
        animate={reduceMotion ? undefined : { scaleX: [1, 0.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      >
        <ellipse cx="50" cy="50" rx="18" ry="40" className="fill-none stroke-red-500/70" strokeWidth="2" />
      </motion.g>
      <line x1="10" y1="50" x2="90" y2="50" className="stroke-red-500/70" strokeWidth="2" />
    </svg>
  );
}

// ─── Dotted travel route ─────────────────────────────────────────────────────
/**
 * A dashed arc that draws itself in, with a marker at each end — the visual
 * shorthand for "journey from A to B".
 */
export function DottedRoute({ className, delay = 0 }: { className?: string; delay?: number }) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <svg
      viewBox="0 0 300 80"
      className={cn("w-full", className)}
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <motion.path
        d="M12 62 Q 150 -14 288 62"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="6 10"
        initial={{ pathLength: reduceMotion ? 1 : 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 1.6, delay, ease: EASE_OUT }}
      />
      <circle cx="12" cy="62" r="6" fill="currentColor" />
      <circle cx="288" cy="62" r="6" fill="currentColor" />
    </svg>
  );
}

// ─── Dropping map pin ────────────────────────────────────────────────────────
export function DroppingPin({
  size = 40,
  delay = 0,
  className,
}: {
  size?: number;
  delay?: number;
  className?: string;
}) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 32"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      initial={reduceMotion ? { opacity: 0 } : { y: -40, opacity: 0, scale: 0.7 }}
      whileInView={{ y: 0, opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ type: "spring", stiffness: 420, damping: 18, delay }}
    >
      <path
        d="M12 0C5.9 0 1 4.9 1 11c0 8 11 21 11 21s11-13 11-21c0-6.1-4.9-11-11-11z"
        fill="currentColor"
      />
      <circle cx="12" cy="11" r="4" className="fill-white" />
    </motion.svg>
  );
}

// ─── Journey path between booking steps ──────────────────────────────────────
/**
 * Horizontal progress rail for multi-step flows: a dashed track that fills
 * solid as the traveller advances, with a plane riding the leading edge.
 */
export function JourneyProgress({
  steps,
  current,
  className,
}: {
  /** Short labels, one per step. */
  steps: string[];
  /** Zero-based index of the active step. */
  current: number;
  className?: string;
}) {
  const progress = steps.length > 1 ? current / (steps.length - 1) : 1;

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* Track */}
        <div className="absolute left-0 right-0 top-4 h-0.5 -translate-y-1/2 bg-slate-200" aria-hidden="true">
          <motion.div
            className="h-full origin-left bg-gradient-to-r from-red-600 to-orange-500"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          />
        </div>

        <ol className="relative flex justify-between">
          {steps.map((label, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li key={label} className="flex flex-col items-center gap-2">
                <motion.div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white text-xs font-bold transition-colors",
                    done && "border-red-600 bg-red-600 text-white",
                    active && "border-red-600 text-red-600",
                    !done && !active && "border-slate-200 text-slate-400",
                  )}
                  animate={active ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                  transition={{ duration: 0.45, ease: EASE_OUT }}
                >
                  {done ? (
                    <motion.svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <motion.path
                        d="M20 6 L9 17 L4 12"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3, ease: EASE_OUT }}
                      />
                    </motion.svg>
                  ) : (
                    i + 1
                  )}
                </motion.div>
                <span
                  className={cn(
                    "max-w-[80px] text-center text-[11px] font-semibold leading-tight",
                    active || done ? "text-slate-800" : "text-slate-400",
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
