"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchMyTripsAsTourist } from "@/lib/redux/thunks/trip/tripThunks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TripStatusBadge } from "@/components/trip/TripStatusBadge";
import { PopulatedAccountSummary, PopulatedBookingSummary } from "@/lib/data";

function asBooking(value: unknown): PopulatedBookingSummary | null {
  return value && typeof value === "object" ? (value as PopulatedBookingSummary) : null;
}

function asAccount(value: unknown): PopulatedAccountSummary | null {
  return value && typeof value === "object" ? (value as PopulatedAccountSummary) : null;
}

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
        <p className="text-muted-foreground">Track your trip status from start to completion.</p>
      </div>

      {loading && myTrips.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : myTrips.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You don&apos;t have any trips yet. Once a guide is assigned and accepts your booking,
            it will appear here.
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
                  {guide?.name && <p>Guide: {guide.name}</p>}
                  {booking?.travel_details.date && (
                    <p>Date: {new Date(booking.travel_details.date).toLocaleDateString()}</p>
                  )}
                  {trip.status === "completed" && (
                    <p className="text-primary font-medium">
                      Trip complete — leave a review from the Reviews page!
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
