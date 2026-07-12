"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import { deleteReview, fetchAllReviewsForAdmin, toggleHideReview } from "@/lib/redux/thunks/review/reviewThunks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Review Moderation</h2>
        <p className="text-muted-foreground">Hide or remove inappropriate reviews.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && adminReviews.length === 0 ? (
            <Skeleton className="h-24" />
          ) : adminReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            adminReviews.map((review) => (
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
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
