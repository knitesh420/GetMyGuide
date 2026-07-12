"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchBookingsTrend, fetchReportOverview } from "@/lib/redux/thunks/report/reportThunks";
import { StatTile } from "@/components/reports/StatTile";
import { BookingsTrendChart } from "@/components/reports/BookingsTrendChart";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Banknote,
  CalendarCheck2,
  ClipboardList,
  IndianRupee,
  RefreshCcw,
  ShieldCheck,
  Star,
  Users,
  XCircle,
} from "lucide-react";

export default function AdminOverviewPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { overview, bookingsTrend, loading } = useSelector((state: RootState) => state.reports);

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchReportOverview());
    dispatch(fetchBookingsTrend("30d"));
  }, [dispatch, isAuthenticated]);

  if (authLoading || !isAuthenticated) return null;
  if (user && user.role !== "admin") return null;

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Travel Operations Dashboard</h2>
          <p className="text-muted-foreground">
            An overview of bookings, guides, trips, and revenue.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/dashboard/admin/reports" className="text-primary hover:underline">
            Full Reports
          </Link>
          <Link href="/dashboard/admin/activity-log" className="text-primary hover:underline">
            Activity Log
          </Link>
        </div>
      </div>

      {loading && !overview ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : overview ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Total Bookings" value={overview.totalBookings} icon={ClipboardList} />
          <StatTile
            label="Total Revenue"
            value={`₹${overview.totalRevenue.toLocaleString()}`}
            icon={IndianRupee}
          />
          <StatTile label="Active Guides" value={overview.activeGuides} icon={ShieldCheck} />
          <StatTile label="Active Tourists" value={overview.activeTourists} icon={Users} />
          <StatTile
            label="Pending Assignments"
            value={overview.pendingAssignments}
            icon={CalendarCheck2}
          />
          <StatTile label="Completed Trips" value={overview.completedTrips} icon={Banknote} />
          <StatTile label="Cancelled Trips" value={overview.cancelledTrips} icon={XCircle} />
          <StatTile
            label="Membership Renewals (30d)"
            value={overview.membershipRenewals}
            icon={RefreshCcw}
          />
        </div>
      ) : null}

      {overview && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          Average guide rating:{" "}
          <span className="font-semibold text-foreground">{overview.avgRating.toFixed(1)}</span>{" "}
          across {overview.totalReviews} reviews
        </div>
      )}

      <BookingsTrendChart data={bookingsTrend} />
    </div>
  );
}
