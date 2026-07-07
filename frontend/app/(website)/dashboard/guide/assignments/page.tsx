"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchMyAssignments, respondToAssignment } from "@/lib/redux/thunks/assignment/assignmentThunks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignmentStatusBadge } from "@/components/assignment/AssignmentStatusBadge";
import { DeclineAssignmentDialog } from "@/components/assignment/DeclineAssignmentDialog";
import { showToast } from "@/lib/utils/toastHelper";
import { PopulatedBookingSummary } from "@/lib/data";

function asBooking(value: unknown): PopulatedBookingSummary | null {
  return value && typeof value === "object" ? (value as PopulatedBookingSummary) : null;
}

export default function GuideAssignmentsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { myAssignments, loading } = useSelector((state: RootState) => state.assignments);
  const [declineTargetId, setDeclineTargetId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchMyAssignments({ page: 1, limit: 50 }));
  }, [dispatch]);

  const handleAccept = async (id: string) => {
    setRespondingId(id);
    const result = await dispatch(respondToAssignment({ id, action: "accept" }));
    setRespondingId(null);
    if (respondToAssignment.fulfilled.match(result)) {
      showToast.success("Assignment accepted — trip created!");
    } else {
      showToast.error((result.payload as string) || "Failed to accept assignment");
    }
  };

  const handleDecline = async (reason: string) => {
    if (!declineTargetId) return;
    setRespondingId(declineTargetId);
    const result = await dispatch(
      respondToAssignment({ id: declineTargetId, action: "decline", declineReason: reason }),
    );
    setRespondingId(null);
    if (respondToAssignment.fulfilled.match(result)) {
      showToast.success("Assignment declined");
      setDeclineTargetId(null);
    } else {
      showToast.error((result.payload as string) || "Failed to decline assignment");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Assignment Requests</h2>
        <p className="text-muted-foreground">Review and respond to bookings proposed to you.</p>
      </div>

      {loading && myAssignments.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : myAssignments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You don&apos;t have any assignment requests yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {myAssignments.map((assignment) => {
            const booking = asBooking(assignment.booking);
            return (
              <Card key={assignment._id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">
                    {booking?.travel_details.city ?? "Booking"}
                  </CardTitle>
                  <AssignmentStatusBadge status={assignment.status} />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Tourist: {booking?.tourist_info.name ?? "—"}</p>
                    {booking?.travel_details.date && (
                      <p>Date: {new Date(booking.travel_details.date).toLocaleDateString()}</p>
                    )}
                    {booking?.travel_details.no_of_person && (
                      <p>Travelers: {booking.travel_details.no_of_person}</p>
                    )}
                    {assignment.adminNotes && <p>Admin notes: {assignment.adminNotes}</p>}
                    {assignment.status === "declined" && assignment.declineReason && (
                      <p>Your reason: {assignment.declineReason}</p>
                    )}
                  </div>

                  {assignment.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={respondingId === assignment._id}
                        onClick={() => handleAccept(assignment._id)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={respondingId === assignment._id}
                        onClick={() => setDeclineTargetId(assignment._id)}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <DeclineAssignmentDialog
        isOpen={!!declineTargetId}
        onClose={() => setDeclineTargetId(null)}
        onDecline={handleDecline}
        isLoading={!!respondingId}
      />
    </div>
  );
}
