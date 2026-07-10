import React from "react";

/**
 * Scopes the green guide palette (`.guide-theme` in globals.css) to this route
 * subtree. The shared dashboard shell — sidebar and header — renders outside
 * this boundary and keeps the app's red/teal brand.
 *
 * The padding here stacks on top of the shell's own `<main>` padding to give
 * the panel room on all four sides; `min-h-full` guarantees the bottom gap is
 * present even on pages too short to scroll.
 */
export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="guide-theme min-h-full p-2 sm:p-3 lg:p-4">{children}</div>
  );
}
