"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchMineAsGuide } from "@/lib/redux/thunks/review/reviewThunks";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingSummaryBadge } from "@/components/review/RatingSummaryBadge";
import { ReviewCard } from "@/components/review/ReviewCard";

export default function GuideReviewsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { guideReviews, guideRatingSummary, loading } = useSelector(
    (state: RootState) => state.reviews,
  );

  useEffect(() => {
    dispatch(fetchMineAsGuide({ page: 1, limit: 50 }));
  }, [dispatch]);

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Reviews</h2>
          <p className="text-muted-foreground">Feedback from travelers you&apos;ve guided.</p>
        </div>
        <RatingSummaryBadge average={guideRatingSummary.average} total={guideRatingSummary.total} />
      </div>

      {loading && guideReviews.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : guideReviews.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No reviews yet — they&apos;ll show up here after your trips are completed.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {guideReviews.map((review) => (
            <ReviewCard key={review._id} review={review} showTourist />
          ))}
        </div>
      )}
    </div>
  );
}
