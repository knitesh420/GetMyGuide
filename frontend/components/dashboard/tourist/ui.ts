/**
 * The class names every Tourist Dashboard surface shares, in one place, so a new
 * page can't drift out of the system by hand-rolling its own padding or card
 * chrome — which is exactly how the six pages ended up with three different page
 * backgrounds and five different heading sizes.
 *
 * These values track the guide dashboard's reference system
 * (`components/guide/guide-shell.tsx`, `guide-stats.tsx`) one-for-one — same
 * radii, borders, shadows, padding rhythm, type scale and slate neutrals — but
 * carry the tourist's teal accent instead of the guide's green, the same way
 * `components/admin/ui.tsx` does for the admin panel. All three dashboards read
 * as one product without recolouring any of them.
 *
 * Spacing is an 8px system: 8 (gap-2) / 16 (gap-4, p-4) / 20 (p-5, the panel
 * inset) / 24 (space-y-6, the band rhythm).
 *
 * Neutrals are spelled out as `slate-*` rather than taken from the semantic
 * tokens because the shared shadcn primitives ship an emerald hover treatment
 * the dashboards don't use; `.tourist-theme` (globals.css) fixes the tokens the
 * primitives *do* consume (--primary, --ring, --accent, --muted, --card).
 */

/**
 * The wrapper every page's content sits in. The dashboard layout's <main>
 * already supplies the page gutter (p-4 md:p-6 lg:p-8) — pages must not add
 * their own on top, or they double it. `space-y-6` is the guide panel's band
 * rhythm.
 */
export const PAGE = "mx-auto w-full max-w-7xl space-y-6";

/** Narrower column for the reading-heavy booking detail page. */
export const PAGE_NARROW = "mx-auto w-full max-w-5xl space-y-6";

/** The one <h1> on the page. Matches `GuidePageHeader`. */
export const PAGE_TITLE = "text-3xl font-bold tracking-tight text-slate-900";

export const PAGE_SUBTITLE = "mt-1 text-sm text-slate-500";

/**
 * Card chrome — the tourist twin of `GuidePanel`. The base <Card> primitive is
 * shared with the admin and guide dashboards and ships a 2xl radius, an emerald
 * hover ring and a hover lift; all three are neutralised here (`rounded-xl`,
 * `before:hidden`, `hover:translate-y-0`) so a static content card doesn't jump
 * under the cursor and the accent stays teal. `cn()` is tailwind-merge, so the
 * radius declared here wins over the primitive's.
 */
export const CARD =
  "rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 before:hidden hover:translate-y-0 hover:border-slate-200 hover:shadow-md";

/** Padding inside a card, and the horizontal inset its list rows must match. */
export const CARD_PADDING = "p-5";
export const ROW_PADDING = "px-5 py-4";

/** Hairline between stacked list rows, and the row's own hover wash. */
export const ROW_DIVIDER = "divide-y divide-slate-100";
export const ROW_HOVER = "transition-colors hover:bg-slate-50";
