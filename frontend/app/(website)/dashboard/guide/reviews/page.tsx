"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchMineAsGuide } from "@/lib/redux/thunks/review/reviewThunks";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewCard } from "@/components/review/ReviewCard";
import { MessageSquare, Star } from "lucide-react";
import {
  GuideEmptyState,
  GuidePageHeader,
  GuidePanel,
  GuideStat,
  GuideToolbar,
} from "@/components/guide";

export default function GuideReviewsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { guideReviews, guideRatingSummary, loading } = useSelector(
    (state: RootState) => state.reviews,
  );

  useEffect(() => {
    dispatch(fetchMineAsGuide({ page: 1, limit: 50 }));
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <GuidePageHeader
        title="My Reviews"
        description="Feedback from travellers you've guided."
      />

      <GuidePanel>
        <GuideToolbar
          stats={
            <>
              <GuideStat
                icon={MessageSquare}
                label="Total Reviews"
                value={guideRatingSummary.total}
              />
              <GuideStat
                icon={Star}
                label="Average Rating"
                value={
                  guideRatingSummary.total > 0
                    ? `${guideRatingSummary.average.toFixed(1)} / 5`
                    : "—"
                }
                accent
              />
            </>
          }
        >
          <h2 className="text-sm font-semibold text-slate-900">All feedback</h2>
        </GuideToolbar>

        {loading && guideReviews.length === 0 ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : guideReviews.length === 0 ? (
          <GuideEmptyState
            icon={Star}
            title="No reviews yet"
            description="They'll show up here after your trips are completed."
          />
        ) : (
          <div className="space-y-3 p-5">
            {guideReviews.map((review) => (
              <ReviewCard key={review._id} review={review} showTourist />
            ))}
          </div>
        )}
      </GuidePanel>
    </div>
  );
}
