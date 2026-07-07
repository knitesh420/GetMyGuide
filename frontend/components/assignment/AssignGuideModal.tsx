"use client";

import { useEffect, useMemo, useState } from "react";
import { AssignableGuide, GuideAvailabilityInfo } from "@/lib/data";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface AssignGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (guideId: string, adminNotes?: string, override?: boolean, overrideReason?: string) => void;
  guides: AssignableGuide[];
  isLoading: boolean;
  title?: string;
  description?: string;
  // Availability for the booking's dates, keyed by guide accountId. When
  // omitted, no conflict info is shown (falls back to the plain picker).
  availability?: GuideAvailabilityInfo[];
}

export function AssignGuideModal({
  isOpen,
  onClose,
  onAssign,
  guides,
  isLoading,
  title = "Assign a Guide",
  description = "Choose a guide to propose for this booking.",
  availability,
}: AssignGuideModalProps) {
  const [guideId, setGuideId] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setGuideId("");
      setAdminNotes("");
      setOverride(false);
      setOverrideReason("");
    }
  }, [isOpen]);

  const availabilityByGuideId = useMemo(() => {
    const map = new Map<string, GuideAvailabilityInfo>();
    (availability ?? []).forEach((a) => map.set(a.accountId, a));
    return map;
  }, [availability]);

  const selectedAvailability = guideId ? availabilityByGuideId.get(guideId) : undefined;
  const hasConflict = !!selectedAvailability && !selectedAvailability.isAvailable;

  useEffect(() => {
    if (!hasConflict) {
      setOverride(false);
      setOverrideReason("");
    }
  }, [hasConflict]);

  const handleSubmit = () => {
    if (!guideId) return;
    if (hasConflict && (!override || !overrideReason.trim())) return;
    onAssign(guideId, adminNotes || undefined, hasConflict ? override : undefined, hasConflict && override ? overrideReason.trim() : undefined);
  };

  const canSubmit = !!guideId && (!hasConflict || (override && !!overrideReason.trim()));

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
                {guides.map((guide) => {
                  const guideAvailability = availabilityByGuideId.get(guide.accountId);
                  const conflicted = guideAvailability && !guideAvailability.isAvailable;
                  return (
                    <SelectItem key={guide.accountId} value={guide.accountId}>
                      {guide.name} {guide.city ? `— ${guide.city}` : ""}
                      {conflicted ? " ⚠ Not available" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {hasConflict && selectedAvailability && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>This guide is not available for these dates</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {selectedAvailability.conflicts.map((c, i) => (
                    <li key={i}>{c.reason ?? c.type}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {hasConflict && (
            <div className="space-y-2 rounded-md border border-destructive/30 p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="override"
                  checked={override}
                  onCheckedChange={(checked) => setOverride(checked === true)}
                />
                <Label htmlFor="override" className="text-sm font-medium">
                  Override conflict and assign anyway
                </Label>
              </div>
              {override && (
                <div>
                  <Label htmlFor="overrideReason">Reason for override (required)</Label>
                  <Textarea
                    id="overrideReason"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Explain why this guide should be assigned despite the conflict"
                  />
                </div>
              )}
            </div>
          )}

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
          <Button type="button" disabled={!canSubmit || isLoading} onClick={handleSubmit}>
            {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Assigning..." : "Assign Guide"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
