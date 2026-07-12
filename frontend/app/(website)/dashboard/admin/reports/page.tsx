"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchBookingsTrend, fetchGuidePerformance } from "@/lib/redux/thunks/report/reportThunks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="flex-1 space-y-8 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground">Trends and top-performing guides.</p>
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>

      <BookingsTrendChart data={bookingsTrend} />

      <Card>
        <CardHeader>
          <CardTitle>Top Guides</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && guidePerformance.length === 0 ? (
            <Skeleton className="h-40" />
          ) : guidePerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No guide activity yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guide</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Trips Completed</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guidePerformance.map((row) => (
                  <TableRow key={row.guideId}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.assignmentsCount}</TableCell>
                    <TableCell>{row.tripsCompleted}</TableCell>
                    <TableCell>
                      <RatingSummaryBadge average={row.avgRating} total={row.totalReviews} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
