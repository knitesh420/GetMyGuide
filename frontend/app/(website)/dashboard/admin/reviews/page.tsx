"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import { deleteReview, fetchAllReviewsForAdmin, toggleHideReview } from "@/lib/redux/thunks/review/reviewThunks";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { SkeletonList } from "@/components/animations/Skeletons";
import { ReviewCard } from "@/components/review/ReviewCard";
import { showToast } from "@/lib/utils/toastHelper";
import { useAuth } from "@/lib/hooks/useAuth";

export default function AdminReviewsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { adminReviews, loading } = useSelector((state: RootState) => state.reviews);

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchAllReviewsForAdmin({ page: 1, limit: 50 }));
  }, [dispatch, isAuthenticated]);

  if (authLoading || !isAuthenticated) return null;
  if (user && user.role !== "admin") return null;

  const handleToggleHide = async (id: string, isHidden: boolean) => {
    const result = await dispatch(toggleHideReview({ id, isHidden: !isHidden }));
    if (toggleHideReview.fulfilled.match(result)) {
      showToast.success(!isHidden ? "Review hidden" : "Review unhidden");
    } else {
      showToast.error((result.payload as string) || "Failed to update review");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await dispatch(deleteReview(id));
    if (deleteReview.fulfilled.match(result)) {
      showToast.success("Review deleted");
    } else {
      showToast.error((result.payload as string) || "Failed to delete review");
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Review Moderation"
        description="Hide or remove inappropriate reviews."
      />

      {loading && adminReviews.length === 0 ? (
        <SkeletonList rows={4} />
      ) : adminReviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="Reviews left by tourists after their trips will appear here for moderation."
        />
      ) : (
        <div className="space-y-4">
          {adminReviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              showTourist
              showGuide
              actions={
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleHide(review._id, review.isHidden)}
                  >
                    {review.isHidden ? "Unhide" : "Hide"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(review._id)}>
                    Delete
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
