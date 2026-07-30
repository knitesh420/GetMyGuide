"use client";

import React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Layout primitives for the guide dashboard.
 *
 * Every page in /dashboard/guide is built from the same three bands: a title
 * row with an optional call to action, a toolbar carrying search and inline
 * stats, and one or more white panels holding the content.
 */

export function GuidePageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** White, hairline-bordered surface that content sits on. */
export function GuidePanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The band directly under a panel's top edge: search at the left, stats pushed
 * to the right. Both sides are optional so pages that only need one still line
 * up on the same baseline.
 */
export function GuideToolbar({
  children,
  stats,
  className,
}: {
  children?: React.ReactNode;
  stats?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      <div className="w-full lg:max-w-xs">{children}</div>
      {stats && (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          {stats}
        </div>
      )}
    </div>
  );
}

/** Minimal underlined search field, magnifier trailing, as in the reference. */
export function GuideSearchInput({
  value,
  onChange,
  placeholder = "Search",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative border-b border-slate-200", className)}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent py-2 pr-8 text-sm text-slate-700 outline-none placeholder:text-slate-400"
      />
      <Search className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

/** Titled band inside a panel, ruled off from the band above it. */
export function GuideSection({
  title,
  icon: Icon,
  description,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 px-6 py-5 last:border-b-0">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {Icon && <Icon className="h-4 w-4 text-slate-400" />}
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/** Label-over-value pair, the unit every detail section is built from. */
export function GuideField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <div className="text-sm font-semibold text-slate-900">{children}</div>
    </div>
  );
}

/** Renders a boolean add-on as a plain yes/no rather than a raw `true`. */
export function GuideYesNo({ value }: { value?: boolean }) {
  return (
    <span className={value ? "text-green-600" : "text-slate-400"}>
      {value ? "Yes" : "No"}
    </span>
  );
}

export function GuideEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-900">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
