"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * The standard chrome every admin page opens with: a title, a one-line
 * explanation of what the page is for, and an optional slot for the page's
 * primary action. Pages used to each roll their own header, which is how the
 * panel ended up with three different heading sizes and two different
 * paddings — keep new pages on this.
 */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

/**
 * The empty state that pages fall back to when a fetch returns nothing. A
 * shared one so "no results" never reads as "the page is broken".
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  bare = false,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  /** Optional call to action rendered below the copy. */
  action?: { label: string; href: string } | ReactNode;
  /** Drop the card chrome when the state already sits inside an `AdminPanel`. */
  bare?: boolean;
}) {
  return (
    <div
      className={
        bare
          ? "px-6 py-16 text-center"
          : "rounded-xl border border-slate-200 bg-white px-6 py-16 text-center"
      }
    >
      {Icon && (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 ring-1 ring-inset ring-teal-500/20">
          <Icon className="h-7 w-7 text-teal-600" />
        </div>
      )}
      <p className="font-semibold text-slate-800">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          {description}
        </p>
      )}
      {action &&
        (isLinkAction(action) ? (
          <Button asChild className="mt-5 h-10 rounded-lg px-5">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <div className="mt-5 flex justify-center">{action}</div>
        ))}
    </div>
  );
}

function isLinkAction(
  action: { label: string; href: string } | ReactNode,
): action is { label: string; href: string } {
  return (
    typeof action === "object" &&
    action !== null &&
    "href" in action &&
    "label" in action
  );
}
