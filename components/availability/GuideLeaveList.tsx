"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GuideLeave } from "@/lib/data";
import { X } from "lucide-react";

interface GuideLeaveListProps {
  leaves: GuideLeave[];
  onCancel?: (leaveId: string) => void;
  cancellingId?: string | null;
}

function formatRange(startDate: string, endDate: string): string {
  const start = new Date(startDate).toLocaleDateString();
  const end = new Date(endDate).toLocaleDateString();
  return start === end ? start : `${start} — ${end}`;
}

export function GuideLeaveList({ leaves, onCancel, cancellingId }: GuideLeaveListProps) {
  if (leaves.length === 0) {
    return <p className="text-sm text-muted-foreground">No leave periods requested yet.</p>;
  }

  return (
    <div className="space-y-3">
      {leaves.map((leave) => {
        const isActive = leave.status === "active";
        const isPast = new Date(leave.endDate) < new Date();
        return (
          <div
            key={leave._id}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={leave.type === "emergency" ? "destructive" : "secondary"}>
                  {leave.type === "emergency" ? "Emergency Leave" : "Vacation"}
                </Badge>
                {!isActive && <Badge variant="outline">Cancelled</Badge>}
              </div>
              <p className="mt-1 text-sm font-medium">{formatRange(leave.startDate, leave.endDate)}</p>
              {leave.reason && <p className="text-sm text-muted-foreground">{leave.reason}</p>}
            </div>
            {isActive && !isPast && onCancel && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancel(leave._id)}
                disabled={cancellingId === leave._id}
              >
                <X className="mr-1 h-3 w-3" />
                Cancel
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
