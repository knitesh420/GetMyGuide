"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { completeTrip, fetchMyTrips, startTrip } from "@/lib/redux/thunks/trip/tripThunks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StartTripDialog } from "@/components/trip/StartTripDialog";
import { CompleteTripDialog } from "@/components/trip/CompleteTripDialog";
import { showToast } from "@/lib/utils/toastHelper";
import { PopulatedBookingSummary } from "@/lib/data";
import { CheckCircle2, MapPinned, Route } from "lucide-react";
import {
  GuideCellStack,
  GuideEmptyState,
  GuidePageHeader,
  GuidePanel,
  GuideStat,
  GuideStatusBadge,
  GuideTable,
  GuideTableCell,
  GuideTableHead,
  GuideTableRow,
  GuideToolbar,
} from "@/components/guide";

function asBooking(value: unknown): PopulatedBookingSummary | null {
  return value && typeof value === "object" ? (value as PopulatedBookingSummary) : null;
}

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function GuideTripsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { myTrips, loading } = useSelector((state: RootState) => state.trips);
  const [startTargetId, setStartTargetId] = useState<string | null>(null);
  const [completeTargetId, setCompleteTargetId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchMyTrips({ page: 1, limit: 50 }));
  }, [dispatch]);

  const stats = useMemo(() => {
    const byStatus = (name: string) => myTrips.filter((t) => t.status === name).length;
    return {
      total: myTrips.length,
      inProgress: byStatus("in-progress"),
      completed: byStatus("completed"),
    };
  }, [myTrips]);

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
    <div className="space-y-6">
      <GuidePageHeader
        title="My Trips"
        description="Trips created once you accept an assignment."
      />

      <GuidePanel>
        <GuideToolbar
          stats={
            <>
              <GuideStat icon={MapPinned} label="Total Trips" value={stats.total} />
              <GuideStat icon={Route} label="In Progress" value={stats.inProgress} />
              <GuideStat icon={CheckCircle2} label="Completed" value={stats.completed} accent />
            </>
          }
        >
          <h2 className="text-sm font-semibold text-slate-900">All trips</h2>
        </GuideToolbar>

        {loading && myTrips.length === 0 ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : myTrips.length === 0 ? (
          <GuideEmptyState
            icon={MapPinned}
            title="No trips yet"
            description="Accept an assignment to get started."
          />
        ) : (
          <GuideTable>
            <GuideTableHead
              columns={["Destination", "Tourist", "Date", "Status", "Action"]}
            />
            <tbody>
              {myTrips.map((trip) => {
                const booking = asBooking(trip.booking);
                return (
                  <GuideTableRow key={trip._id}>
                    <GuideTableCell>
                      <GuideCellStack
                        primary={booking?.travel_details.city ?? "Trip"}
                        secondary={booking?.travel_details.places?.join(", ") || undefined}
                      />
                    </GuideTableCell>
                    <GuideTableCell>{booking?.tourist_info.name ?? "—"}</GuideTableCell>
                    <GuideTableCell className="whitespace-nowrap">
                      {booking?.travel_details.date
                        ? shortDate(booking.travel_details.date)
                        : "—"}
                    </GuideTableCell>
                    <GuideTableCell>
                      <GuideStatusBadge status={trip.status} />
                    </GuideTableCell>
                    <GuideTableCell last>
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
                    </GuideTableCell>
                  </GuideTableRow>
                );
              })}
            </tbody>
          </GuideTable>
        )}
      </GuidePanel>

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
