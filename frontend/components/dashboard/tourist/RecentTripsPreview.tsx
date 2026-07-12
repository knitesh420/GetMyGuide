import Link from "next/link";
import { CalendarDays, MapPinned, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TripStatusBadge } from "@/components/trip/TripStatusBadge";
import type {
  PopulatedAccountSummary,
  PopulatedBookingSummary,
  Trip,
} from "@/lib/data";
import { SectionCard } from "./SectionCard";
import { EmptyState } from "./EmptyState";
import { formatDate } from "./format";

// A trip's `booking` and `guide` are populated by the API but typed as
// `string | Populated…`; a synthetic 'planned' trip has no guide at all.
function asBooking(value: Trip["booking"]): PopulatedBookingSummary | null {
  return value && typeof value === "object" ? value : null;
}

function asGuide(value: Trip["guide"]): PopulatedAccountSummary | null {
  return value && typeof value === "object" ? value : null;
}

function TripRow({ trip }: { trip: Trip }) {
  const booking = asBooking(trip.booking);
  const guide = asGuide(trip.guide);

  return (
    <li className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-foreground">
            {booking?.travel_details.city ?? "Trip"}
          </p>
          <TripStatusBadge status={trip.status} />
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
            {formatDate(booking?.travel_details.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <UserRound aria-hidden="true" className="h-3.5 w-3.5" />
            {guide?.name ?? "Guide not assigned yet"}
          </span>
          {/* A booking with no Trip row yet has no trip code — show the booking
              code instead of an empty slot. */}
          <span className="font-mono text-xs">
            {trip.tripCode ?? booking?.bookingCode ?? "—"}
          </span>
        </p>
      </div>

      <Button
        asChild
        size="sm"
        variant="outline"
        className="shrink-0 self-start sm:self-auto"
      >
        <Link href="/dashboard/user/trips">
          View Trip
          <span className="sr-only">
            {" "}
            to {booking?.travel_details.city ?? "destination"}
          </span>
        </Link>
      </Button>
    </li>
  );
}

export function RecentTripsPreview({ trips }: { trips: Trip[] }) {
  return (
    <SectionCard
      icon={MapPinned}
      title="My Trips"
      description="Your three latest trips"
      viewAll={{ label: "View All Trips", href: "/dashboard/user/trips" }}
    >
      {trips.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="No trips yet"
          description="Book your first guided trip and track it from planning through to completion right here."
          action={{ label: "Find a Guide", href: "/guide-availability" }}
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {trips.map((trip) => (
            <TripRow key={trip._id} trip={trip} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
