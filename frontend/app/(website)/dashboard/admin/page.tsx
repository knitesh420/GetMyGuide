"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchBookingsTrend, fetchReportOverview } from "@/lib/redux/thunks/report/reportThunks";
import { StatTile } from "@/components/reports/StatTile";
import { BookingsTrendChart } from "@/components/reports/BookingsTrendChart";
import { SkeletonStatRow } from "@/components/animations/Skeletons";
import CountUp from "@/components/animations/CountUp";
import { EASE_OUT } from "@/lib/motion";
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
        <SkeletonStatRow count={8} />
      ) : overview ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Bookings", value: overview.totalBookings, icon: ClipboardList },
            { label: "Total Revenue", value: overview.totalRevenue, icon: IndianRupee, prefix: "₹" },
            { label: "Active Guides", value: overview.activeGuides, icon: ShieldCheck },
            { label: "Active Tourists", value: overview.activeTourists, icon: Users },
            { label: "Pending Assignments", value: overview.pendingAssignments, icon: CalendarCheck2 },
            { label: "Completed Trips", value: overview.completedTrips, icon: Banknote },
            { label: "Cancelled Trips", value: overview.cancelledTrips, icon: XCircle },
            { label: "Membership Renewals (30d)", value: overview.membershipRenewals, icon: RefreshCcw },
          ].map((tile, i) => (
            <StatTile key={tile.label} index={i} {...tile} />
          ))}
        </div>
      ) : null}

      {overview && (
        <motion.div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5, ease: EASE_OUT }}
        >
          <motion.span
            initial={{ scale: 0, rotate: -60 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.6 }}
          >
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          </motion.span>
          Average guide rating:{" "}
          <span className="font-semibold text-foreground">
            <CountUp to={overview.avgRating} decimals={1} />
          </span>{" "}
          across <CountUp to={overview.totalReviews} /> reviews
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        <BookingsTrendChart data={bookingsTrend} />
      </motion.div>
    </div>
  );
}
