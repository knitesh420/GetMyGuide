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
    <Card className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm transition-shadow duration-200 before:hidden hover:translate-y-0 hover:border-amber-200 hover:shadow-md lg:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl"
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700"
          >
            <Sparkles className="h-5 w-5" />
          </span>

          <div className="min-w-0 space-y-1.5">
            <h2 className="text-lg font-semibold text-amber-950">
              How was {next.destination}?
            </h2>
            <p className="text-sm leading-relaxed text-amber-900">
              You completed this trip on {formatDate(next.completedAt)}
              {next.guide ? ` with ${next.guide.name}` : ""}. Share how it went
              to help other travellers.
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

        <div className="flex shrink-0 flex-wrap gap-3">
          <Button
            asChild
            className="h-10 rounded-lg bg-amber-600 px-4 font-medium shadow-sm hover:bg-amber-700"
          >
            <Link href="/dashboard/user/reviews">
              <Star aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Rate Guide
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-10 rounded-lg border-amber-600/40 bg-transparent px-4 font-medium text-amber-800 hover:bg-amber-500/10 hover:text-amber-900"
          >
            <Link href="/dashboard/user/reviews">Leave a Review</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
