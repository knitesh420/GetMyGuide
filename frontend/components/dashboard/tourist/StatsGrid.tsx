"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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
import CountUp from "@/components/animations/CountUp";
import { EASE_OUT } from "@/lib/motion";

/**
 * Icon tile fill, foreground and hairline ring, per tone — the same five-value
 * shape as `GuideStatCard`'s STAT_TONES, extended with the two extra tones the
 * tourist stats need. Tailwind can't see class names built at runtime, so each
 * is spelled out as a literal rather than interpolated from a colour name.
 */
const STAT_TONES = {
  teal: "bg-teal-50 text-teal-600 ring-teal-200",
  green: "bg-green-50 text-green-600 ring-green-200",
  blue: "bg-blue-50 text-blue-600 ring-blue-200",
  amber: "bg-amber-50 text-amber-600 ring-amber-200",
  violet: "bg-violet-50 text-violet-600 ring-violet-200",
  rose: "bg-rose-50 text-rose-600 ring-rose-200",
  slate: "bg-slate-50 text-slate-500 ring-slate-200",
} as const;

type StatTone = keyof typeof STAT_TONES;

interface StatDef {
  key: keyof TouristDashboardStats;
  label: string;
  hint: string;
  icon: LucideIcon;
  tone: StatTone;
  href: string;
  /** Render as money rather than a plain count. */
  money?: boolean;
}

const STATS: StatDef[] = [
  {
    key: "upcomingTrips",
    label: "Upcoming Trips",
    hint: "Planned and ready to go",
    icon: CalendarCheck,
    tone: "teal",
    href: "/dashboard/user/trips",
  },
  {
    key: "completedTrips",
    label: "Completed Trips",
    hint: "Journeys you've finished",
    icon: CircleCheckBig,
    tone: "green",
    href: "/dashboard/user/trips",
  },
  {
    key: "activeBookings",
    label: "Active Bookings",
    hint: "Paid and in progress",
    icon: Ticket,
    tone: "blue",
    href: "/dashboard/user/my-bookings",
  },
  {
    key: "pendingPayments",
    label: "Pending Payments",
    hint: "Bookings awaiting payment",
    icon: CreditCard,
    tone: "amber",
    href: "/dashboard/user/my-bookings",
  },
  {
    key: "unreadNotifications",
    label: "Unread Alerts",
    hint: "Updates you haven't seen",
    icon: BellDot,
    tone: "violet",
    href: "/dashboard/notifications",
  },
  {
    key: "pendingReviews",
    label: "Pending Reviews",
    hint: "Trips waiting on your rating",
    icon: Star,
    tone: "rose",
    href: "/dashboard/user/reviews",
  },
  {
    key: "totalSpent",
    label: "Total Spent",
    hint: "Across all paid invoices",
    icon: Wallet,
    tone: "slate",
    href: "/dashboard/user/my-bookings",
    money: true,
  },
];

/**
 * One KPI tile. Mirrors `GuideStatCard` exactly — same rounded-xl panel, p-5
 * inset, label-over-value-over-hint stack, 40px ringed icon tile top-right, and
 * the same entrance stagger and hover lift — with the whole tile wrapped as a
 * link, which the guide's version has no need for.
 *
 * `h-full` on the motion wrapper is what equalises the row: without it a tile
 * whose hint wraps to two lines is taller than its neighbours.
 */
function StatCard({
  stat,
  value,
  index,
}: {
  stat: StatDef;
  value: number;
  index: number;
}) {
  const Icon = stat.icon;
  const display = stat.money
    ? formatCurrency(value)
    : value.toLocaleString("en-IN");

  return (
    <motion.div
      className={cn(
        "h-full",
        // The money tile takes the spare column so the grid squares off — 6
        // tiles + 1 double = 8 cells, two clean rows of four — instead of
        // leaving an orphan gap at the end. Never at base width, where the grid
        // is a single column and a 2-column span would force an implicit second
        // one and scroll the page sideways.
        stat.money && "sm:col-span-2 xl:col-span-2",
      )}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: Math.min(index * 0.08, 0.4),
        ease: EASE_OUT,
      }}
      whileHover={{ y: -4 }}
    >
      <Link
        href={stat.href}
        // The whole tile is the control, so it gets one accessible name covering
        // the number and what it counts — the visual label/hint below are hidden
        // from the reader to avoid announcing everything twice.
        aria-label={`${stat.label}: ${display}. ${stat.hint}`}
        className={cn(
          "flex h-full items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm",
          "transition-shadow duration-200 hover:shadow-md",
          "focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:outline-none",
        )}
      >
        <div aria-hidden="true" className="min-w-0">
          <p className="text-xs font-medium text-slate-400">{stat.label}</p>
          {/* Already hidden from assistive tech (the Link carries the full
              label), so counting up here never spams a screen reader. */}
          <p className="mt-2 truncate text-2xl leading-none font-bold tracking-tight text-slate-900">
            {stat.money ? (
              <CountUp to={value} format={formatCurrency} />
            ) : (
              <CountUp to={value} locale="en-IN" />
            )}
          </p>
          <p className="mt-2 text-xs text-slate-400">{stat.hint}</p>
        </div>

        <span
          aria-hidden="true"
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
            STAT_TONES[stat.tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </Link>
    </motion.div>
  );
}

export function StatsGrid({ stats }: { stats: TouristDashboardStats }) {
  return (
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">
        Your travel statistics
      </h2>
      {/* One column on a phone, two on a tablet, four from xl — the guide
          dashboard's stat row, breakpoint for breakpoint. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat, index) => (
          <StatCard
            key={stat.key}
            stat={stat}
            value={stats[stat.key]}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
