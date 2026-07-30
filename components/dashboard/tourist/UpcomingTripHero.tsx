import Link from "next/link";
import {
  CalendarDays,
  Compass,
  MapPin,
  MessageCircle,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { TripStatusBadge } from "@/components/trip/TripStatusBadge";
import type { TouristUpcomingTrip } from "@/lib/data";
import { EmptyState } from "./EmptyState";
import { formatCountdown, formatDate, initialsOf } from "./format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CARD } from "./ui";

function GuidePanel({
  guide,
}: {
  guide: NonNullable<TouristUpcomingTrip["guide"]>;
}) {
  // A guide with no reviews yet has rating 0 — show "New guide" rather than a
  // zero-star rating, which reads as a bad guide instead of an unrated one.
  const isRated = guide.ratingCount > 0;

  return (
    <div className="flex items-center gap-4 rounded-xl bg-white/10 p-4 ring-1 ring-inset ring-white/15">
      <Avatar className="h-12 w-12 shrink-0 ring-2 ring-white/30">
        <AvatarFallback className="bg-white/20 font-semibold text-white">
          {initialsOf(guide.name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">
          Your guide
        </p>
        <p className="truncate text-base font-semibold text-white">
          {guide.name}
        </p>
        {isRated ? (
          <p className="flex items-center gap-1.5 text-sm text-white/85">
            <Star
              aria-hidden="true"
              className="h-4 w-4 fill-amber-400 text-amber-400"
            />
            <span className="font-medium">{guide.rating.toFixed(1)}</span>
            <span className="text-white/70">
              ({guide.ratingCount}{" "}
              {guide.ratingCount === 1 ? "review" : "reviews"})
            </span>
          </p>
        ) : (
          <p className="text-sm text-white/70">New guide — not yet rated</p>
        )}
      </div>
    </div>
  );
}

export function UpcomingTripHero({ trip }: { trip: TouristUpcomingTrip | null }) {
  if (!trip) {
    return (
      <div className={`${CARD} border-dashed border-slate-300`}>
        <EmptyState
          icon={Compass}
          title="No upcoming trips"
          description="You have no trips coming up. Find a certified local guide and plan your next journey."
          action={{ label: "Find a Guide", href: "/guide-availability" }}
        />
      </div>
    );
  }

  const countdown = formatCountdown(trip.travelDate);

  return (
    <section className="relative overflow-hidden rounded-xl bg-linear-to-br from-teal-600 via-teal-700 to-cyan-800 text-white shadow-sm transition-shadow duration-200 hover:shadow-md">
      {/* Decorative depth — kept behind the content and out of the a11y tree. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl"
      />

      <div className="relative grid gap-6 p-5 lg:grid-cols-[1.5fr_1fr] lg:p-6">
        <div className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-0 bg-white/20 text-xs font-medium text-white hover:bg-white/25">
              Next trip
            </Badge>
            <TripStatusBadge status={trip.status} />
            {trip.bookingCode && (
              <span className="font-mono text-xs text-white/80">
                {trip.bookingCode}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">
              {trip.destination}
            </h2>
            {trip.places.length > 0 && (
              <p className="flex items-start gap-2 text-sm leading-relaxed text-white/80">
                <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="line-clamp-2">{trip.places.join(" · ")}</span>
              </p>
            )}
          </div>

          <dl className="flex flex-wrap gap-x-8 gap-y-4">
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-white/70">
                Travel date
              </dt>
              <dd className="flex items-center gap-1.5 text-base font-semibold">
                <CalendarDays aria-hidden="true" className="h-4 w-4" />
                {formatDate(trip.travelDate)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-white/70">
                Departs
              </dt>
              <dd className="text-base font-semibold capitalize">{countdown}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-white/70">
                Travellers
              </dt>
              <dd className="flex items-center gap-1.5 text-base font-semibold">
                <Users aria-hidden="true" className="h-4 w-4" />
                {trip.travelers}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col justify-between gap-6">
          {trip.guide ? (
            <GuidePanel guide={trip.guide} />
          ) : (
            <div className="space-y-1 rounded-xl bg-white/10 p-4 ring-1 ring-inset ring-white/15">
              <p className="text-base font-semibold text-white">
                Guide being assigned
              </p>
              <p className="text-sm leading-relaxed text-white/80">
                We&apos;re matching you with a certified local guide. You&apos;ll
                be notified as soon as one accepts.
              </p>
            </div>
          )}

          {/* A grid, not a wrapping flex row: `flex-1` let two buttons share a
              320px phone and crush their labels. One per row until there's
              width for two, and every button the same size at every width. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              asChild
              className="h-11 w-full rounded-lg bg-white font-medium text-teal-800 shadow-sm hover:bg-white/90"
            >
              <Link href={`/dashboard/user/my-bookings/${trip.bookingId}`}>
                <Ticket aria-hidden="true" className="mr-1.5 h-4 w-4" />
                View Booking
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 w-full rounded-lg border-white/40 bg-transparent font-medium text-white hover:bg-white/15 hover:text-white"
            >
              <Link href="/dashboard/user/trips">
                <Compass aria-hidden="true" className="mr-1.5 h-4 w-4" />
                View Trip
              </Link>
            </Button>
            {/* Only offer "contact" once there's actually someone to contact. */}
            {trip.guide?.phone && (
              <Button
                asChild
                variant="outline"
                className="h-11 w-full rounded-lg border-white/40 bg-transparent font-medium text-white hover:bg-white/15 hover:text-white sm:col-span-2"
              >
                <a href={`tel:${trip.guide.phone}`}>
                  <MessageCircle aria-hidden="true" className="mr-1.5 h-4 w-4" />
                  Contact {trip.guide.name.split(" ")[0]}
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
