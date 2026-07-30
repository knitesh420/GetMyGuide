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

interface CompleteTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (completionNotes?: string) => void;
  isLoading: boolean;
}

export function CompleteTripDialog({ isOpen, onClose, onComplete, isLoading }: CompleteTripDialogProps) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) setNotes("");
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Trip</DialogTitle>
          <DialogDescription>
            Mark this trip as complete. The tourist will be notified and invited to leave a review.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Label htmlFor="completionNotes">Completion Notes (optional)</Label>
          <Textarea
            id="completionNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth noting about how the trip went"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={isLoading} onClick={() => onComplete(notes || undefined)}>
            {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Completing..." : "Complete Trip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
