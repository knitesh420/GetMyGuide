"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./footer";

/**
 * The dashboard shell is sized to exactly fill the viewport below the fixed
 * site header and scrolls internally. A footer rendered beneath it would make
 * the page itself scroll, dragging the dashboard — and its own sticky header —
 * up underneath that fixed navbar.
 */
export function ConditionalFooter() {
  const pathname = usePathname();

  if (pathname?.startsWith("/dashboard")) return null;

  return <Footer />;
}
