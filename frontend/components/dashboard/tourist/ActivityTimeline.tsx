import Link from "next/link";
import {
  Activity,
  CreditCard,
  Star,
  Ticket,
  UserCheck,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import type { TouristActivityEntry, TouristActivityType } from "@/lib/data";
import { SectionCard } from "./SectionCard";
import { EmptyState } from "./EmptyState";
import { formatRelative } from "./format";
import { cn } from "@/lib/utils";

const ENTRY_STYLE: Record<
  TouristActivityType,
  { icon: LucideIcon; className: string }
> = {
  "booking-created": { icon: Ticket, className: "bg-sky-500/10 text-sky-600" },
  "payment-successful": {
    icon: CreditCard,
    className: "bg-emerald-500/10 text-emerald-600",
  },
  "guide-assigned": {
    icon: UserCheck,
    className: "bg-violet-500/10 text-violet-600",
  },
  "trip-updated": { icon: Waypoints, className: "bg-teal-500/10 text-teal-600" },
  "review-submitted": { icon: Star, className: "bg-amber-500/10 text-amber-600" },
};

function ActivityRow({
  entry,
  isLast,
}: {
  entry: TouristActivityEntry;
  isLast: boolean;
}) {
  const style = ENTRY_STYLE[entry.type];
  const Icon = style.icon;

  const body = (
    <>
      <p className="text-sm font-medium leading-tight text-foreground">
        {entry.title}
      </p>
      <p className="text-sm leading-tight text-muted-foreground">
        {entry.description}
      </p>
      <time
        dateTime={entry.at}
        className="text-xs text-muted-foreground/80"
      >
        {formatRelative(entry.at)}
      </time>
    </>
  );

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {/* The rail joins one event to the next, so it must not hang off the last
          item — hence it's drawn per-row rather than once behind the list. */}
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute left-[15px] top-9 h-[calc(100%-1.5rem)] w-px bg-border"
        />
      )}

      <span
        aria-hidden="true"
        className={cn(
          "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
          style.className,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1 space-y-0.5">
        {entry.href ? (
          <Link
            href={entry.href}
            className="block rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            {body}
          </Link>
        ) : (
          body
        )}
      </div>
    </li>
  );
}

export function ActivityTimeline({
  activity,
}: {
  activity: TouristActivityEntry[];
}) {
  return (
    <SectionCard
      icon={Activity}
      title="Recent Activity"
      description="Newest first"
      contentClassName={activity.length ? "p-5" : "p-0"}
    >
      {activity.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nothing has happened yet"
          description="Your bookings, payments, guide assignments and reviews will appear here as they happen."
        />
      ) : (
        <ol className="relative">
          {activity.map((entry, index) => (
            <ActivityRow
              key={entry.id}
              entry={entry}
              isLast={index === activity.length - 1}
            />
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
