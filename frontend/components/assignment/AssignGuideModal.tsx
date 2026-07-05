"use client";

import { useEffect, useState } from "react";
import { AssignableGuide } from "@/lib/data";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";

interface AssignGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (guideId: string, adminNotes?: string) => void;
  guides: AssignableGuide[];
  isLoading: boolean;
  title?: string;
  description?: string;
}

export function AssignGuideModal({
  isOpen,
  onClose,
  onAssign,
  guides,
  isLoading,
  title = "Assign a Guide",
  description = "Choose a guide to propose for this booking.",
}: AssignGuideModalProps) {
  const [guideId, setGuideId] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      setGuideId("");
      setAdminNotes("");
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!guideId) return;
    onAssign(guideId, adminNotes || undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="guide">Guide</Label>
            <Select value={guideId} onValueChange={setGuideId}>
              <SelectTrigger id="guide" className="w-full mt-1">
                <SelectValue placeholder="Select a guide" />
              </SelectTrigger>
              <SelectContent>
                {guides.map((guide) => (
                  <SelectItem key={guide.accountId} value={guide.accountId}>
                    {guide.name} {guide.city ? `— ${guide.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="adminNotes">Admin Notes (optional)</Label>
            <Textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Any context for the guide or for your own records"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!guideId || isLoading} onClick={handleSubmit}>
            {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Assigning..." : "Assign Guide"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
