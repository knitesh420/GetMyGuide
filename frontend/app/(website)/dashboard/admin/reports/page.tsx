"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchBookingsTrend, fetchGuidePerformance } from "@/lib/redux/thunks/report/reportThunks";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminPanel,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
  EmptyState,
  PageHeader,
} from "@/components/admin/ui";
import { SkeletonTable } from "@/components/animations/Skeletons";
import { BookingsTrendChart } from "@/components/reports/BookingsTrendChart";
import { RatingSummaryBadge } from "@/components/review/RatingSummaryBadge";
import { useAuth } from "@/lib/hooks/useAuth";

const RANGES: Array<"7d" | "30d" | "90d"> = ["7d", "30d", "90d"];

export default function AdminReportsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { bookingsTrend, guidePerformance, loading } = useSelector(
    (state: RootState) => state.reports,
  );
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchGuidePerformance(10));
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchBookingsTrend(range));
  }, [dispatch, isAuthenticated, range]);

  if (authLoading || !isAuthenticated) return null;
  if (user && user.role !== "admin") return null;

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Reports & Analytics"
        description="Trends and top-performing guides."
      >
        {RANGES.map((r) => (
          <Button
            key={r}
            size="sm"
            variant={r === range ? "default" : "outline"}
            onClick={() => setRange(r)}
          >
            {r}
          </Button>
        ))}
      </PageHeader>

      <BookingsTrendChart data={bookingsTrend} />

      {loading && guidePerformance.length === 0 ? (
        <SkeletonTable rows={6} columns={4} />
      ) : (
        <AdminPanel>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Top Guides</h2>
          </div>
          {guidePerformance.length === 0 ? (
            <EmptyState
              bare
              icon={Users}
              title="No guide activity yet"
              description="Top guides by assignments, completed trips, and rating will appear here."
            />
          ) : (
            <AdminTable>
              <AdminTableHead
                columns={["Guide", "Assignments", "Trips Completed", "Rating"]}
              />
              <tbody>
                {guidePerformance.map((row, i) => (
                  <AdminTableRow key={row.guideId} index={i}>
                    <AdminTableCell className="font-semibold text-slate-900">
                      {row.name}
                    </AdminTableCell>
                    <AdminTableCell>{row.assignmentsCount}</AdminTableCell>
                    <AdminTableCell>{row.tripsCompleted}</AdminTableCell>
                    <AdminTableCell last>
                      <RatingSummaryBadge average={row.avgRating} total={row.totalReviews} />
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminTable>
          )}
        </AdminPanel>
      )}
    </div>
  );
}
