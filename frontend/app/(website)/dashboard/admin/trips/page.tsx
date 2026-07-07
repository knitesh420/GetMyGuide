"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchAllTrips } from "@/lib/redux/thunks/trip/tripThunks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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
    if (isAuthenticated && user && user.role !== "admin" && user.role !== "manager") {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchAllTrips({ page: 1, limit: 50 }));
  }, [dispatch, isAuthenticated]);

  if (authLoading || !isAuthenticated) return null;
  if (user && user.role !== "admin" && user.role !== "manager") return null;

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Trip Oversight</h2>
        <p className="text-muted-foreground">Monitor every trip across the platform.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Trips</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && trips.length === 0 ? (
            <Skeleton className="h-40" />
          ) : trips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trips yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>Tourist</TableHead>
                  <TableHead>Guide</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => {
                  const booking = asBooking(trip.booking);
                  const guide = asAccount(trip.guide);
                  return (
                    <TableRow key={trip._id}>
                      <TableCell>{booking?.travel_details.city ?? "—"}</TableCell>
                      <TableCell>{booking?.tourist_info.name ?? "—"}</TableCell>
                      <TableCell>{guide?.name ?? "—"}</TableCell>
                      <TableCell>
                        <TripStatusBadge status={trip.status} />
                      </TableCell>
                      <TableCell>
                        {trip.startedAt ? new Date(trip.startedAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        {trip.completedAt ? new Date(trip.completedAt).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
