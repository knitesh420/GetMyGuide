import React from "react";

/**
 * Scopes the teal tourist palette (`.tourist-theme` in globals.css) to this
 * route subtree, exactly as app/(website)/dashboard/guide/layout.tsx does for
 * the green guide palette. The shared dashboard shell — sidebar and header —
 * renders outside this boundary and keeps the app's red/teal brand.
 *
 * No padding of its own: the shell's <main> already supplies the page gutter
 * (p-4 md:p-6 lg:p-8) and every tourist page wraps its content in `PAGE`
 * (components/dashboard/tourist/ui.ts), so adding more here would double it.
 * `min-h-full` only guarantees the theme covers the full shell height.
 */
export default function TouristDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="tourist-theme min-h-full">{children}</div>;
}
