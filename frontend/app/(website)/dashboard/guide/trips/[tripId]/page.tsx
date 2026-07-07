"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchTripById } from "@/lib/redux/thunks/trip/tripThunks";
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

export default function GuideTripDetailPage() {
  const params = useParams<{ tripId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { currentTrip, loading } = useSelector((state: RootState) => state.trips);

  useEffect(() => {
    if (params.tripId) dispatch(fetchTripById(params.tripId));
  }, [dispatch, params.tripId]);

  if (loading && !currentTrip) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!currentTrip) return null;

  const booking = asBooking(currentTrip.booking);
  const guide = asAccount(currentTrip.guide);

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          {booking?.travel_details.city ?? "Trip"} Details
        </h2>
        <TripStatusBadge status={currentTrip.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Tourist: {booking?.tourist_info.name ?? "—"}</p>
          <p>Phone: {booking?.tourist_info.phone ?? "—"}</p>
          {booking?.travel_details.date && (
            <p>Date: {new Date(booking.travel_details.date).toLocaleDateString()}</p>
          )}
          <p>Travelers: {booking?.travel_details.no_of_person ?? "—"}</p>
          <p>Places: {booking?.travel_details.places?.join(", ") ?? "—"}</p>
          {guide?.name && <p>Guide: {guide.name}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trip Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {currentTrip.startedAt && (
            <p>Started: {new Date(currentTrip.startedAt).toLocaleString()}</p>
          )}
          {currentTrip.startNotes && <p>Start notes: {currentTrip.startNotes}</p>}
          {currentTrip.completedAt && (
            <p>Completed: {new Date(currentTrip.completedAt).toLocaleString()}</p>
          )}
          {currentTrip.completionNotes && <p>Completion notes: {currentTrip.completionNotes}</p>}
          {!currentTrip.startedAt && <p className="text-muted-foreground">Trip has not started yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
