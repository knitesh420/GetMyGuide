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
import { Card } from "@/components/ui/card";
import { TripStatusBadge } from "@/components/trip/TripStatusBadge";
import type { TouristUpcomingTrip } from "@/lib/data";
import { EmptyState } from "./EmptyState";
import { formatCountdown, formatDate, initialsOf } from "./format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function GuidePanel({ guide }: { guide: NonNullable<TouristUpcomingTrip["guide"]> }) {
  // A guide with no reviews yet has rating 0 — show "New guide" rather than a
  // zero-star rating, which reads as a bad guide instead of an unrated one.
  const isRated = guide.ratingCount > 0;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3 ring-1 ring-inset ring-white/15">
      <Avatar className="h-11 w-11 shrink-0 ring-2 ring-white/30">
        <AvatarFallback className="bg-white/20 font-semibold text-white">
          {initialsOf(guide.name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-white/60">
          Your guide
        </p>
        <p className="truncate font-semibold text-white">{guide.name}</p>
        {isRated ? (
          <p className="flex items-center gap-1 text-sm text-white/80">
            <Star
              aria-hidden="true"
              className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
            />
            <span className="font-medium">{guide.rating.toFixed(1)}</span>
            <span className="text-white/60">
              ({guide.ratingCount} {guide.ratingCount === 1 ? "review" : "reviews"})
            </span>
          </p>
        ) : (
          <p className="text-sm text-white/60">New guide — not yet rated</p>
        )}
      </div>
    </div>
  );
}

export function UpcomingTripHero({ trip }: { trip: TouristUpcomingTrip | null }) {
  if (!trip) {
    return (
      <Card className="rounded-2xl border-dashed border-border/80 shadow-sm">
        <EmptyState
          icon={Compass}
          title="No upcoming trips"
          description="You have no trips coming up. Find a certified local guide and plan your next journey."
          action={{ label: "Find a Guide", href: "/guide-availability" }}
        />
      </Card>
    );
  }

  const countdown = formatCountdown(trip.travelDate);

  return (
    <Card className="relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 p-0 text-white shadow-lg">
      {/* Decorative depth — kept behind the content and out of the a11y tree. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl"
      />

      <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.5fr_1fr] lg:gap-8">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-0 bg-white/20 text-white hover:bg-white/25">
              Next trip
            </Badge>
            <TripStatusBadge status={trip.status} />
            {trip.bookingCode && (
              <span className="font-mono text-xs text-white/70">
                {trip.bookingCode}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {trip.destination}
            </h2>
            {trip.places.length > 0 && (
              <p className="flex items-start gap-1.5 text-sm text-white/75">
                <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="line-clamp-2">{trip.places.join(" · ")}</span>
              </p>
            )}
          </div>

          <dl className="flex flex-wrap gap-x-6 gap-y-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-white/60">
                Travel date
              </dt>
              <dd className="flex items-center gap-1.5 font-semibold">
                <CalendarDays aria-hidden="true" className="h-4 w-4" />
                {formatDate(trip.travelDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-white/60">
                Departs
              </dt>
              <dd className="font-semibold capitalize">{countdown}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-white/60">
                Travellers
              </dt>
              <dd className="flex items-center gap-1.5 font-semibold">
                <Users aria-hidden="true" className="h-4 w-4" />
                {trip.travelers}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col justify-between gap-4">
          {trip.guide ? (
            <GuidePanel guide={trip.guide} />
          ) : (
            <div className="rounded-xl bg-white/10 p-3 text-sm ring-1 ring-inset ring-white/15">
              <p className="font-semibold text-white">Guide being assigned</p>
              <p className="text-white/70">
                We're matching you with a certified local guide. You'll be
                notified as soon as one accepts.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              size="sm"
              className="flex-1 bg-white text-teal-800 hover:bg-white/90"
            >
              <Link href={`/dashboard/user/my-bookings/${trip.bookingId}`}>
                <Ticket aria-hidden="true" className="mr-1.5 h-4 w-4" />
                View Booking
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="flex-1 border-white/30 bg-transparent text-white hover:bg-white/15 hover:text-white"
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
                size="sm"
                variant="outline"
                className="w-full border-white/30 bg-transparent text-white hover:bg-white/15 hover:text-white"
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
    </Card>
  );
}
