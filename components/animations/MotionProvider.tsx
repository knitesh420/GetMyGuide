"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Wraps the whole app so every `motion` component honours the OS-level
 * "reduce motion" preference. `reducedMotion="user"` makes Framer Motion drop
 * transform/layout animations (translate, scale, rotate) while keeping opacity
 * cross-fades, which is the accessible default — individual components don't
 * each have to branch on the media query.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
