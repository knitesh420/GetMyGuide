"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchMyTripsAsTourist } from "@/lib/redux/thunks/trip/tripThunks";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPinned } from "lucide-react";
import { TripStatusBadge } from "@/components/trip/TripStatusBadge";
import { EmptyState } from "@/components/dashboard/tourist/EmptyState";
import { formatDate } from "@/components/dashboard/tourist/format";
import {
  CARD,
  PAGE,
  PAGE_SUBTITLE,
  PAGE_TITLE,
} from "@/components/dashboard/tourist/ui";
import {
  PopulatedAccountSummary,
  PopulatedBookingSummary,
  TripStatus,
} from "@/lib/data";
import { cn } from "@/lib/utils";

function asBooking(value: unknown): PopulatedBookingSummary | null {
  return value && typeof value === "object"
    ? (value as PopulatedBookingSummary)
    : null;
}

function asAccount(value: unknown): PopulatedAccountSummary | null {
  return value && typeof value === "object"
    ? (value as PopulatedAccountSummary)
    : null;
}

// This page is the status tracker (payment + full details live under My
// Bookings). Each lifecycle stage gets a plain-language explanation so a
// tourist always knows what's happening with their trip.
const STATUS_DESCRIPTION: Record<TripStatus, string> = {
  planned: "We've received your booking and are arranging a guide for you.",
  "not-started":
    "A guide has been assigned and accepted. Your trip hasn't started yet.",
  "in-progress": "Your guide has started the trip. Enjoy your tour!",
  completed: "Trip complete — leave a review from the Reviews page!",
  cancelled: "This trip was cancelled.",
};

export default function UserTripsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { myTrips, loading } = useSelector((state: RootState) => state.trips);

  useEffect(() => {
    dispatch(fetchMyTripsAsTourist({ page: 1, limit: 50 }));
  }, [dispatch]);

  return (
    <div className={PAGE}>
      <div>
        <h1 className={PAGE_TITLE}>Your Trips</h1>
        <p className={PAGE_SUBTITLE}>
          Every trip you&apos;ve booked, from planned (awaiting a guide) through
          to completion.
        </p>
      </div>

      {loading && myTrips.length === 0 ? (
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          className="space-y-6"
        >
          <span className="sr-only">Loading your trips…</span>
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      ) : myTrips.length === 0 ? (
        <Card className={CARD}>
          <EmptyState
            icon={MapPinned}
            title="No trips yet"
            description="Once you book a tour it appears here as “planned”, then updates as a guide is assigned and your trip progresses."
            action={{ label: "Find a Guide", href: "/guide-availability" }}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {myTrips.map((trip) => {
            const booking = asBooking(trip.booking);
            const guide = asAccount(trip.guide);
            const isComplete = trip.status === "completed";

            return (
              <Card
                key={trip._id}
                className={cn(CARD, "gap-0 p-6 lg:p-8")}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <h2 className="truncate text-xl font-semibold text-gray-900">
                      {booking?.travel_details.city ?? "Trip"}
                    </h2>
                    <p className="truncate font-mono text-xs text-gray-500">
                      {trip.tripCode ? `${trip.tripCode} · ` : ""}
                      {booking?.bookingCode ?? "—"}
                    </p>
                  </div>
                  <TripStatusBadge status={trip.status} />
                </div>

                <dl className="mt-6 grid grid-cols-1 gap-5 border-t border-gray-200 pt-6 sm:grid-cols-2">
                  <div className="space-y-0.5">
                    <dt className="text-xs text-gray-500">Travel date</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formatDate(booking?.travel_details.date)}
                    </dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-xs text-gray-500">Guide</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {guide?.name ?? "Not assigned yet"}
                    </dd>
                  </div>
                </dl>

                <p
                  className={cn(
                    "mt-6 rounded-xl border p-4 text-sm leading-relaxed",
                    isComplete
                      ? "border-green-200 bg-green-50 font-medium text-green-700"
                      : "border-gray-200 bg-gray-50 text-gray-700",
                  )}
                >
                  {STATUS_DESCRIPTION[trip.status]}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
