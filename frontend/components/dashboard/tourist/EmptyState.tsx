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
        "flex flex-col items-center justify-center gap-4 px-6 py-12 text-center lg:py-16",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 ring-1 ring-inset ring-teal-500/20"
      >
        <Icon className="h-8 w-8 text-teal-600" />
      </div>

      <div className="space-y-1.5">
        <p className="text-lg font-semibold text-gray-900">{title}</p>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-gray-500">
          {description}
        </p>
      </div>

      {action && (
        <Button asChild className="mt-2 h-10 rounded-lg px-5">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
