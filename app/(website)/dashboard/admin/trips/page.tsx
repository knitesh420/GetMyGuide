"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchAllTrips } from "@/lib/redux/thunks/trip/tripThunks";
import { MapPinned } from "lucide-react";
import {
  AdminPanel,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
  EmptyState,
  PageHeader,
} from "@/components/admin/ui";
import { SkeletonTable } from "@/components/animations/Skeletons";
import { TripStatusBadge } from "@/components/trip/TripStatusBadge";
import { useAuth } from "@/lib/hooks/useAuth";
import { PopulatedAccountSummary, PopulatedBookingSummary } from "@/lib/data";

function asBooking(value: unknown): PopulatedBookingSummary | null {
  return value && typeof value === "object" ? (value as PopulatedBookingSummary) : null;
}

function asAccount(value: unknown): PopulatedAccountSummary | null {
  return value && typeof value === "object" ? (value as PopulatedAccountSummary) : null;
}

export default function AdminTripsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { trips, loading } = useSelector((state: RootState) => state.trips);

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchAllTrips({ page: 1, limit: 50 }));
  }, [dispatch, isAuthenticated]);

  if (authLoading || !isAuthenticated) return null;
  if (user && user.role !== "admin") return null;

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Trip Oversight"
        description="Monitor every trip across the platform."
      />

      {loading && trips.length === 0 ? (
        <SkeletonTable rows={6} columns={6} />
      ) : (
        <AdminPanel>
          {trips.length === 0 ? (
            <EmptyState
              bare
              icon={MapPinned}
              title="No trips yet"
              description="Trips will appear here once bookings are assigned and start progressing."
            />
          ) : (
            <AdminTable>
              <AdminTableHead
                columns={["City", "Tourist", "Guide", "Status", "Started", "Completed"]}
              />
              <tbody>
                {trips.map((trip, i) => {
                  const booking = asBooking(trip.booking);
                  const guide = asAccount(trip.guide);
                  return (
                    <AdminTableRow key={trip._id} index={i}>
                      <AdminTableCell className="font-semibold text-slate-900">
                        {booking?.travel_details.city ?? "—"}
                      </AdminTableCell>
                      <AdminTableCell>{booking?.tourist_info.name ?? "—"}</AdminTableCell>
                      <AdminTableCell>{guide?.name ?? "—"}</AdminTableCell>
                      <AdminTableCell>
                        <TripStatusBadge status={trip.status} />
                      </AdminTableCell>
                      <AdminTableCell>
                        {trip.startedAt ? new Date(trip.startedAt).toLocaleDateString() : "—"}
                      </AdminTableCell>
                      <AdminTableCell last>
                        {trip.completedAt ? new Date(trip.completedAt).toLocaleDateString() : "—"}
                      </AdminTableCell>
                    </AdminTableRow>
                  );
                })}
              </tbody>
            </AdminTable>
          )}
        </AdminPanel>
      )}
    </div>
  );
}
