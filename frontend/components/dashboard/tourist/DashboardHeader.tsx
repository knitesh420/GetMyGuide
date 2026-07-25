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
 * It pins to the top of the scrolling <main> and stays there for the whole page.
 * `top-18` is the height of the dashboard layout's own sticky header (h-18 /
 * 72px) and must track it: at `top-0` this bar parked in the same 72px the
 * header occupies and — being z-20 to the header's z-30 — simply slid underneath
 * and vanished on scroll. Parked below it instead, the two stack cleanly and
 * z-20 only has to beat the page content, which it does.
 *
 * The negative margins cancel the <main> gutter (p-4 md:p-6 lg:p-8) so the band
 * and its bottom rule run edge to edge and sit flush against the layout header;
 * they must track that gutter exactly on all three axes or the band floats inset
 * from the content it covers, with a strip of page background above it.
 *
 * Cancelling the top gutter has a second effect worth keeping: the band's resting
 * position becomes 72px — exactly where `top-18` pins it — so it does not shift
 * by even a pixel when sticky engages.
 *
 * The teal tint is the tourist palette's own accent (see the avatar gradient
 * below). It stays translucent because page content scrolls underneath: the
 * `backdrop-blur-md` is what keeps that content from reading through as text.
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
    <header className="sticky top-18 z-20 -mx-4 -mt-4 border-b border-teal-100 bg-teal-50/85 px-4 py-5 backdrop-blur-md supports-[backdrop-filter]:bg-teal-50/70 md:-mx-6 md:-mt-6 md:px-6 lg:-mx-8 lg:-mt-8 lg:px-8">
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
