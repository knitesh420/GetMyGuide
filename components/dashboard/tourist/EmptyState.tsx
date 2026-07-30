import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
  className?: string;
}

/**
 * The one empty state every dashboard section uses, so "no trips yet" and "no
 * notifications yet" look like the same product rather than two.
 *
 * Geometry is `GuideEmptyState`'s, class for class — 48px round icon tile, 24px
 * glyph, the same mt-4 / mt-1 / mt-5 rhythm and the same px-6 py-16 well — with
 * the tile tinted teal instead of slate so the tourist accent survives the
 * alignment.
 *
 * The icon is decorative — the title beside it already carries the meaning, so
 * it's hidden from screen readers instead of being announced twice.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 ring-1 ring-inset ring-teal-100"
      >
        <Icon className="h-6 w-6 text-teal-600" />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>

      {action && (
        <Button asChild className="mt-5 h-9 rounded-lg px-4">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
