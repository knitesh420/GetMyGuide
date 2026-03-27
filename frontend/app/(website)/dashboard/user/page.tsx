"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchDashboardStats } from "@/lib/redux/thunks/dashboard/dashboardThunks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Package,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  MessageSquare,
  CalendarCheck,
  AlertCircle,
} from "lucide-react";

type StatCardProps = {
  icon: React.ElementType; // 'icon' ek React component hai, isliye 'ElementType'
  title: string;
  value: string | number; // Value number ya string ho sakti hai
  description?: string;   // 'description' optional ho sakta hai, isliye '?' lagayein
  colorClass?: string;    // 'colorClass' bhi optional hai
};


// Ek reusable card component stats dikhane ke liye
const StatCard = ({ icon: Icon, title, value, description, colorClass }:StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-5 w-5 ${colorClass || "text-muted-foreground"}`} />
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

// Loading state ke liye skeleton component
const DashboardSkeleton = () => (
  <div className="space-y-8">
    <div>
      <Skeleton className="h-8 w-1/4 mb-4" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
    <div>
      <Skeleton className="h-8 w-1/4 mb-4" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  </div>
);


export default function UserDashboardPage() {
  const dispatch = useAppDispatch();
  const { stats, loading, error } = useAppSelector((state) => state.dashboard);
  const { user } = useAppSelector((state) => state.auth); // User ka naam lene ke liye

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Could not load your dashboard stats. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Agar stats null hain ya data nahi hai
  if (!stats) {
    return <div className="p-8">No statistics available.</div>;
  }

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.name || "User"}!
          </h2>
          <p className="text-muted-foreground">
            Here's a quick overview of your activities.
          </p>
        </div>
      </div>

      {/* Package Bookings Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">My Package Bookings</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Bookings"
            value={stats.packageBookings?.total || 0}
            description="All package tours you've booked."
            icon={Package}
            colorClass="text-blue-500"
          />
          <StatCard
            title="Completed Tours"
            value={stats.packageBookings?.completed || 0}
            description="Tours you have successfully completed."
            icon={CheckCircle}
            colorClass="text-green-500"
          />
          <StatCard
            title="Upcoming Tours"
            value={stats.packageBookings?.upcoming || 0}
            description="Your future adventures."
            icon={Clock}
            colorClass="text-orange-500"
          />
          <StatCard
            title="Payment Due"
            value={stats.packageBookings?.remainingPayment || 0}
            description="Bookings with remaining payment."
            icon={CreditCard}
            colorClass="text-red-500"
          />
        </div>
      </div>

      {/* Custom Tour Requests Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">My Custom Tour Requests</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Requests"
            value={stats.customTourRequests?.total || 0}
            description="All inquiries you have submitted."
            icon={FileText}
            colorClass="text-purple-500"
          />
          <StatCard
            title="Quotes Received"
            value={stats.customTourRequests?.quoted || 0}
            description="Requests for which you have a quote."
            icon={MessageSquare}
            colorClass="text-cyan-500"
          />
          <StatCard
            title="Booked Tours"
            value={stats.customTourRequests?.booked || 0}
            description="Custom requests that are now booked."
            icon={CalendarCheck}
            colorClass="text-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}