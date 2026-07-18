import Link from "next/link";
import { BookOpen, MapPinned, Search, Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { TouristDashboardProfile } from "@/lib/data";
import { initialsOf } from "./format";
import { PAGE_TITLE } from "./ui";

const QUICK_ACTIONS = [
  { label: "Find Guide", href: "/guide-availability", icon: Search },
  { label: "My Trips", href: "/dashboard/user/trips", icon: MapPinned },
  { label: "My Bookings", href: "/dashboard/user/my-bookings", icon: BookOpen },
  { label: "Reviews", href: "/dashboard/user/reviews", icon: Star },
];

/**
 * Sticky top bar of Dashboard Home: who the tourist is, their business code, the
 * date, how complete their profile is, and the four actions they take most.
 *
 * It sticks to the top of the scrolling <main>. The layout's own header sits at
 * z-30, so this stays below it (z-20) and slides underneath rather than over it.
 *
 * The negative margins cancel the <main> gutter (p-4 md:p-6 lg:p-8) so the blur
 * band and its bottom rule run edge to edge; they must track that gutter exactly
 * or the band will sit inset from the content it covers.
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
    <header className="sticky top-0 z-20 -mx-4 border-b border-gray-200 bg-white/85 px-4 py-5 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 shrink-0 ring-2 ring-teal-500/30 ring-offset-2 ring-offset-white">
            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-500 text-lg font-bold text-white">
              {initialsOf(profile.name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-1">
            <h1 className={`truncate ${PAGE_TITLE}`}>
              Welcome back, {profile.name.split(" ")[0] || "Traveler"}
            </h1>
            <p className="text-sm text-gray-500">{today}</p>
            <p className="text-sm text-gray-500">
              Tourist ID:{" "}
              <span className="font-mono font-medium text-gray-900">
                {profile.touristCode ?? "—"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          {/* Nudge toward a fuller profile — but once it's done, say so rather
              than showing a full bar with no point to it. */}
          <div className="w-full min-w-0 sm:w-56">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-gray-500">
                Profile completion
              </span>
              <span className="text-sm font-semibold tabular-nums text-gray-900">
                {completion}%
              </span>
            </div>
            <Progress
              value={completion}
              aria-label={`Profile ${completion} percent complete`}
              className="h-2"
            />
            {!isComplete && (
              <Link
                href="/tourist/onboarding?edit=1"
                className="mt-2 inline-block rounded text-xs font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                Complete your profile
              </Link>
            )}
          </div>

          <nav aria-label="Quick actions" className="flex flex-wrap gap-3">
            {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
              <Button
                key={label}
                asChild
                variant="outline"
                className="h-9 rounded-lg border-gray-200 px-3 text-gray-700 transition-colors hover:bg-teal-500/10 hover:text-teal-700"
              >
                <Link href={href}>
                  <Icon aria-hidden="true" className="mr-1.5 h-4 w-4" />
                  {label}
                </Link>
              </Button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
