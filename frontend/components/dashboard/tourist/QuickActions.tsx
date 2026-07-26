import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  MapPinned,
  PlaneTakeoff,
  Search,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { SectionCard } from "./SectionCard";
import { CARD_PADDING } from "./ui";

interface Action {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const ACTIONS: Action[] = [
  {
    label: "Find Guide",
    description: "Browse certified local guides",
    href: "/guide-availability",
    icon: Search,
  },
  {
    label: "Plan New Trip",
    description: "Explore our tour packages",
    href: "/services",
    icon: PlaneTakeoff,
  },
  {
    label: "View Trips",
    description: "Track your journeys",
    href: "/dashboard/user/trips",
    icon: MapPinned,
  },
  {
    label: "Bookings",
    description: "Manage your bookings",
    href: "/dashboard/user/my-bookings",
    icon: BookOpen,
  },
  {
    label: "Reviews",
    description: "Rate your guides",
    href: "/dashboard/user/reviews",
    icon: Star,
  },
  {
    label: "Notifications",
    description: "See all your updates",
    href: "/dashboard/notifications",
    icon: Bell,
  },
];

/**
 * The guide dashboard's quick-action tile (app/(website)/dashboard/guide/
 * page.tsx), teal instead of green: 40px ringed icon badge, two-line label,
 * trailing arrow that colours in on hover, and the same lift.
 *
 * The six tiles previously carried six different accent colours, which made a
 * row of equal-weight shortcuts read as six unrelated things. One neutral
 * resting state, one accent on hover — as the guide panel does it.
 */
export function QuickActions() {
  return (
    <SectionCard
      icon={Zap}
      title="Quick Actions"
      description="Jump straight to what you need"
      contentClassName={CARD_PADDING}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ACTIONS.map(({ label, description, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            aria-label={`${label} — ${description}`}
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200 transition group-hover:bg-teal-50 group-hover:text-teal-600 group-hover:ring-teal-200"
            >
              <Icon className="h-5 w-5" />
            </span>
            <span aria-hidden="true" className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900">
                {label}
              </span>
              <span className="block truncate text-xs text-slate-400">
                {description}
              </span>
            </span>
            <ArrowUpRight
              aria-hidden="true"
              className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-teal-600"
            />
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}
