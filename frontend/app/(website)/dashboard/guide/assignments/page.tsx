"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchMyAssignments, respondToAssignment } from "@/lib/redux/thunks/assignment/assignmentThunks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DeclineAssignmentDialog } from "@/components/assignment/DeclineAssignmentDialog";
import { showToast } from "@/lib/utils/toastHelper";
import { PopulatedBookingSummary } from "@/lib/data";
import { CheckCircle2, ClipboardList, Clock } from "lucide-react";
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

export default function GuideAssignmentsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { myAssignments, loading } = useSelector((state: RootState) => state.assignments);
  const [declineTargetId, setDeclineTargetId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchMyAssignments({ page: 1, limit: 50 }));
  }, [dispatch]);

  const stats = useMemo(() => {
    const byStatus = (name: string) =>
      myAssignments.filter((a) => a.status === name).length;
    return {
      total: myAssignments.length,
      pending: byStatus("pending"),
      accepted: byStatus("accepted"),
    };
  }, [myAssignments]);

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
    <div className="space-y-6">
      <GuidePageHeader
        title="Assignment Requests"
        description="Review and respond to bookings proposed to you."
      />

      <GuidePanel>
        <GuideToolbar
          stats={
            <>
              <GuideStat icon={ClipboardList} label="Total Requests" value={stats.total} />
              <GuideStat icon={Clock} label="Awaiting Response" value={stats.pending} />
              <GuideStat icon={CheckCircle2} label="Accepted" value={stats.accepted} accent />
            </>
          }
        >
          <h2 className="text-sm font-semibold text-slate-900">All requests</h2>
        </GuideToolbar>

        {loading && myAssignments.length === 0 ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : myAssignments.length === 0 ? (
          <GuideEmptyState
            icon={ClipboardList}
            title="No assignment requests yet"
            description="When an admin proposes a booking to you, it will appear here."
          />
        ) : (
          <GuideTable>
            <GuideTableHead
              columns={["Destination", "Tourist", "Date", "Travellers", "Notes", "Status", "Action"]}
            />
            <tbody>
              {myAssignments.map((assignment) => {
                const booking = asBooking(assignment.booking);
                const isResponding = respondingId === assignment._id;

                return (
                  <GuideTableRow key={assignment._id}>
                    <GuideTableCell>
                      <GuideCellStack
                        primary={booking?.travel_details.city ?? "Booking"}
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
                      {booking?.travel_details.no_of_person ?? "—"}
                    </GuideTableCell>
                    <GuideTableCell className="max-w-xs">
                      {assignment.status === "declined" && assignment.declineReason ? (
                        <span className="text-slate-500">
                          Your reason: {assignment.declineReason}
                        </span>
                      ) : assignment.adminNotes ? (
                        <span className="text-slate-500">{assignment.adminNotes}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </GuideTableCell>
                    <GuideTableCell>
                      <GuideStatusBadge status={assignment.status} />
                    </GuideTableCell>
                    <GuideTableCell last>
                      {assignment.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={isResponding}
                            onClick={() => handleAccept(assignment._id)}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isResponding}
                            onClick={() => setDeclineTargetId(assignment._id)}
                          >
                            Decline
                          </Button>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </GuideTableCell>
                  </GuideTableRow>
                );
              })}
            </tbody>
          </GuideTable>
        )}
      </GuidePanel>

      <DeclineAssignmentDialog
        isOpen={!!declineTargetId}
        onClose={() => setDeclineTargetId(null)}
        onDecline={handleDecline}
        isLoading={!!respondingId}
      />
    </div>
  );
}
