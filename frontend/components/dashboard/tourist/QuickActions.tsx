import Link from "next/link";
import {
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
import { cn } from "@/lib/utils";

interface Action {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** Spelled out in full — Tailwind can't resolve classes built at runtime. */
  accent: string;
}

const ACTIONS: Action[] = [
  {
    label: "Find Guide",
    description: "Browse certified local guides",
    href: "/guide-availability",
    icon: Search,
    accent:
      "bg-teal-500/10 text-teal-600 group-hover:bg-teal-500 group-hover:text-white",
  },
  {
    label: "Plan New Trip",
    description: "Explore our tour packages",
    href: "/services",
    icon: PlaneTakeoff,
    accent:
      "bg-sky-500/10 text-sky-600 group-hover:bg-sky-500 group-hover:text-white",
  },
  {
    label: "View Trips",
    description: "Track your journeys",
    href: "/dashboard/user/trips",
    icon: MapPinned,
    accent:
      "bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white",
  },
  {
    label: "Bookings",
    description: "Manage your bookings",
    href: "/dashboard/user/my-bookings",
    icon: BookOpen,
    accent:
      "bg-violet-500/10 text-violet-600 group-hover:bg-violet-500 group-hover:text-white",
  },
  {
    label: "Reviews",
    description: "Rate your guides",
    href: "/dashboard/user/reviews",
    icon: Star,
    accent:
      "bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white",
  },
  {
    label: "Notifications",
    description: "See all your updates",
    href: "/dashboard/notifications",
    icon: Bell,
    accent:
      "bg-rose-500/10 text-rose-600 group-hover:bg-rose-500 group-hover:text-white",
  },
];

export function QuickActions() {
  return (
    <SectionCard
      icon={Zap}
      title="Quick Actions"
      description="Jump straight to what you need"
      contentClassName={CARD_PADDING}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {ACTIONS.map(({ label, description, href, icon: Icon, accent }) => (
          <Link
            key={label}
            href={href}
            aria-label={`${label} — ${description}`}
            className="group flex h-full flex-col gap-3 rounded-xl border border-gray-200 p-4 transition-all duration-200 hover:border-teal-500/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200",
                accent,
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span aria-hidden="true" className="space-y-0.5">
              <span className="block text-sm font-semibold leading-tight text-gray-900">
                {label}
              </span>
              <span className="block text-xs leading-relaxed text-gray-500">
                {description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}
