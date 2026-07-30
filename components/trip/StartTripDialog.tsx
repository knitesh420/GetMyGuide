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

interface StartTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (notes?: string) => void;
  isLoading: boolean;
}

export function StartTripDialog({ isOpen, onClose, onStart, isLoading }: StartTripDialogProps) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) setNotes("");
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start Trip</DialogTitle>
          <DialogDescription>Confirm you&apos;re starting this trip with the tourist now.</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Label htmlFor="startNotes">Notes (optional)</Label>
          <Textarea
            id="startNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth noting at the start of the trip"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={isLoading} onClick={() => onStart(notes || undefined)}>
            {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Starting..." : "Start Trip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
