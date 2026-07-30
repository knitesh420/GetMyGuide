import Link from "next/link";
import { Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TouristPendingReview } from "@/lib/data";
import { formatDate } from "./format";

/**
 * Nudge to review a finished trip. Renders nothing when there's nothing to
 * review — an empty "you have no reviews to leave" card would be noise.
 *
 * Styled as the guide dashboard's amber action banner (the "Membership expires
 * soon" panel): hairline amber border, amber-50/60 wash, p-5, a 20px icon at the
 * top-left of a gap-3 row, `font-semibold text-amber-900` headline over
 * `text-sm text-amber-800/80` body. It replaces a gradient card that was the
 * only rounded-2xl, 32px-padded surface on the page.
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
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <Sparkles
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
          />
          <div className="min-w-0">
            <h2 className="font-semibold text-amber-900">
              How was {next.destination}?
            </h2>
            <p className="mt-1 text-sm text-amber-800/80">
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

        <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:flex">
          <Button
            asChild
            className="h-10 w-full rounded-lg bg-amber-600 px-4 font-medium shadow-sm hover:bg-amber-700 lg:w-auto"
          >
            <Link href="/dashboard/user/reviews">
              <Star aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Rate Guide
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-10 w-full rounded-lg border-amber-600/40 bg-transparent px-4 font-medium text-amber-800 hover:bg-amber-500/10 hover:text-amber-900 lg:w-auto"
          >
            <Link href="/dashboard/user/reviews">Leave a Review</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
