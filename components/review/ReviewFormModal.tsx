"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
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

interface ReviewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment?: string) => void;
  isLoading: boolean;
  subtitle?: string;
}

export function ReviewFormModal({ isOpen, onClose, onSubmit, isLoading, subtitle }: ReviewFormModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHoverRating(0);
      setComment("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Leave a Review</DialogTitle>
          <DialogDescription>{subtitle ?? "Share how your trip went."}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Rating</Label>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const value = i + 1;
                const filled = value <= (hoverRating || rating);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHoverRating(value)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
                  >
                    <Star
                      className={`h-7 w-7 ${filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell other travelers about your experience"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={rating === 0 || isLoading}
            onClick={() => onSubmit(rating, comment || undefined)}
          >
            {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
