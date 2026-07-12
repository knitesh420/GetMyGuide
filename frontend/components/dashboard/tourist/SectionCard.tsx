import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
 * Each section titles itself with an <h2>; the page owns the single <h1>.
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
    <Card
      className={cn(
        "gap-0 overflow-hidden rounded-2xl border-border/60 py-0 shadow-sm transition-shadow duration-300 hover:shadow-md",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b bg-muted/30 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600"
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold leading-tight">
              {title}
            </h2>
            {description && (
              <p className="truncate text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {action}
          {viewAll && (
            <Link
              href={viewAll.href}
              className="group inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              <span className="hidden sm:inline">{viewAll.label}</span>
              <span className="sm:hidden">All</span>
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn("p-0", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
