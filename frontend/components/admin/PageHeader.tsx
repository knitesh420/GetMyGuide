"use client";

import { ReactNode } from "react";

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
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border bg-white px-6 py-16 text-center">
      {Icon && <Icon className="mx-auto mb-3 h-10 w-10 text-slate-300" />}
      <p className="font-medium text-slate-700">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      )}
    </div>
  );
}
