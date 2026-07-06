"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import {
  createAssignment,
  fetchAssignableGuides,
  fetchAssignments,
  fetchBookingsAwaitingAssignment,
  fetchGuidesAvailability,
  reassignGuide,
} from "@/lib/redux/thunks/assignment/assignmentThunks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignmentStatusBadge } from "@/components/assignment/AssignmentStatusBadge";
import { AssignGuideModal } from "@/components/assignment/AssignGuideModal";
import { showToast } from "@/lib/utils/toastHelper";
import { useAuth } from "@/lib/hooks/useAuth";
import { PopulatedAccountSummary, PopulatedBookingSummary } from "@/lib/data";

function asBooking(value: unknown): PopulatedBookingSummary | null {
  return value && typeof value === "object" ? (value as PopulatedBookingSummary) : null;
}

function asAccount(value: unknown): PopulatedAccountSummary | null {
  return value && typeof value === "object" ? (value as PopulatedAccountSummary) : null;
}

export default function AdminAssignmentsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const { assignments, assignableGuides, bookingsAwaitingAssignment, guidesAvailability, loading } = useSelector(
    (state: RootState) => state.assignments,
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [reassignId, setReassignId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "admin" && user.role !== "manager") {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchAssignments({ page: 1, limit: 50 }));
    dispatch(fetchAssignableGuides());
    dispatch(fetchBookingsAwaitingAssignment());
  }, [dispatch, isAuthenticated]);

  if (authLoading || !isAuthenticated) return null;
  if (user && user.role !== "admin" && user.role !== "manager") return null;

  const closeModal = () => {
    setModalOpen(false);
    setSelectedBookingId(null);
    setReassignId(null);
  };

  const handleAssign = async (guideId: string, adminNotes?: string, override?: boolean, overrideReason?: string) => {
    if (reassignId) {
      const result = await dispatch(
        reassignGuide({ id: reassignId, newGuideId: guideId, adminNotes, override, overrideReason }),
      );
      if (reassignGuide.fulfilled.match(result)) {
        showToast.success("Guide reassigned");
        closeModal();
        dispatch(fetchAssignments({ page: 1, limit: 50 }));
      } else {
        showToast.error((result.payload as string) || "Failed to reassign guide");
      }
      return;
    }

    if (!selectedBookingId) return;
    const result = await dispatch(
      createAssignment({ bookingId: selectedBookingId, guideId, adminNotes, override, overrideReason }),
    );
    if (createAssignment.fulfilled.match(result)) {
      showToast.success("Guide assigned");
      closeModal();
      dispatch(fetchBookingsAwaitingAssignment());
    } else {
      showToast.error((result.payload as string) || "Failed to assign guide");
    }
  };

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Assignment Management</h2>
        <p className="text-muted-foreground">Assign guides to bookings and track acceptance.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bookings Awaiting a Guide</CardTitle>
        </CardHeader>
        <CardContent>
          {bookingsAwaitingAssignment.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings currently need a guide.</p>
          ) : (
            <div className="space-y-3">
              {bookingsAwaitingAssignment.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">
                      {booking.travel_details.city} — {booking.tourist_info.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.travel_details.date).toLocaleDateString()} ·{" "}
                      {booking.travel_details.no_of_person} traveler(s)
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedBookingId(booking.id);
                      setReassignId(null);
                      setModalOpen(true);
                      dispatch(fetchGuidesAvailability({ startDate: booking.travel_details.date }));
                    }}
                  >
                    Assign Guide
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && assignments.length === 0 ? (
            <Skeleton className="h-40" />
          ) : assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>Tourist</TableHead>
                  <TableHead>Guide</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => {
                  const booking = asBooking(assignment.booking);
                  const guide = asAccount(assignment.guide);
                  const canReassign = assignment.status === "pending" || assignment.status === "declined";
                  return (
                    <TableRow key={assignment._id}>
                      <TableCell>{booking?.travel_details.city ?? "—"}</TableCell>
                      <TableCell>{booking?.tourist_info.name ?? "—"}</TableCell>
                      <TableCell>{guide?.name ?? "—"}</TableCell>
                      <TableCell>
                        <AssignmentStatusBadge status={assignment.status} />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{assignment.adminNotes ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {canReassign && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReassignId(assignment._id);
                              setSelectedBookingId(null);
                              setModalOpen(true);
                              if (booking) {
                                dispatch(fetchGuidesAvailability({ startDate: booking.travel_details.date }));
                              }
                            }}
                          >
                            Reassign
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AssignGuideModal
        isOpen={modalOpen}
        onClose={closeModal}
        onAssign={handleAssign}
        guides={assignableGuides}
        isLoading={loading}
        title={reassignId ? "Reassign Guide" : "Assign a Guide"}
        description={
          reassignId
            ? "Choose a new guide to propose for this booking."
            : "Choose a guide to propose for this booking."
        }
        availability={guidesAvailability}
      />
    </div>
  );
}
