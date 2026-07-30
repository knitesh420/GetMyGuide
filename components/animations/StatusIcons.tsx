"use client";

import { motion } from "framer-motion";
import { EASE_BACK, EASE_OUT, SPRING_SOFT } from "@/lib/motion";
import { usePrefersReducedMotion } from "./use-reduced-motion";

type IconProps = {
  /** Pixel size of the square icon. Defaults to 96. */
  size?: number;
  className?: string;
};

/**
 * Success checkmark: the ring scales in, then the tick draws itself, then a
 * halo pulses outward once.
 */
export function AnimatedCheck({ size = 96, className = "" }: IconProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className={`relative inline-flex ${className}`} style={{ width: size, height: size }}>
      {/* Pulsing halo */}
      {!reduceMotion && (
        <motion.span
          className="absolute inset-0 rounded-full bg-emerald-500/25"
          initial={{ scale: 0.8, opacity: 0.8 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 1.2, delay: 0.35, ease: EASE_OUT }}
        />
      )}

      <motion.svg
        viewBox="0 0 52 52"
        className="relative w-full h-full"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...SPRING_SOFT, delay: 0.05 }}
        role="img"
        aria-label="Success"
      >
        <motion.circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          strokeWidth="3"
          className="stroke-emerald-500"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
          style={{ rotate: -90, transformOrigin: "center" }}
        />
        <motion.path
          d="M15 27 L23 34 L38 18"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-emerald-500"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : 0.5, ease: EASE_OUT }}
        />
      </motion.svg>
    </div>
  );
}

/**
 * Failure cross: the ring draws, the two strokes cut in, and the whole mark
 * gives one gentle shake — enough to read as "something went wrong" without
 * being punishing.
 */
export function AnimatedCross({ size = 96, className = "" }: IconProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className={`relative inline-flex ${className}`}
      style={{ width: size, height: size }}
      animate={reduceMotion ? undefined : { x: [0, -8, 8, -5, 5, 0] }}
      transition={{ duration: 0.5, delay: 0.75, ease: EASE_OUT }}
    >
      <motion.svg
        viewBox="0 0 52 52"
        className="w-full h-full"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE_BACK }}
        role="img"
        aria-label="Failed"
      >
        <motion.circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          strokeWidth="3"
          className="stroke-red-500"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
          style={{ rotate: -90, transformOrigin: "center" }}
        />
        <motion.path
          d="M18 18 L34 34"
          strokeWidth="4"
          strokeLinecap="round"
          className="stroke-red-500"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.25, delay: reduceMotion ? 0 : 0.45 }}
        />
        <motion.path
          d="M34 18 L18 34"
          strokeWidth="4"
          strokeLinecap="round"
          className="stroke-red-500"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.25, delay: reduceMotion ? 0 : 0.62 }}
        />
      </motion.svg>
    </motion.div>
  );
}
