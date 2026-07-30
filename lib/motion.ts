/**
 * Shared motion tokens for the whole app.
 *
 * Everything here is data only (no JSX) so it can be imported from server or
 * client files. The existing `lib/motion-variants.ts` is kept as-is for the
 * sections that already use it; new work should prefer these tokens so timing
 * stays consistent across the product.
 */
import type { Transition, Variants } from "framer-motion";

// ─── Easing ──────────────────────────────────────────────────────────────────
/** Standard "expo out" curve — quick departure, soft landing. Our default. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
/** Symmetric curve for things that move both ways (accordions, drawers). */
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
/** Slight overshoot, for celebratory / attention-grabbing entrances. */
export const EASE_BACK = [0.34, 1.56, 0.64, 1] as const;

// ─── Durations (seconds) ─────────────────────────────────────────────────────
export const DURATION = {
  /** Hover states, icon swaps, taps. */
  fast: 0.18,
  /** Dropdowns, tooltips, badges. */
  base: 0.3,
  /** Card entrances, section reveals. */
  slow: 0.6,
  /** Hero / full-screen moments. */
  slower: 0.9,
} as const;

// ─── Spring presets ──────────────────────────────────────────────────────────
/** Snappy, minimal wobble — buttons, toggles, counters. */
export const SPRING_SNAPPY: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};
/** Softer, with a touch of bounce — modals, success moments. */
export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 22,
};

// ─── Reusable variants ───────────────────────────────────────────────────────
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: DURATION.base, ease: EASE_OUT } },
};

export const slideUpPanel: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
  exit: { opacity: 0, y: 16, transition: { duration: DURATION.fast } },
};

/** Parent for staggered lists. `custom` sets the per-child delay. */
export const staggerParent = (stagger = 0.07, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren } },
});

/** Collapsible section body — height animation for accordions/filters. */
export const collapse: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: "auto",
    opacity: 1,
    transition: { height: { duration: DURATION.base, ease: EASE_OUT }, opacity: { duration: 0.2, delay: 0.05 } },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { height: { duration: 0.25, ease: EASE_IN_OUT }, opacity: { duration: 0.15 } },
  },
};

// ─── Interaction presets ─────────────────────────────────────────────────────
/** Spread onto any `motion.button` for the standard press feel. */
export const tapScale = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 }, transition: SPRING_SNAPPY };

/** Spread onto a card wrapper for the standard hover lift. */
export const hoverLift = { whileHover: { y: -6 }, transition: SPRING_SNAPPY };

/** Shared `useInView` options so scroll reveals trigger at the same point. */
export const IN_VIEW = { once: true, margin: "-80px 0px" } as const;
