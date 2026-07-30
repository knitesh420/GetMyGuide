"use client";

import { animate, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { EASE_OUT, IN_VIEW } from "@/lib/motion";
import { usePrefersReducedMotion } from "./use-reduced-motion";

type CountUpProps = {
  /** Final value to count to. */
  to: number;
  /** Value to start from. Defaults to 0. */
  from?: number;
  /** Seconds the count takes. Defaults to 1.6. */
  duration?: number;
  /** Decimal places to render. Defaults to 0. */
  decimals?: number;
  /** Rendered before the number, e.g. "₹". */
  prefix?: string;
  /** Rendered after the number, e.g. "+" or "★". */
  suffix?: string;
  /**
   * Locale for thousands separators. Left undefined on purpose so the output
   * matches a plain `value.toLocaleString()` — pass one only to override.
   */
  locale?: string;
  /**
   * Full control over rendering, e.g. a currency formatter. Takes precedence
   * over `decimals`/`locale`/`prefix`/`suffix`.
   */
  format?: (value: number) => string;
  className?: string;
};

/**
 * Counts a number up when it first scrolls into view.
 *
 * Falls back to rendering the final value immediately when the user has
 * "reduce motion" enabled, so the information is never withheld — only the
 * animation is skipped.
 */
export default function CountUp({
  to,
  from = 0,
  duration = 1.6,
  decimals = 0,
  prefix = "",
  suffix = "",
  locale,
  format,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, IN_VIEW);
  const reduceMotion = usePrefersReducedMotion();
  const [animated, setAnimated] = useState(from);

  useEffect(() => {
    if (!inView || reduceMotion) return;

    const controls = animate(from, to, {
      duration,
      ease: EASE_OUT,
      onUpdate: setAnimated,
    });

    return () => controls.stop();
  }, [inView, from, to, duration, reduceMotion]);

  // Derived, so the reduced-motion branch needs no setState in the effect:
  // when motion is reduced there is no tween, so the final value is simply what
  // we render. `usePrefersReducedMotion` gives a definitive boolean (unlike
  // Framer's null-first hook), so this reliably shows `to` rather than 0.
  const display = reduceMotion ? to : animated;

  if (format) {
    return (
      <span ref={ref} className={className}>
        {format(display)}
      </span>
    );
  }

  const formatted = display.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
