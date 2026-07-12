import Link from "next/link";
import {
  BellDot,
  CalendarCheck,
  CircleCheckBig,
  CreditCard,
  Star,
  Ticket,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { TouristDashboardStats } from "@/lib/data";
import { formatCurrency } from "./format";
import { cn } from "@/lib/utils";

/**
 * Tailwind can't see class names built at runtime, so each accent is spelled out
 * as a literal here rather than interpolated from a colour name.
 */
const ACCENTS = {
  teal: { icon: "bg-teal-500/10 text-teal-600", glow: "group-hover:shadow-teal-500/10" },
  emerald: { icon: "bg-emerald-500/10 text-emerald-600", glow: "group-hover:shadow-emerald-500/10" },
  sky: { icon: "bg-sky-500/10 text-sky-600", glow: "group-hover:shadow-sky-500/10" },
  amber: { icon: "bg-amber-500/10 text-amber-600", glow: "group-hover:shadow-amber-500/10" },
  violet: { icon: "bg-violet-500/10 text-violet-600", glow: "group-hover:shadow-violet-500/10" },
  rose: { icon: "bg-rose-500/10 text-rose-600", glow: "group-hover:shadow-rose-500/10" },
  slate: { icon: "bg-slate-500/10 text-slate-600", glow: "group-hover:shadow-slate-500/10" },
} as const;

type Accent = keyof typeof ACCENTS;

interface StatDef {
  key: keyof TouristDashboardStats;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: Accent;
  href: string;
  /** Render as money rather than a plain count. */
  money?: boolean;
}

const STATS: StatDef[] = [
  {
    key: "upcomingTrips",
    label: "Upcoming Trips",
    description: "Planned and ready to go",
    icon: CalendarCheck,
    accent: "teal",
    href: "/dashboard/user/trips",
  },
  {
    key: "completedTrips",
    label: "Completed Trips",
    description: "Journeys you've finished",
    icon: CircleCheckBig,
    accent: "emerald",
    href: "/dashboard/user/trips",
  },
  {
    key: "activeBookings",
    label: "Active Bookings",
    description: "Paid and in progress",
    icon: Ticket,
    accent: "sky",
    href: "/dashboard/user/my-bookings",
  },
  {
    key: "pendingPayments",
    label: "Pending Payments",
    description: "Bookings awaiting payment",
    icon: CreditCard,
    accent: "amber",
    href: "/dashboard/user/my-bookings",
  },
  {
    key: "unreadNotifications",
    label: "Unread Alerts",
    description: "Updates you haven't seen",
    icon: BellDot,
    accent: "violet",
    href: "/dashboard/notifications",
  },
  {
    key: "pendingReviews",
    label: "Pending Reviews",
    description: "Trips waiting on your rating",
    icon: Star,
    accent: "rose",
    href: "/dashboard/user/reviews",
  },
  {
    key: "totalSpent",
    label: "Total Spent",
    description: "Across all paid invoices",
    icon: Wallet,
    accent: "slate",
    href: "/dashboard/user/my-bookings",
    money: true,
  },
];

function StatCard({ stat, value }: { stat: StatDef; value: number }) {
  const accent = ACCENTS[stat.accent];
  const Icon = stat.icon;
  const display = stat.money ? formatCurrency(value) : value.toLocaleString("en-IN");

  return (
    <Link
      href={stat.href}
      // The whole tile is the control, so it gets one accessible name covering
      // the number and what it counts — the visual label/description below are
      // hidden from the reader to avoid announcing everything twice.
      aria-label={`${stat.label}: ${display}. ${stat.description}`}
      className={cn(
        "group relative flex flex-col justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm",
        "transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-500/40 hover:shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
        accent.glow,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
            accent.icon,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <div aria-hidden="true" className="space-y-0.5">
        <p
          className={cn(
            "font-bold tracking-tight text-foreground",
            // Money runs long ("₹1,20,000") — step it down so it never wraps.
            stat.money ? "text-xl sm:text-2xl" : "text-3xl",
          )}
        >
          {display}
        </p>
        <p className="text-sm font-medium leading-tight text-foreground/80">
          {stat.label}
        </p>
        <p className="text-xs leading-tight text-muted-foreground">
          {stat.description}
        </p>
      </div>
    </Link>
  );
}

export function StatsGrid({ stats }: { stats: TouristDashboardStats }) {
  return (
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">
        Your travel statistics
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-7">
        {STATS.map((stat) => (
          <StatCard key={stat.key} stat={stat} value={stats[stat.key]} />
        ))}
      </div>
    </section>
  );
}
