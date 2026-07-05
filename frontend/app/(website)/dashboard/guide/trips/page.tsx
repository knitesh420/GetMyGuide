"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { completeTrip, fetchMyTrips, startTrip } from "@/lib/redux/thunks/trip/tripThunks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TripStatusBadge } from "@/components/trip/TripStatusBadge";
import { StartTripDialog } from "@/components/trip/StartTripDialog";
import { CompleteTripDialog } from "@/components/trip/CompleteTripDialog";
import { showToast } from "@/lib/utils/toastHelper";
import { PopulatedBookingSummary } from "@/lib/data";

function asBooking(value: unknown): PopulatedBookingSummary | null {
  return value && typeof value === "object" ? (value as PopulatedBookingSummary) : null;
}

export default function GuideTripsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { myTrips, loading } = useSelector((state: RootState) => state.trips);
  const [startTargetId, setStartTargetId] = useState<string | null>(null);
  const [completeTargetId, setCompleteTargetId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchMyTrips({ page: 1, limit: 50 }));
  }, [dispatch]);

  const handleStart = async (notes?: string) => {
    if (!startTargetId) return;
    setActionLoading(true);
    const result = await dispatch(startTrip({ id: startTargetId, notes }));
    setActionLoading(false);
    if (startTrip.fulfilled.match(result)) {
      showToast.success("Trip started");
      setStartTargetId(null);
    } else {
      showToast.error((result.payload as string) || "Failed to start trip");
    }
  };

  const handleComplete = async (completionNotes?: string) => {
    if (!completeTargetId) return;
    setActionLoading(true);
    const result = await dispatch(completeTrip({ id: completeTargetId, completionNotes }));
    setActionLoading(false);
    if (completeTrip.fulfilled.match(result)) {
      showToast.success("Trip marked complete");
      setCompleteTargetId(null);
    } else {
      showToast.error((result.payload as string) || "Failed to complete trip");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Trips</h2>
        <p className="text-muted-foreground">Trips created once you accept an assignment.</p>
      </div>

      {loading && myTrips.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : myTrips.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You don&apos;t have any trips yet — accept an assignment to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {myTrips.map((trip) => {
            const booking = asBooking(trip.booking);
            return (
              <Card key={trip._id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">{booking?.travel_details.city ?? "Trip"}</CardTitle>
                  <TripStatusBadge status={trip.status} />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Tourist: {booking?.tourist_info.name ?? "—"}</p>
                    {booking?.travel_details.date && (
                      <p>Date: {new Date(booking.travel_details.date).toLocaleDateString()}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {trip.status === "not-started" && (
                      <Button size="sm" onClick={() => setStartTargetId(trip._id)}>
                        Start Trip
                      </Button>
                    )}
                    {trip.status === "in-progress" && (
                      <Button size="sm" onClick={() => setCompleteTargetId(trip._id)}>
                        Complete Trip
                      </Button>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/guide/trips/${trip._id}`}>View Details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <StartTripDialog
        isOpen={!!startTargetId}
        onClose={() => setStartTargetId(null)}
        onStart={handleStart}
        isLoading={actionLoading}
      />
      <CompleteTripDialog
        isOpen={!!completeTargetId}
        onClose={() => setCompleteTargetId(null)}
        onComplete={handleComplete}
        isLoading={actionLoading}
      />
    </div>
  );
}
