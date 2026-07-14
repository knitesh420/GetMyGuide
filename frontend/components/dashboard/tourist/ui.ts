/**
 * The class names every Tourist Dashboard surface shares, in one place, so a new
 * page can't drift out of the system by hand-rolling its own padding or card
 * chrome — which is exactly how the six pages ended up with three different page
 * backgrounds and five different heading sizes.
 *
 * Colours are spelled out (gray-900/700/500, white) rather than taken from the
 * semantic tokens: `--card` is #f8f8f8 and `--muted` is pure #ffffff, so
 * `bg-card` renders grey on the grey shell and every `bg-muted/40` hover is a
 * no-op. Fixing those tokens would change the admin and guide dashboards too, so
 * the dashboard states its own surface colours instead.
 */

/**
 * The wrapper every page's content sits in. The dashboard layout's <main>
 * already supplies the page gutter (p-4 md:p-6 lg:p-8) — pages must not add
 * their own on top, or they double it.
 */
export const PAGE = "mx-auto w-full max-w-7xl space-y-8 lg:space-y-10";

/** Narrower column for the reading-heavy booking detail page. */
export const PAGE_NARROW = "mx-auto w-full max-w-5xl space-y-8 lg:space-y-10";

/** The one <h1> on the page. */
export const PAGE_TITLE =
  "text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl";

export const PAGE_SUBTITLE = "mt-2 text-sm text-gray-500 md:text-base";

/**
 * Card chrome. The base <Card> primitive is shared with the admin and guide
 * dashboards and ships an emerald hover ring plus a hover lift; both are
 * neutralised here (`before:hidden`, `hover:-translate-y-0`) so a static content
 * card doesn't jump under the cursor and the accent stays teal.
 */
export const CARD =
  "rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 before:hidden hover:translate-y-0 hover:border-gray-200 hover:shadow-md";

/** Padding inside a card, and the horizontal inset its list rows must match. */
export const CARD_PADDING = "p-6 lg:p-8";
export const ROW_PADDING = "px-6 py-4 lg:px-8";
