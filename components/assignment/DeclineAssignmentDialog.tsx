"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw } from "lucide-react";

interface DeclineAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDecline: (reason: string) => void;
  isLoading: boolean;
}

export function DeclineAssignmentDialog({
  isOpen,
  onClose,
  onDecline,
  isLoading,
}: DeclineAssignmentDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Decline Assignment</DialogTitle>
          <DialogDescription>
            Let the admin know why you can&apos;t take this booking so they can reassign it.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Label htmlFor="declineReason">Reason</Label>
          <Textarea
            id="declineReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Not available on these dates"
            required
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!reason.trim() || isLoading}
            onClick={() => onDecline(reason.trim())}
          >
            {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Declining..." : "Decline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
