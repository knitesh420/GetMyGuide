import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD } from "./ui";

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Renders the "View all" affordance in the header. */
  viewAll?: { label: string; href: string };
  /** Slot for header controls (e.g. "Mark all read"). */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * The frame every Dashboard Home section sits in — one place that owns the card
 * chrome, heading level and "View all" link, so the sections stay visually and
 * structurally consistent as they're added to.
 *
 * This is `GuidePanel` plus the panel header the guide dashboard puts on its
 * "Recent bookings" card: same hairline rule, same px-5 py-4 band, same
 * text-sm/text-xs pairing, same trailing arrow on the link — in teal. It renders
 * a plain <div> rather than the shared <Card> primitive for the same reason the
 * guide panel does: that primitive ships a 2xl radius, an emerald hover ring and
 * a translate-on-hover that a static content card has to spend three classes
 * undoing.
 *
 * Each section titles itself with an <h2>; the page owns the single <h1>.
 *
 * The card must height itself to its content — no `h-full`. These stack inside a
 * `space-y` column <div> which is itself a stretched grid item, so its height is
 * definite; a `height: 100%` here would resolve against the *whole column* and
 * blow every card up to the column's full height.
 */
export function SectionCard({
  icon: Icon,
  title,
  description,
  viewAll,
  action,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <div className={cn(CARD, "overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-900">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {action}
          {viewAll && (
            <Link
              href={viewAll.href}
              className="inline-flex items-center gap-1 rounded-md text-xs font-semibold text-teal-600 transition-colors hover:text-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <span className="hidden sm:inline">{viewAll.label}</span>
              <span className="sm:hidden">All</span>
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      <div className={cn(contentClassName)}>{children}</div>
    </div>
  );
}
