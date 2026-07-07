"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchActivityLog } from "@/lib/redux/thunks/report/reportThunks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityLogTable } from "@/components/admin/ActivityLogTable";
import { useAuth } from "@/lib/hooks/useAuth";

export default function AdminActivityLogPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { activityLog, loading } = useSelector((state: RootState) => state.reports);

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "admin" && user.role !== "manager") {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchActivityLog({ page: 1, limit: 50 }));
  }, [dispatch, isAuthenticated]);

  if (authLoading || !isAuthenticated) return null;
  if (user && user.role !== "admin" && user.role !== "manager") return null;

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Activity Log</h2>
        <p className="text-muted-foreground">
          A full audit trail across assignments, trips, and reviews.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && activityLog.length === 0 ? (
            <Skeleton className="h-40" />
          ) : (
            <ActivityLogTable entries={activityLog} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
