import Link from "next/link";
import {
  BadgeInfo,
  BookOpen,
  CalendarDays,
  CircleCheckBig,
  MapPinned,
  Search,
  Star,
  UserRoundCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { TouristDashboardProfile } from "@/lib/data";
import { initialsOf } from "./format";

const QUICK_ACTIONS = [
  { label: "Find Guide", href: "/guide-availability", icon: Search },
  { label: "My Trips", href: "/dashboard/user/trips", icon: MapPinned },
  { label: "My Bookings", href: "/dashboard/user/my-bookings", icon: BookOpen },
  { label: "Reviews", href: "/dashboard/user/reviews", icon: Star },
];

/** Translucent chip for the facts sitting under the tourist's name. */
function HeroPill({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/20 backdrop-blur">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {children}
    </span>
  );
}

/**
 * Top band of Dashboard Home: who the tourist is, their business code, the date,
 * how complete their profile is, and the four actions they take most.
 *
 * It is an ordinary block in the page flow — deliberately not sticky. It used to
 * pin below the shell header, which cost a fixed ~180px of a phone screen for
 * the whole scroll, sat translucent over the content passing beneath it, and put
 * a z-20 backdrop-blurred layer between the page and the shell's own controls.
 * Nothing here needs to stay on screen: the shell header above it already keeps
 * the menu and logout reachable at all times.
 *
 * Structurally this is the guide dashboard's hero (app/(website)/dashboard/
 * guide/page.tsx) — same gradient card, avatar, "Welcome back" eyebrow, name
 * <h1> and pill row — in teal rather than green, so the two dashboards open the
 * same way. Splitting the greeting off the name also fixes the mobile
 * truncation: "Welcome back, Ch…" was one string competing for one line.
 */
export function DashboardHeader({
  profile,
}: {
  profile: TouristDashboardProfile;
}) {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const completion = profile.profileCompletion;
  const isComplete = completion >= 100;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-teal-600 via-teal-600 to-cyan-500 px-6 py-7 text-white shadow-sm sm:px-8">
      {/* Soft light sources; purely decorative, so hidden from assistive tech. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl font-bold ring-1 ring-inset ring-white/25 backdrop-blur">
            {initialsOf(profile.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white/70">Welcome back</p>
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
              {profile.name || "Traveler"}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <HeroPill icon={BadgeInfo}>
                <span className="font-mono">
                  Tourist ID: {profile.touristCode ?? "—"}
                </span>
              </HeroPill>
              <HeroPill icon={CalendarDays}>{today}</HeroPill>
            </div>
          </div>
        </div>

        {/* Nudge toward a fuller profile — but once it's done, say so rather than
            showing a full bar with no point to it. */}
        <div className="w-full shrink-0 rounded-xl bg-white/10 p-4 ring-1 ring-inset ring-white/15 lg:w-72">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium tracking-wide text-white/70 uppercase">
              Profile completion
            </span>
            <span className="text-sm font-bold tabular-nums">
              {completion}%
            </span>
          </div>

          {/* The indicator is `bg-primary` — teal on a teal card. Forced white so
              the filled portion actually reads against the gradient. */}
          <Progress
            value={completion}
            aria-label={`Profile ${completion} percent complete`}
            className="mt-3 h-2 bg-white/20 **:data-[slot=progress-indicator]:bg-white"
          />

          {isComplete ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-white/80">
              <CircleCheckBig aria-hidden="true" className="h-3.5 w-3.5" />
              Your profile is complete
            </p>
          ) : (
            <Button
              asChild
              size="sm"
              className="mt-3 h-9 w-full bg-white font-medium text-teal-700 shadow-sm hover:bg-white/90"
            >
              <Link href="/tourist/onboarding?edit=1">
                <UserRoundCog aria-hidden="true" className="mr-1.5 h-4 w-4" />
                Complete your profile
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Equal-width, equal-height targets: two-up on a phone, four-up from sm.
          h-11 (44px) is the practical touch minimum. */}
      <nav
        aria-label="Quick actions"
        className="relative mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-6 sm:grid-cols-4"
      >
        {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
          <Button
            key={label}
            asChild
            variant="outline"
            className="h-11 w-full justify-center border-white/25 bg-white/15 font-medium text-white backdrop-blur transition-colors hover:bg-white/25 hover:text-white"
          >
            <Link href={href}>
              <Icon aria-hidden="true" className="mr-1.5 h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          </Button>
        ))}
      </nav>
    </section>
  );
}
