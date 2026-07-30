"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchActivityLog } from "@/lib/redux/thunks/report/reportThunks";
import { AdminPanel, PageHeader } from "@/components/admin/ui";
import { SkeletonTable } from "@/components/animations/Skeletons";
import { ActivityLogTable } from "@/components/admin/ActivityLogTable";
import { useAuth } from "@/lib/hooks/useAuth";

export default function AdminActivityLogPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { activityLog, loading } = useSelector((state: RootState) => state.reports);

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchActivityLog({ page: 1, limit: 50 }));
  }, [dispatch, isAuthenticated]);

  if (authLoading || !isAuthenticated) return null;
  if (user && user.role !== "admin") return null;

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Activity Log"
        description="A full audit trail across assignments, trips, and reviews."
      />

      {loading && activityLog.length === 0 ? (
        <SkeletonTable rows={8} columns={4} />
      ) : (
        <AdminPanel>
          <ActivityLogTable entries={activityLog} />
        </AdminPanel>
      )}
    </div>
  );
}
