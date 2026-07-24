"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/lib/motion";

/**
 * Route-change transition for a layout's children.
 *
 * Deliberately enter-only. In the App Router the layout stays mounted and Next
 * swaps `children` synchronously on navigation, so an `AnimatePresence` exit
 * animation would either be skipped or fight the router. Keying a plain
 * enter animation on the pathname is the part that reliably works — and it's
 * the part users actually perceive.
 */
export default function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
