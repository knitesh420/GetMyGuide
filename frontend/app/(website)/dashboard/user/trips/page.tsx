"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchMyTripsAsTourist } from "@/lib/redux/thunks/trip/tripThunks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TripStatusBadge } from "@/components/trip/TripStatusBadge";
import {
  PopulatedAccountSummary,
  PopulatedBookingSummary,
  TripStatus,
} from "@/lib/data";

function asBooking(value: unknown): PopulatedBookingSummary | null {
  return value && typeof value === "object" ? (value as PopulatedBookingSummary) : null;
}

function asAccount(value: unknown): PopulatedAccountSummary | null {
  return value && typeof value === "object" ? (value as PopulatedAccountSummary) : null;
}

// This page is the status tracker (payment + full details live under My
// Bookings). Each lifecycle stage gets a plain-language explanation so a
// tourist always knows what's happening with their trip.
const STATUS_DESCRIPTION: Record<TripStatus, string> = {
  planned: "We've received your booking and are arranging a guide for you.",
  "not-started": "A guide has been assigned and accepted. Your trip hasn't started yet.",
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
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Your Trips</h2>
        <p className="text-muted-foreground">
          Every trip you&apos;ve booked, from planned (awaiting a guide) through to completion.
        </p>
      </div>

      {loading && myTrips.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : myTrips.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You don&apos;t have any trips yet. Once you book a tour it appears here as
            &ldquo;planned&rdquo;, then updates as a guide is assigned and your trip progresses.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {myTrips.map((trip) => {
            const booking = asBooking(trip.booking);
            const guide = asAccount(trip.guide);
            return (
              <Card key={trip._id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">{booking?.travel_details.city ?? "Trip"}</CardTitle>
                  <TripStatusBadge status={trip.status} />
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p className="font-mono text-xs">
                    {trip.tripCode ? `Trip ID: ${trip.tripCode} · ` : ""}
                    Booking: {booking?.bookingCode ?? "—"}
                  </p>
                  {booking?.travel_details.date && (
                    <p>Date: {new Date(booking.travel_details.date).toLocaleDateString()}</p>
                  )}
                  <p>Guide: {guide?.name ?? "Not assigned yet"}</p>
                  <p
                    className={
                      trip.status === "completed"
                        ? "text-primary font-medium pt-1"
                        : "pt-1"
                    }
                  >
                    {STATUS_DESCRIPTION[trip.status]}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
