"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Hydration-safe `prefers-reduced-motion`.
 *
 * Framer's own `useReducedMotion()` reads matchMedia in a way that returns the
 * live client value on the very first client render — which, during hydration,
 * disagrees with the server (the server can't know the preference). Any
 * component that *renders differently* under reduced motion (returns null,
 * toggles an element, or sets a reduced-motion-dependent `initial`) then
 * produces a hydration mismatch (React #418).
 *
 * `useSyncExternalStore` fixes that: it uses the server snapshot (`false`)
 * during hydration, so server and client agree, then reconciles to the real
 * value immediately after. Prefer this over Framer's hook wherever the reduced
 * value changes the rendered output rather than just a transition/animate prop.
 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED_MOTION_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}
