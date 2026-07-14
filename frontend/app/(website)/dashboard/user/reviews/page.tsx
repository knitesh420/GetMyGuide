"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchMyTripsAsTourist } from "@/lib/redux/thunks/trip/tripThunks";
import {
  createReview,
  fetchMyReviews,
} from "@/lib/redux/thunks/review/reviewThunks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Star } from "lucide-react";
import { ReviewFormModal } from "@/components/review/ReviewFormModal";
import { ReviewCard } from "@/components/review/ReviewCard";
import { SectionCard } from "@/components/dashboard/tourist/SectionCard";
import { EmptyState } from "@/components/dashboard/tourist/EmptyState";
import {
  CARD_PADDING,
  PAGE,
  PAGE_SUBTITLE,
  PAGE_TITLE,
  ROW_PADDING,
} from "@/components/dashboard/tourist/ui";
import { showToast } from "@/lib/utils/toastHelper";
import { PopulatedBookingSummary } from "@/lib/data";

function bookingIdOf(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return (value as PopulatedBookingSummary)._id;
}

export default function UserReviewsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { myTrips, loading: tripsLoading } = useSelector(
    (state: RootState) => state.trips,
  );
  const { myReviews, loading: reviewsLoading } = useSelector(
    (state: RootState) => state.reviews,
  );
  const [reviewTargetBookingId, setReviewTargetBookingId] = useState<
    string | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchMyTripsAsTourist({ page: 1, limit: 50 }));
    dispatch(fetchMyReviews({ page: 1, limit: 50 }));
  }, [dispatch]);

  const reviewedBookingIds = useMemo(
    () => new Set(myReviews.map((r) => r.booking)),
    [myReviews],
  );

  const eligibleTrips = useMemo(
    () =>
      myTrips.filter((trip) => {
        if (trip.status !== "completed") return false;
        const id = bookingIdOf(trip.booking);
        return id && !reviewedBookingIds.has(id);
      }),
    [myTrips, reviewedBookingIds],
  );

  const handleSubmit = async (rating: number, comment?: string) => {
    if (!reviewTargetBookingId) return;
    setSubmitting(true);
    const result = await dispatch(
      createReview({ bookingId: reviewTargetBookingId, rating, comment }),
    );
    setSubmitting(false);
    if (createReview.fulfilled.match(result)) {
      showToast.success("Thanks for your review!");
      setReviewTargetBookingId(null);
    } else {
      showToast.error((result.payload as string) || "Failed to submit review");
    }
  };

  const loading = tripsLoading || reviewsLoading;

  return (
    <div className={PAGE}>
      <div>
        <h1 className={PAGE_TITLE}>Reviews</h1>
        <p className={PAGE_SUBTITLE}>
          Share your experience once a trip is complete.
        </p>
      </div>

      <SectionCard
        icon={Sparkles}
        title="Trips Awaiting Your Review"
        description={
          eligibleTrips.length > 0
            ? `${eligibleTrips.length} ${
                eligibleTrips.length === 1 ? "trip" : "trips"
              } to rate`
            : "You're all caught up"
        }
        contentClassName={loading && eligibleTrips.length === 0 ? CARD_PADDING : "p-0"}
      >
        {loading && eligibleTrips.length === 0 ? (
          <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            className="space-y-4"
          >
            <span className="sr-only">Loading trips awaiting a review…</span>
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        ) : eligibleTrips.length === 0 ? (
          <EmptyState
            icon={Star}
            title="Nothing to review"
            description="No completed trips are awaiting a review. Once a trip wraps up, you'll be able to rate your guide here."
          />
        ) : (
          <ul className="divide-y divide-gray-200">
            {eligibleTrips.map((trip) => {
              const id = bookingIdOf(trip.booking);
              const city =
                typeof trip.booking !== "string"
                  ? trip.booking.travel_details.city
                  : "Trip";

              return (
                <li
                  key={trip._id}
                  className={`flex flex-col gap-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between ${ROW_PADDING}`}
                >
                  <p className="min-w-0 truncate text-base font-semibold text-gray-900">
                    {city}
                  </p>
                  <Button
                    className="h-9 shrink-0 self-start rounded-lg px-4 sm:self-auto"
                    onClick={() => setReviewTargetBookingId(id)}
                  >
                    <Star aria-hidden="true" className="mr-1.5 h-4 w-4" />
                    Leave a Review
                    <span className="sr-only"> for {city}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        icon={Star}
        title="Your Reviews"
        description={
          myReviews.length > 0
            ? `${myReviews.length} ${
                myReviews.length === 1 ? "review" : "reviews"
              } submitted`
            : "Nothing submitted yet"
        }
        contentClassName={myReviews.length === 0 ? "p-0" : CARD_PADDING}
      >
        {myReviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No reviews yet"
            description="Once you rate a completed trip, your reviews will appear here for other travellers to see."
          />
        ) : (
          <div className="space-y-6">
            {myReviews.map((review) => (
              <ReviewCard key={review._id} review={review} showGuide />
            ))}
          </div>
        )}
      </SectionCard>

      <ReviewFormModal
        isOpen={!!reviewTargetBookingId}
        onClose={() => setReviewTargetBookingId(null)}
        onSubmit={handleSubmit}
        isLoading={submitting}
      />
    </div>
  );
}
