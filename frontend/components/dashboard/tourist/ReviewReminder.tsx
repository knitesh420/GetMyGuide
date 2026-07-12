import Link from "next/link";
import { Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TouristPendingReview } from "@/lib/data";
import { formatDate } from "./format";

/**
 * Nudge to review a finished trip. Renders nothing when there's nothing to
 * review — an empty "you have no reviews to leave" card would be noise.
 *
 * Submitting actually happens on the Reviews page (which owns the form), so both
 * buttons deep-link there rather than duplicating the modal here.
 */
export function ReviewReminder({
  pendingReviews,
}: {
  pendingReviews: TouristPendingReview[];
}) {
  if (pendingReviews.length === 0) return null;

  const [next] = pendingReviews;
  const extra = pendingReviews.length - 1;

  return (
    <Card className="relative overflow-hidden rounded-2xl border-amber-500/30 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600"
          >
            <Sparkles className="h-5 w-5" />
          </span>

          <div className="min-w-0 space-y-1">
            <h2 className="font-semibold text-amber-950">
              How was {next.destination}?
            </h2>
            <p className="text-sm text-amber-900/70">
              You completed this trip on {formatDate(next.completedAt)}
              {next.guide ? ` with ${next.guide.name}` : ""}. Share how it went to
              help other travellers.
              {extra > 0 && (
                <>
                  {" "}
                  <span className="font-medium">
                    +{extra} more {extra === 1 ? "trip" : "trips"} awaiting a
                    review.
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700">
            <Link href="/dashboard/user/reviews">
              <Star aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Rate Guide
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-amber-600/30 bg-transparent text-amber-800 hover:bg-amber-500/10"
          >
            <Link href="/dashboard/user/reviews">Leave a Review</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
