"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchMyTripsAsTourist } from "@/lib/redux/thunks/trip/tripThunks";
import { createReview, fetchMyReviews } from "@/lib/redux/thunks/review/reviewThunks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewFormModal } from "@/components/review/ReviewFormModal";
import { ReviewCard } from "@/components/review/ReviewCard";
import { showToast } from "@/lib/utils/toastHelper";
import { PopulatedBookingSummary } from "@/lib/data";

function bookingIdOf(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return (value as PopulatedBookingSummary)._id;
}

export default function UserReviewsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { myTrips, loading: tripsLoading } = useSelector((state: RootState) => state.trips);
  const { myReviews, loading: reviewsLoading } = useSelector((state: RootState) => state.reviews);
  const [reviewTargetBookingId, setReviewTargetBookingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchMyTripsAsTourist({ page: 1, limit: 50 }));
    dispatch(fetchMyReviews({ page: 1, limit: 50 }));
  }, [dispatch]);

  const reviewedBookingIds = useMemo(() => new Set(myReviews.map((r) => r.booking)), [myReviews]);

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
    const result = await dispatch(createReview({ bookingId: reviewTargetBookingId, rating, comment }));
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
    <div className="flex-1 space-y-8 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reviews</h2>
        <p className="text-muted-foreground">Share your experience once a trip is complete.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trips Awaiting Your Review</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && eligibleTrips.length === 0 ? (
            <Skeleton className="h-20" />
          ) : eligibleTrips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed trips awaiting a review.</p>
          ) : (
            <div className="space-y-3">
              {eligibleTrips.map((trip) => {
                const id = bookingIdOf(trip.booking);
                const city = typeof trip.booking !== "string" ? trip.booking.travel_details.city : "Trip";
                return (
                  <div key={trip._id} className="flex items-center justify-between rounded-md border p-3">
                    <p className="font-medium">{city}</p>
                    <Button size="sm" onClick={() => setReviewTargetBookingId(id)}>
                      Leave a Review
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {myReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven&apos;t left any reviews yet.</p>
          ) : (
            myReviews.map((review) => <ReviewCard key={review._id} review={review} showGuide />)
          )}
        </CardContent>
      </Card>

      <ReviewFormModal
        isOpen={!!reviewTargetBookingId}
        onClose={() => setReviewTargetBookingId(null)}
        onSubmit={handleSubmit}
        isLoading={submitting}
      />
    </div>
  );
}
