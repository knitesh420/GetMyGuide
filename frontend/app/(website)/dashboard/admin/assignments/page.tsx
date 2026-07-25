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
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminCellStack,
  AdminPanel,
  AdminSection,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
  EmptyState,
  PageHeader,
} from "@/components/admin/ui";
import { SkeletonTable } from "@/components/animations/Skeletons";
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
    if (isAuthenticated && user && user.role !== "admin") {
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
  if (user && user.role !== "admin") return null;

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
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Assignment Management"
        description="Assign guides to bookings and track acceptance."
      />

      <AdminPanel>
        <AdminSection title="Bookings Awaiting a Guide">
          {bookingsAwaitingAssignment.length === 0 ? (
            <p className="text-sm text-slate-500">No bookings currently need a guide.</p>
          ) : (
            <div className="space-y-3">
              {bookingsAwaitingAssignment.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {booking.travel_details.city} — {booking.tourist_info.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(booking.travel_details.date).toLocaleDateString()} ·{" "}
                      {booking.travel_details.no_of_person} traveler(s)
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs text-slate-400">
                      <span>Booking: {booking.bookingCode ?? "—"}</span>
                      <span>Tourist: {booking.touristCode ?? "—"}</span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0"
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
        </AdminSection>
      </AdminPanel>

      {loading && assignments.length === 0 ? (
        <SkeletonTable rows={6} columns={7} />
      ) : (
        <AdminPanel>
          {assignments.length === 0 ? (
            <EmptyState
              bare
              icon={ClipboardList}
              title="No assignments yet"
              description="Once you assign a guide to a booking, it appears here with its acceptance status."
            />
          ) : (
            <AdminTable>
              <AdminTableHead
                columns={["Ref", "City", "Tourist", "Guide", "Status", "Notes", "Action"]}
              />
              <tbody>
                {assignments.map((assignment, i) => {
                  const booking = asBooking(assignment.booking);
                  const guide = asAccount(assignment.guide);
                  const canReassign = assignment.status === "pending" || assignment.status === "declined";
                  return (
                    <AdminTableRow key={assignment._id} index={i}>
                      <AdminTableCell className="font-mono text-xs text-slate-400">
                        <div>{assignment.assignmentCode ?? "—"}</div>
                        <div>{booking?.bookingCode ?? "—"}</div>
                      </AdminTableCell>
                      <AdminTableCell className="font-semibold text-slate-900">
                        {booking?.travel_details.city ?? "—"}
                      </AdminTableCell>
                      <AdminTableCell>
                        <AdminCellStack
                          primary={booking?.tourist_info.name ?? "—"}
                          secondary={booking?.touristCode ?? "—"}
                        />
                      </AdminTableCell>
                      <AdminTableCell>
                        <AdminCellStack
                          primary={guide?.name ?? "—"}
                          secondary={guide?.guideCode ?? "—"}
                        />
                      </AdminTableCell>
                      <AdminTableCell>
                        <AssignmentStatusBadge status={assignment.status} />
                      </AdminTableCell>
                      <AdminTableCell className="max-w-[200px] truncate">
                        {assignment.adminNotes ?? "—"}
                      </AdminTableCell>
                      <AdminTableCell last>
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
                      </AdminTableCell>
                    </AdminTableRow>
                  );
                })}
              </tbody>
            </AdminTable>
          )}
        </AdminPanel>
      )}

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
